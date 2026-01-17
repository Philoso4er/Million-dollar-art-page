import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    if (action === 'create' && req.method === 'POST') {
      const { pixelIds, mode, color, link, individual } = req.body;

      if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
        return res.status(400).json({ error: 'Invalid pixel selection' });
      }

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

      await supabase.from('pixels').upsert(
        pixelIds.map((id: number) => ({
          pixel_id: id,
          status: 'reserved',
          order_id: order.id,
        }))
      );

      return res.status(200).json({ reference, order_id: order.id });
    }

    if (action === 'list' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ orders: data || [] });
    }

    if (action === 'update' && req.method === 'POST') {
      const { orderId } = req.body;

      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) return res.status(404).json({ error: 'Order not found' });

      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);

      const pixelUpdates = order.pixel_ids.map((pixelId: number) => {
        let pixelColor = order.color;
        let pixelLink = order.link;

        if (order.individual_data) {
          const individualPixel = order.individual_data.find((p: any) => p.id === pixelId);
          if (individualPixel) {
            pixelColor = individualPixel.color;
            pixelLink = individualPixel.link;
          }
        }

        return {
          pixel_id: pixelId,
          status: 'sold',
          color: pixelColor,
          link: pixelLink,
          order_id: orderId,
        };
      });

      await supabase.from('pixels').upsert(pixelUpdates);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err: any) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
