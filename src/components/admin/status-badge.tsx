import type { OrderStatus } from "@/lib/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  confirmed: "Confirmed",
  paid: "Paid",
  shipped: "Shipped",
  done: "Done",
  cancelled: "Cancelled",
};

const tone: Record<OrderStatus, string> = {
  new: "bg-[#ffb020] text-ink",
  confirmed: "bg-[#7cc4ff] text-ink",
  paid: "bg-lemon text-ink",
  shipped: "bg-[#7cc4ff]/30 text-paper",
  done: "bg-paper/5 text-mute",
  cancelled: "bg-[#ff7a59]/20 text-[#ffb59f]",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${tone[status]}`}>{STATUS_LABEL[status]}</span>;
}
