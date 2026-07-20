import type { NextApiRequest, NextApiResponse } from 'next';
import { admin } from '@/lib/supabase/admin';

/**
 * Admin CRUD for variants.
 * GET    /api/admin/variants                     -> list
 * POST   /api/admin/variants   {payload}
 * PUT    /api/admin/variants?id=<id>  {payload}
 * DELETE /api/admin/variants?id=<id>
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;
    switch (method) {
      case 'GET': {
        const data = await admin.listVariants();
        return res.status(200).json(data);
      }
      case 'POST': {
        const payload = req.body;
        const data = await admin.createVariant(payload);
        return res.status(201).json(data);
      }
      case 'PUT': {
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const payload = req.body;
        const data = await admin.updateVariant(id, payload);
        return res.status(200).json(data);
      }
      case 'DELETE': {
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const data = await admin.deleteVariant(id);
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
