import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pixelIds, mode } = req.body;

    if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
      return res.status(400).json({ error: 'Invalid pixelIds' });
    }

    /* ───────────────────────────────
       1. CHECK AVAILABILITY
    ─────────────────────────────── */
    const { data: existing } = await supabase
      .from('pixels')
      .select('pixel_id, status')
      .in('pixel_id', pixelIds);

    if (existing && existing.some(p => p.status && p.status !== 'free')) {
      return res.status(409).json({ error: 'Some pixels are unavailable' });
    }

    /* ───────────────────────────────
       2. CREATE ORDER
    ─────────────────────────────── */
    const reference = `PIX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        reference,
        pixel_ids: pixelIds,
        amount_usd: pixelIds.length,
        status: 'pending',
        expires_at: expiresAt,
        mode
      })
      .select()
      .single();

    if (orderError) {
      return res.status(500).json({ error: orderError.message });
    }

    /* ───────────────────────────────
       3. PREPARE PIXEL UPDATES
    ─────────────────────────────── */
    let updates: any[] = [];

    if (mode === 'sync') {
      const { color, link } = req.body;

      if (!color || !link) {
        return res.status(400).json({ error: 'Missing color or link' });
      }

      updates = pixelIds.map((id: number) => ({
        pixel_id: id,
        status: 'reserved',
        color,
        link,
        order_id: order.id
      }));
    }

    if (mode === 'individual') {
      const { data } = req.body;

      if (!data || typeof data !== 'object') {
        return res.status(400).json({ error: 'Missing individual data' });
      }

      updates = pixelIds.map((id: number) => {
        const entry = data[id];
        if (!entry || !entry.color || !entry.link) {
          throw new Error(`Missing data for pixel ${id}`);
        }

        return {
          pixel_id: id,
          status: 'reserved',
          color: entry.color,
          link: entry.link,
          order_id: order.id
        };
      });
    }

    /* ───────────────────────────────
       4. UPSERT PIXELS
    ─────────────────────────────── */
    const { error: upsertError } = await supabase
      .from('pixels')
      .upsert(updates, { onConflict: 'pixel_id' });

    if (upsertError) {
      return res.status(500).json({ error: upsertError.message });
    }

    /* ───────────────────────────────
       DONE
    ─────────────────────────────── */
    return res.status(200).json({
      orderId: order.id,
      reference,
      expiresAt
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
