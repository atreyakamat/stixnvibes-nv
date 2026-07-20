import type { NextApiRequest, NextApiResponse } from 'next';
import { admin } from '@/lib/supabase/admin';

/**
 * Admin CRUD for products.
 * GET    /api/admin/products                     -> list all
 * POST   /api/admin/products   {payload}
 * PUT    /api/admin/products?id=<id>  {payload}
 * DELETE /api/admin/products?id=<id>
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;

    switch (method) {
      case 'GET': {
        const data = await admin.listProducts();
        return res.status(200).json(data);
      }
      case 'POST': {
        const payload = req.body;
        const data = await admin.createProduct(payload);
        return res.status(201).json(data);
      }
      case 'PUT': {
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const payload = req.body;
        const data = await admin.updateProduct(id, payload);
        return res.status(200).json(data);
      }
      case 'DELETE': {
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const data = await admin.deleteProduct(id);
        return res.status(200).json({ deleted: data });
      }
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        return res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message ?? 'Server error' });
  }
}
