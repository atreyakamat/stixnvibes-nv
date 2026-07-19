import type { NextApiRequest, NextApiResponse } from 'next';
import { createService } from '@/lib/supabase/client';
import { verifyPaymentSignature } from '@/lib/payment/razorpay';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const body = Buffer.concat(chunks).toString('utf8');

  const signature = req.headers['x-razorpay-signature'] as string;
  if (!signature) return res.status(400).json({ error: 'Missing signature' });

  const data = JSON.parse(body);
  const isValid = verifyPaymentSignature({
    orderId: data.payload.payment.entity.order_id,
    paymentId: data.payload.payment.entity.id,
    signature,
  });
  if (!isValid) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Update order status in Supabase
  const supabase = createService();
  if (!supabase) return res.status(500).json({ error: 'Supabase not configured' });

  const orderId = data.payload.payment.entity.order_id;
  const { error } = await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('razorpay_order_id', orderId);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: 'Failed to update order' });
  }

  res.status(200).json({ received: true });
}
