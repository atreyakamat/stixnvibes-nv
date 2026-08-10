export interface OrderItemRecord {
  name: string;
  quantity: number;
  price_cents: number;
  metadata?: any;
}

export interface OrderRecord {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  address?: string;
  pincode?: string;
  total_cents: number;
  status: string;
  notes?: string | null;
  whatsapp_url?: string | null;
  created_at: string;
  order_items?: OrderItemRecord[];
  metadata?: any;
}
