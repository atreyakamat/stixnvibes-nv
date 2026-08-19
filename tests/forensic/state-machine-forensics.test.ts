import { describe, it, expect } from "vitest";
import {
  OrderStatus,
  canTransition,
  getNextStates,
  isTerminal,
  isCancellable,
  requiresInventoryRelease,
  validateStateTransition,
  InvalidStateTransitionError,
  VALID_TRANSITIONS,
} from "@/lib/state-machine/order-state-machine";

describe("Gate 1: State Machine Forensics & Complete Invariant Suite", () => {
  describe("1.1 Single Canonical Authority & Enum Values", () => {
    it("should define all canonical states in lowercase matching the database enum", () => {
      expect(OrderStatus.CREATED).toBe("created");
      expect(OrderStatus.SENT).toBe("sent");
      expect(OrderStatus.CONFIRMED).toBe("confirmed");
      expect(OrderStatus.PAID).toBe("paid");
      expect(OrderStatus.PRODUCTION).toBe("production");
      expect(OrderStatus.PRINTING).toBe("printing");
      expect(OrderStatus.QC).toBe("qc");
      expect(OrderStatus.QC_FAILED).toBe("qc_failed");
      expect(OrderStatus.PACKING).toBe("packing");
      expect(OrderStatus.SHIPPED).toBe("shipped");
      expect(OrderStatus.DELIVERED).toBe("delivered");
      expect(OrderStatus.PAYMENT_FAILED).toBe("payment_failed");
      expect(OrderStatus.CANCELLED).toBe("cancelled");
      expect(OrderStatus.RETURN_REQUESTED).toBe("return_requested");
      expect(OrderStatus.RETURNED).toBe("returned");
      expect(OrderStatus.REFUNDED).toBe("refunded");
      expect(OrderStatus.FULFILLED).toBe("fulfilled");
    });
  });

  describe("1.2 Valid Forward Happy Path Life Cycle", () => {
    it("should strictly permit the complete standard production lifecycle", () => {
      const happyPath = [
        OrderStatus.CREATED,
        OrderStatus.SENT,
        OrderStatus.CONFIRMED,
        OrderStatus.PAID,
        OrderStatus.PRODUCTION,
        OrderStatus.PRINTING,
        OrderStatus.QC,
        OrderStatus.PACKING,
        OrderStatus.SHIPPED,
        OrderStatus.DELIVERED,
      ];

      for (let i = 0; i < happyPath.length - 1; i++) {
        const from = happyPath[i];
        const to = happyPath[i + 1];
        expect(canTransition(from, to), `Expected ${from} -> ${to} to be valid`).toBe(true);
        expect(() => validateStateTransition(from, to)).not.toThrow();
      }
    });

    it("should allow direct CREATED -> CONFIRMED for online payment checkouts", () => {
      expect(canTransition(OrderStatus.CREATED, OrderStatus.CONFIRMED)).toBe(true);
    });
  });

  describe("1.3 Invalid State Skips & Prohibitions", () => {
    it("should reject illegal state jumps", () => {
      // Cannot jump from CREATED directly to PAID, SHIPPED, or DELIVERED
      expect(canTransition(OrderStatus.CREATED, OrderStatus.PAID)).toBe(false);
      expect(canTransition(OrderStatus.CREATED, OrderStatus.SHIPPED)).toBe(false);
      expect(canTransition(OrderStatus.CREATED, OrderStatus.DELIVERED)).toBe(false);

      // Cannot jump from PAID directly to SHIPPED
      expect(canTransition(OrderStatus.PAID, OrderStatus.SHIPPED)).toBe(false);

      // Cannot jump backwards from DELIVERED to CREATED
      expect(canTransition(OrderStatus.DELIVERED, OrderStatus.CREATED)).toBe(false);
      expect(canTransition(OrderStatus.SHIPPED, OrderStatus.PRODUCTION)).toBe(false);

      expect(() => validateStateTransition(OrderStatus.CREATED, OrderStatus.DELIVERED)).toThrow(
        InvalidStateTransitionError
      );
    });
  });

  describe("1.4 Cancellation Invariants & Boundaries", () => {
    it("should allow cancellation only before shipping", () => {
      expect(isCancellable(OrderStatus.CREATED)).toBe(true);
      expect(isCancellable(OrderStatus.SENT)).toBe(true);
      expect(isCancellable(OrderStatus.CONFIRMED)).toBe(true);
      expect(isCancellable(OrderStatus.PAID)).toBe(true);
      expect(isCancellable(OrderStatus.PRODUCTION)).toBe(true);
      expect(isCancellable(OrderStatus.PAYMENT_FAILED)).toBe(true);

      // Post-production / In-flight cannot be cancelled directly
      expect(isCancellable(OrderStatus.PRINTING)).toBe(false);
      expect(isCancellable(OrderStatus.QC)).toBe(false);
      expect(isCancellable(OrderStatus.PACKING)).toBe(false);
      expect(isCancellable(OrderStatus.SHIPPED)).toBe(false);
      expect(isCancellable(OrderStatus.DELIVERED)).toBe(false);
    });

    it("should correctly identify transitions requiring inventory release", () => {
      // Confirmed, Paid, Production hold reserved stock
      expect(requiresInventoryRelease(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
      expect(requiresInventoryRelease(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true);
      expect(requiresInventoryRelease(OrderStatus.PRODUCTION, OrderStatus.CANCELLED)).toBe(true);
      expect(requiresInventoryRelease(OrderStatus.PRINTING, OrderStatus.CANCELLED)).toBe(true);

      // Non-cancellation transitions never trigger cancellation inventory release
      expect(requiresInventoryRelease(OrderStatus.CREATED, OrderStatus.CONFIRMED)).toBe(false);
      expect(requiresInventoryRelease(OrderStatus.CONFIRMED, OrderStatus.PAID)).toBe(false);
      expect(requiresInventoryRelease(OrderStatus.PAID, OrderStatus.PRODUCTION)).toBe(false);
    });
  });

  describe("1.5 Quality Control Failure & Rework Flow", () => {
    it("should transition QC -> QC_FAILED and allow rework back to PRODUCTION", () => {
      expect(canTransition(OrderStatus.QC, OrderStatus.QC_FAILED)).toBe(true);
      expect(canTransition(OrderStatus.QC_FAILED, OrderStatus.PRODUCTION)).toBe(true);
      expect(canTransition(OrderStatus.QC_FAILED, OrderStatus.PACKING)).toBe(false);
    });
  });

  describe("1.6 Payment Failure & Recovery Flow", () => {
    it("should transition CONFIRMED -> PAYMENT_FAILED and allow retry to CONFIRMED or CANCELLED", () => {
      expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.PAYMENT_FAILED)).toBe(true);
      expect(canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CONFIRMED)).toBe(true);
      expect(canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED)).toBe(true);
      expect(canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.SHIPPED)).toBe(false);
    });
  });

  describe("1.7 Returns & Refunds Flow", () => {
    it("should follow DELIVERED -> RETURN_REQUESTED -> RETURNED -> REFUNDED", () => {
      expect(canTransition(OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED)).toBe(true);
      expect(canTransition(OrderStatus.SHIPPED, OrderStatus.RETURN_REQUESTED)).toBe(true);
      expect(canTransition(OrderStatus.RETURN_REQUESTED, OrderStatus.RETURNED)).toBe(true);
      expect(canTransition(OrderStatus.RETURNED, OrderStatus.REFUNDED)).toBe(true);
      expect(canTransition(OrderStatus.CANCELLED, OrderStatus.REFUNDED)).toBe(true);
    });

    it("should recognize terminal states", () => {
      expect(isTerminal(OrderStatus.REFUNDED)).toBe(true);
      expect(getNextStates(OrderStatus.REFUNDED)).toEqual([]);
      expect(isTerminal(OrderStatus.CREATED)).toBe(false);
      expect(isTerminal(OrderStatus.DELIVERED)).toBe(false); // Can transition to return_requested
    });
  });

  describe("1.8 Backward Compatibility & Case Normalization", () => {
    it("should normalize upper, lower, and mixed case strings", () => {
      expect(canTransition("CREATED", "CONFIRMED")).toBe(true);
      expect(canTransition("created", "confirmed")).toBe(true);
      expect(canTransition("Confirmed", "PAID")).toBe(true);
      expect(canTransition("PAID", "production")).toBe(true);
    });
  });
});
