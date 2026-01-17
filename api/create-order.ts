import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pixelIds, mode, color, link, individual } = req.body;

    if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
      return res.status(400).json({ error: 'Invalid pixel selection' });
    }

    // Check availability
    const { data: existing } = await supabase
      .from('pixels')
      .select('pixel_id, status')
      .in('pixel_id', pixelIds);

    const occupied = existing?.filter((p: any) => p.status !== 'free' && p.status !== null);
    if (occupied && occupied.length > 0) {
      return res.status(409).json({ error: 'Some pixels are unavailable' });
    }

    const reference = 'PIX-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

    // Create order
    const { data: order, error } = await supabase
      .from('orders')
      .insert({
        reference,
        pixel_ids: pixelIds,
        amount_usd: pixelIds.length,
        color: mode === 'sync' ? color : null,
        link: mode === 'sync' ? link : null,
        individual_data: mode === 'individual' ? individual : null,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error('Order creation error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Reserve pixels
    await supabase.from('pixels').upsert(
      pixelIds.map((id: number) => ({
        pixel_id: id,
        status: 'reserved',
        order_id: order.id,
      }))
    );

    return res.status(200).json({ reference, order_id: order.id });
  } catch (err: any) {
    console.error('Create order error:', err);
    return res.status(500).json({ error: err.message });
  }
}
