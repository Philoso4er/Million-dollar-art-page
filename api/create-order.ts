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
    const { pixelIds, color, link, email } = req.body;

    // Basic validation
    if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
      return res.status(400).json({ error: 'Invalid pixelIds' });
    }

    if (!color || typeof color !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid color' });
    }

    if (!link || typeof link !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid link' });
    }

    if (email && typeof email !== 'string') {
      return res.status(400).json({ error: 'Invalid email' });
    }

    // Check pixel availability
    const { data: existing, error: checkError } = await supabase
      .from('pixels')
      .select('pixel_id, status')
      .in('pixel_id', pixelIds);

    if (checkError) {
      return res.status(500).json({ error: checkError.message });
    }

    if (existing && existing.some(p => p.status !== 'free')) {
      return res.status(409).json({ error: 'One or more pixels are unavailable' });
    }

    // Generate order metadata
    const reference = `PIX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        reference,
        pixel_ids: pixelIds,
        amount_usd: pixelIds.length,
        status: 'pending',
        expires_at: expiresAt,
        color,
        link,
        email: email || null
      })
      .select()
      .single();

    if (orderError || !order) {
      return res.status(500).json({ error: orderError?.message || 'Order creation failed' });
    }

    // Reserve pixels
    const pixelUpdates = pixelIds.map((pixelId: number) => ({
      pixel_id: pixelId,
      status: 'reserved',
      order_id: order.id
    }));

    const { error: reserveError } = await supabase
      .from('pixels')
      .upsert(pixelUpdates);

    if (reserveError) {
      return res.status(500).json({ error: reserveError.message });
    }

    // Success response
    return res.status(200).json({
      orderId: order.id,
      reference,
      expiresAt
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
