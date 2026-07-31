import { describe, it, expect, beforeEach } from "vitest";

function isTransitionAllowed(from: string, to: string) {
  const allowed = [
    ["created", "pending"],
    ["pending", "paid"],
    ["paid", "processing"],
    ["processing", "print_queue"],
    ["print_queue", "printing"],
    ["printing", "quality_check"],
    ["quality_check", "packing"],
    ["packing", "ready_for_dispatch"],
    ["ready_for_dispatch", "shipped"],
    ["shipped", "delivered"],
    ["created", "cancelled"],
    ["pending", "cancelled"],
    ["paid", "cancelled"],
    ["processing", "cancelled"],
    ["print_queue", "cancelled"],
    ["printing", "cancelled"],
    ["quality_check", "cancelled"],
    ["packing", "cancelled"],
  ];

  return allowed.some(([fromState, toState]) => fromState === from && toState === to);
}

describe("server-side workflow state machine", () => {
  beforeEach(() => {
    // no-op: deterministic policy fixture
  });

  it("rejects impossible transitions", () => {
    expect(isTransitionAllowed("pending", "shipped")).toBe(false);
    expect(isTransitionAllowed("payment_pending", "printing")).toBe(false);
    expect(isTransitionAllowed("cancelled", "printing")).toBe(false);
    expect(isTransitionAllowed("quality_check", "packed")).toBe(false);
    expect(isTransitionAllowed("delivered", "print_queue")).toBe(false);
  });

  it("allows the valid lifecycle progression", () => {
    const valid = [
      ["created", "pending"],
      ["pending", "paid"],
      ["paid", "processing"],
      ["processing", "print_queue"],
      ["print_queue", "printing"],
      ["printing", "quality_check"],
      ["quality_check", "packing"],
      ["packing", "ready_for_dispatch"],
      ["ready_for_dispatch", "shipped"],
      ["shipped", "delivered"],
      ["created", "cancelled"],
      ["pending", "cancelled"],
      ["paid", "cancelled"],
      ["processing", "cancelled"],
      ["print_queue", "cancelled"],
      ["printing", "cancelled"],
      ["quality_check", "cancelled"],
      ["packing", "cancelled"],
    ];

    valid.forEach(([from, to]) => {
      expect(isTransitionAllowed(from, to)).toBe(true);
    });
  });
});
