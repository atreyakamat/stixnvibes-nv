import type { StatusType } from "@/components/admin/ui";

export function getOrderStatusConfig(status: string): { label: string, type: StatusType } {
  switch (status?.toLowerCase()) {
    case "created": return { label: "Created", type: "default" };
    case "sent": return { label: "Sent", type: "info" };
    case "confirmed": return { label: "Confirmed", type: "info" };
    case "paid": return { label: "Paid", type: "success" };
    case "artwork_review": return { label: "Artwork Review", type: "warning" };
    case "approved": return { label: "Approved", type: "success" };
    case "rejected": return { label: "Rejected", type: "error" };
    case "production": return { label: "Production", type: "warning" };
    case "print_queue": return { label: "Print Queue", type: "warning" };
    case "printing": return { label: "Printing", type: "warning" };
    case "quality_check": return { label: "Quality Check", type: "warning" };
    case "packing": return { label: "Packing", type: "info" };
    case "ready_for_dispatch": return { label: "Ready to Dispatch", type: "info" };
    case "dispatched": return { label: "Dispatched", type: "info" };
    case "shipped": return { label: "Shipped", type: "info" };
    case "delivered": return { label: "Delivered", type: "success" };
    case "cancelled": return { label: "Cancelled", type: "error" };
    case "returned": return { label: "Returned", type: "error" };
    case "refunded": return { label: "Refunded", type: "default" };
    default: return { label: status || "Unknown", type: "default" };
  }
}
