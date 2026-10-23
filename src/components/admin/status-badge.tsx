import { STATUS_LABEL } from "@/lib/orders/status";
import type { OrderStatus } from "@/lib/types";

const tone: Record<OrderStatus, string> = {
  awaiting_payment: "bg-paper/10 text-paper",
  payment_review: "bg-[#ffb020] text-ink",
  placed: "bg-[#ffb020] text-ink",
  paid: "bg-lemon text-ink",
  packed: "bg-[#7cc4ff] text-ink",
  shipped: "bg-[#7cc4ff]/30 text-paper",
  ready_for_pickup: "bg-[#7cc4ff]/30 text-paper",
  delivered: "bg-paper/5 text-mute",
  collected: "bg-paper/5 text-mute",
  cancelled: "bg-[#ff7a59]/20 text-[#ffb59f]",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tone[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
