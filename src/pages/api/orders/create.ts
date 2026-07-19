import type { NextApiRequest, NextApiResponse } from 'next';
import { createService } from '@/lib/supabase/client';
import { createRazorpayOrder } from '@/lib/payment/razorpay';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { items, customer } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart items required' });
  }

  // Calculate total amount in rupees
  const totalRupees = items.reduce((sum: number, i: any) => sum + i.price_cents * i.quantity, 0) / 100;

  try {
    const razorpayOrder = await createRazorpayOrder({
      amountInRupees: totalRupees,
      receipt: `order-${Date.now()}`,
    });
    // Store order in Supabase (service client)
    const supabase = createService();
    if (!supabase) throw new Error('Supabase not configured');
    const { data: orderData, error } = await supabase.from('orders').insert({
      user_id: customer?.id ?? null,
      total_cents: totalRupees * 100,
      status: 'created',
      razorpay_order_id: razorpayOrder.id,
    }).single();
    if (error) throw error;
    // TODO: store order items as well
    res.status(200).json({ orderId: orderData.id, razorpayOrderId: razorpayOrder.id, amount: razorpayOrder.amount });
  } catch (e: any) {
    console.error(e);
    res.status(500).json({ error: e.message ?? 'Internal server error' });
  }
}
