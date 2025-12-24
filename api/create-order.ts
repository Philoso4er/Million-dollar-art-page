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
    const { pixelIds } = req.body;

    if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
      return res.status(400).json({ error: 'Invalid pixelIds' });
    }

    // Check availability
    const { data: existing } = await supabase
      .from('pixels')
      .select('pixel_id, status')
      .in('pixel_id', pixelIds);

    if (existing && existing.some(p => p.status !== 'free')) {
      return res.status(409).json({ error: 'Some pixels unavailable' });
    }

    const reference = `PIX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        reference,
        pixel_ids: pixelIds,
        amount_usd: pixelIds.length,
        expires_at: expiresAt,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      return res.status(500).json({ error: orderError.message });
    }

    // Reserve pixels
    const updates = pixelIds.map(pixelId => ({
      pixel_id: pixelId,
      status: 'reserved',
      order_id: order.id
    }));

    await supabase.from('pixels').upsert(updates);

    return res.status(200).json({
      orderId: order.id,
      reference,
      expiresAt
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
