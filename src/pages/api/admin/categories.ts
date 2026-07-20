import type { NextApiRequest, NextApiResponse } from 'next';
import { admin } from '@/lib/supabase/admin';

/**
 * Admin CRUD for categories – protected by service‑role client.
 * Expected usage (via fetch from admin UI):
 *   GET    /api/admin/categories                      -> list
 *   POST   /api/admin/categories  {name, slug, parent_id?}
 *   PUT    /api/admin/categories?id=<id>  {name?, slug?, parent_id?}
 *   DELETE /api/admin/categories?id=<id>
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req;
    const id = typeof req.query.id === 'string' ? req.query.id : undefined;

    switch (method) {
      case 'GET': {
        const data = await admin.listCategories();
        return res.status(200).json(data);
      }
      case 'POST': {
        const payload = req.body;
        const data = await admin.createCategory(payload);
        return res.status(201).json(data);
      }
      case 'PUT': {
        if (!id) return res.status(400).json({ error: 'Missing id query param' });
        const payload = req.body;
        const data = await admin.updateCategory(id, payload);
        return res.status(200).json(data);
      }
      case 'DELETE': {
        if (!id) return res.status(400).json({ error: 'Missing id query param' });
        const data = await admin.deleteCategory(id);
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
