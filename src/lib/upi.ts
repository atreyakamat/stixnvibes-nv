/** UPI IDs look like name@bank. */
export const UPI_ID_RE = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z][a-zA-Z0-9]{1,63}$/;

/**
 * A upi://pay link that opens any UPI app with the payee filled in. With an
 * amount the app fixes it; without one the customer types it (used while
 * the delivery charge is still to be agreed).
 */
export function upiLink(o: { upiId: string; name: string; amountPaise?: number | null; note: string }) {
  const p = new URLSearchParams({ pa: o.upiId, pn: o.name, cu: "INR", tn: o.note.slice(0, 50) });
  if (o.amountPaise) p.set("am", (o.amountPaise / 100).toFixed(2));
  return `upi://pay?${p.toString().replace(/\+/g, "%20")}`;
}
