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
    const { pixelIds, color, link, paymentNote } = req.body;

    if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
      return res.status(400).json({ error: 'Invalid pixelIds' });
    }

    // Check availability
    const { data: existing } = await supabase
      .from('pixels')
      .select('pixel_id, status')
      .in('pixel_id', pixelIds);

    if (existing && existing.some(p => p.status !== 'free')) {
      return res.status(409).json({ error: 'Some pixels are unavailable' });
    }

    const reference = `PIX-${Math.random()
      .toString(36)
      .slice(2, 8)
      .toUpperCase()}`;

    const expiresAt = new Date(
      Date.now() + 20 * 60 * 1000
    ).toISOString();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        reference,
        pixel_ids: pixelIds,
        amount_usd: pixelIds.length,
        status: 'pending',
        color,
        link,
        expires_at: expiresAt,
        payment_note: paymentNote || null
      })
      .select()
      .single();

    if (orderError) {
      return res.status(500).json({ error: orderError.message });
    }

    const updates = pixelIds.map((id: number) => ({
      pixel_id: id,
      status: 'reserved',
      color,
      link,
      order_id: order.id
    }));

    const { error: pixelError } = await supabase
      .from('pixels')
      .upsert(updates, { onConflict: 'pixel_id' });

    if (pixelError) {
      return res.status(500).json({ error: pixelError.message });
    }

    return res.status(200).json({
      orderId: order.id,
      reference,
      expiresAt
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
