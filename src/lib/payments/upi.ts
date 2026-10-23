// UPI pay-by-link. A `upi://pay` deep link opens any UPI app (GPay, PhonePe,
// Paytm, BHIM) with the payee, exact amount and order number filled in. On
// desktop the same link is shown as a QR code. Money goes straight to the
// shop's UPI ID; staff confirm it against the bank app in admin.

export type UpiParams = {
  vpa: string;
  payee: string;
  amountPaise: number;
  orderNumber: string;
};

const VPA = /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA.test(vpa.trim());
}

export function buildUpiLink({ vpa, payee, amountPaise, orderNumber }: UpiParams): string {
  if (!isValidVpa(vpa)) throw new Error("Invalid UPI ID");
  if (!Number.isInteger(amountPaise) || amountPaise <= 0) throw new Error("Invalid amount");
  const params = new URLSearchParams({
    pa: vpa.trim(),
    pn: payee.trim().slice(0, 50),
    am: (amountPaise / 100).toFixed(2),
    cu: "INR",
    tn: `Stix N Vibes ${orderNumber}`,
    tr: orderNumber,
  });
  // UPI apps expect %20 for spaces, not "+".
  return `upi://pay?${params.toString().replace(/\+/g, "%20")}`;
}

/**
 * UTR / UPI reference: banks print a 12 digit number for UPI transfers.
 * Accept 12 to 22 alphanumerics to allow for the odd bank that differs.
 */
export function normaliseUtr(input: string): string | null {
  const clean = input.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z0-9]{12,22}$/.test(clean) ? clean : null;
}
