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
} from "@/lib/state-machine/order-state-machine";

describe("Order State Machine", () => {
  describe("canTransition", () => {
    it("should allow valid forward transitions", () => {
      expect(canTransition(OrderStatus.CREATED, OrderStatus.CONFIRMED)).toBe(true);
      expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.PAID)).toBe(true);
      expect(canTransition(OrderStatus.PAID, OrderStatus.PRODUCTION)).toBe(true);
      expect(canTransition(OrderStatus.PRODUCTION, OrderStatus.PRINTING)).toBe(true);
      expect(canTransition(OrderStatus.PRINTING, OrderStatus.QC)).toBe(true);
      expect(canTransition(OrderStatus.QC, OrderStatus.PACKING)).toBe(true);
      expect(canTransition(OrderStatus.PACKING, OrderStatus.SHIPPED)).toBe(true);
      expect(canTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true);
    });

    it("should reject invalid state skips", () => {
      expect(canTransition(OrderStatus.CREATED, OrderStatus.PAID)).toBe(false);
      expect(canTransition(OrderStatus.CREATED, OrderStatus.DELIVERED)).toBe(false);
      expect(canTransition(OrderStatus.CREATED, OrderStatus.SHIPPED)).toBe(false);
      expect(canTransition(OrderStatus.PAID, OrderStatus.SHIPPED)).toBe(false);
      expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.PRODUCTION)).toBe(false);
    });

    it("should allow cancellation from pre-ship states", () => {
      expect(canTransition(OrderStatus.CREATED, OrderStatus.CANCELLED)).toBe(true);
      expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
      expect(canTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true);
      expect(canTransition(OrderStatus.PRODUCTION, OrderStatus.CANCELLED)).toBe(true);
    });

    it("should NOT allow cancellation from post-ship states", () => {
      expect(canTransition(OrderStatus.SHIPPED, OrderStatus.CANCELLED)).toBe(false);
      expect(canTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED)).toBe(false);
    });

    it("should handle QC failure and rework path", () => {
      expect(canTransition(OrderStatus.QC, OrderStatus.QC_FAILED)).toBe(true);
      expect(canTransition(OrderStatus.QC_FAILED, OrderStatus.PRODUCTION)).toBe(true);
    });

    it("should handle return flow", () => {
      expect(canTransition(OrderStatus.DELIVERED, OrderStatus.RETURN_REQUESTED)).toBe(true);
      expect(canTransition(OrderStatus.SHIPPED, OrderStatus.RETURN_REQUESTED)).toBe(true);
      expect(canTransition(OrderStatus.RETURN_REQUESTED, OrderStatus.RETURNED)).toBe(true);
      expect(canTransition(OrderStatus.RETURNED, OrderStatus.REFUNDED)).toBe(true);
    });

    it("should handle payment failure path", () => {
      expect(canTransition(OrderStatus.CONFIRMED, OrderStatus.PAYMENT_FAILED)).toBe(true);
      expect(canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CONFIRMED)).toBe(true);
      expect(canTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED)).toBe(true);
    });

    it("should reject transitions from terminal states", () => {
      expect(canTransition(OrderStatus.REFUNDED, OrderStatus.CREATED)).toBe(false);
      expect(canTransition(OrderStatus.REFUNDED, OrderStatus.PAID)).toBe(false);
    });

    it("should accept raw lowercase string values", () => {
      expect(canTransition("created" as OrderStatus, "confirmed" as OrderStatus)).toBe(true);
      expect(canTransition("confirmed" as OrderStatus, "paid" as OrderStatus)).toBe(true);
    });
  });

  describe("getNextStates", () => {
    it("should return valid next states for CREATED", () => {
      const next = getNextStates(OrderStatus.CREATED);
      expect(next).toContain(OrderStatus.CONFIRMED);
      expect(next).toContain(OrderStatus.CANCELLED);
      expect(next).not.toContain(OrderStatus.PAID);
    });

    it("should return empty array for terminal states", () => {
      expect(getNextStates(OrderStatus.REFUNDED)).toEqual([]);
    });
  });

  describe("isTerminal", () => {
    it("should identify terminal states", () => {
      expect(isTerminal(OrderStatus.REFUNDED)).toBe(true);
    });

    it("should identify non-terminal states", () => {
      expect(isTerminal(OrderStatus.CREATED)).toBe(false);
      expect(isTerminal(OrderStatus.PAID)).toBe(false);
      expect(isTerminal(OrderStatus.DELIVERED)).toBe(false);
      expect(isTerminal(OrderStatus.CANCELLED)).toBe(false); // can still be refunded
    });
  });

  describe("isCancellable", () => {
    it("should return true for cancellable states", () => {
      expect(isCancellable(OrderStatus.CREATED)).toBe(true);
      expect(isCancellable(OrderStatus.CONFIRMED)).toBe(true);
      expect(isCancellable(OrderStatus.PAID)).toBe(true);
      expect(isCancellable(OrderStatus.PRODUCTION)).toBe(true);
    });

    it("should return false for non-cancellable states", () => {
      expect(isCancellable(OrderStatus.SHIPPED)).toBe(false);
      expect(isCancellable(OrderStatus.DELIVERED)).toBe(false);
      expect(isCancellable(OrderStatus.REFUNDED)).toBe(false);
    });
  });

  describe("requiresInventoryRelease", () => {
    it("should require release when cancelling confirmed/paid/production orders", () => {
      expect(requiresInventoryRelease(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
      expect(requiresInventoryRelease(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true);
      expect(requiresInventoryRelease(OrderStatus.PRODUCTION, OrderStatus.CANCELLED)).toBe(true);
      expect(requiresInventoryRelease(OrderStatus.PRINTING, OrderStatus.CANCELLED)).toBe(true);
    });

    it("should not require release for non-cancellation transitions", () => {
      expect(requiresInventoryRelease(OrderStatus.CREATED, OrderStatus.CONFIRMED)).toBe(false);
      expect(requiresInventoryRelease(OrderStatus.PAID, OrderStatus.PRODUCTION)).toBe(false);
    });
  });

  describe("validateStateTransition", () => {
    it("should not throw for valid transitions", () => {
      expect(() => validateStateTransition("created", "confirmed")).not.toThrow();
    });

    it("should throw InvalidStateTransitionError for invalid transitions", () => {
      expect(() => validateStateTransition("created", "delivered")).toThrow(
        InvalidStateTransitionError
      );
    });
  });

  describe("complete happy path", () => {
    it("should allow the full order lifecycle", () => {
      const happyPath: OrderStatus[] = [
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
        expect(
          canTransition(happyPath[i], happyPath[i + 1]),
          `Expected ${happyPath[i]} → ${happyPath[i + 1]} to be valid`
        ).toBe(true);
      }
    });
  });
});
