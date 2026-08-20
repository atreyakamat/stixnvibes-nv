import type { StatusType } from "@/components/admin/ui";

export function getOrderStatusConfig(status: string): { label: string; type: StatusType } {
  switch (status?.toLowerCase()) {
    case "created":
      return { label: "Created", type: "default" };
    case "sent":
      return { label: "Sent via WA", type: "info" };
    case "confirmed":
      return { label: "Confirmed", type: "info" };
    case "paid":
      return { label: "Paid", type: "success" };
    case "payment_failed":
      return { label: "Payment Failed", type: "error" };
    case "production":
      return { label: "Production", type: "warning" };
    case "printing":
      return { label: "Printing", type: "warning" };
    case "qc":
      return { label: "QC Pending", type: "warning" };
    case "qc_failed":
      return { label: "QC Failed / Rework", type: "error" };
    case "packing":
      return { label: "Ready to Pack", type: "info" };
    case "shipped":
      return { label: "Shipped", type: "info" };
    case "delivered":
      return { label: "Delivered", type: "success" };
    case "fulfilled":
      return { label: "Fulfilled", type: "success" };
    case "cancelled":
      return { label: "Cancelled", type: "error" };
    case "return_requested":
      return { label: "Return Requested", type: "warning" };
    case "returned":
      return { label: "Returned", type: "error" };
    case "refunded":
      return { label: "Refunded", type: "default" };
    default:
      return { label: status || "Unknown", type: "default" };
  }
}
