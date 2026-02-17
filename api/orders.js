import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Support both SUPABASE_URL and VITE_SUPABASE_URL so local dev and Vercel both work
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing env vars:', {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_KEY: !!SUPABASE_KEY,
    });
    return res.status(500).json({
      error: `Server configuration error: missing ${!SUPABASE_URL ? 'SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY'}`,
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  const { action } = req.query;

  async function cleanupExpiredOrders() {
    try {
      const now = new Date().toISOString();
      const { data: expiredOrders } = await supabase
        .from('orders').select('id').eq('status', 'pending').lt('expires_at', now);
      if (expiredOrders && expiredOrders.length > 0) {
        const expiredIds = expiredOrders.map(o => o.id);
        await supabase.from('pixels')
          .update({ status: 'free', order_id: null, color: null, link: null })
          .in('order_id', expiredIds);
        await supabase.from('orders').update({ status: 'expired' }).in('id', expiredIds);
        console.log(`Cleaned up ${expiredIds.length} expired orders`);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  async function assignPixels(order) {
    const pixelUpdates = order.pixel_ids.map(pixelId => {
      let pixelColor = order.color;
      let pixelLink = order.link;
      if (order.individual_data) {
        const match = order.individual_data.find(p => p.id === pixelId);
        if (match) { pixelColor = match.color; pixelLink = match.link; }
      }
      return { pixel_id: pixelId, status: 'sold', color: pixelColor, link: pixelLink, order_id: order.id };
    });
    await supabase.from('pixels').upsert(pixelUpdates);
  }

  try {
    // CREATE ORDER
    if (action === 'create' && req.method === 'POST') {
      await cleanupExpiredOrders();
      const { pixelIds, mode, color, link, individual } = req.body;

      if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
        return res.status(400).json({ error: 'Invalid pixel selection' });
      }

      const { data: existing } = await supabase
        .from('pixels').select('pixel_id, status').in('pixel_id', pixelIds);
      const occupiedPixels = existing?.filter(p => p.status && p.status !== 'free') || [];
      if (occupiedPixels.length > 0) {
        return res.status(409).json({
          error: `Pixels ${occupiedPixels.map(p => p.pixel_id).join(', ')} are unavailable`,
          occupiedPixels,
        });
      }

      const reference = 'PIX-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const expiresAt = new Date(Date.now() + 20 * 60 * 1000).toISOString();

      const { data: order, error } = await supabase.from('orders').insert({
        reference,
        pixel_ids: pixelIds,
        amount_usd: pixelIds.length,
        color: mode === 'sync' ? color : null,
        link: mode === 'sync' ? link : null,
        individual_data: mode === 'individual' ? individual : null,
        status: 'pending',
        expires_at: expiresAt,
      }).select().single();

      if (error) return res.status(500).json({ error: error.message });

      await supabase.from('pixels').upsert(
        pixelIds.map(id => ({ pixel_id: id, status: 'reserved', order_id: order.id }))
      );

      return res.status(200).json({ reference, order_id: order.id });
    }

    // CONFIRM PAYPAL PAYMENT
    if (action === 'confirm-paypal' && req.method === 'POST') {
      const { paypalOrderId, reference } = req.body;

      if (!paypalOrderId || !reference) {
        return res.status(400).json({ error: 'Missing paypalOrderId or reference' });
      }

      const { data: order } = await supabase
        .from('orders').select('*').eq('reference', reference).single();

      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status === 'paid') return res.status(200).json({ ok: true, message: 'Already paid' });
      if (order.status === 'expired') return res.status(400).json({ error: 'Order has expired' });

      await supabase.from('orders')
        .update({ status: 'paid', payment_proof_url: `paypal:${paypalOrderId}` })
        .eq('id', order.id);

      await assignPixels(order);

      return res.status(200).json({ ok: true });
    }

    // LIST ORDERS (Admin)
    if (action === 'list' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders').select('*').order('created_at', { ascending: false });
      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ orders: data || [] });
    }

    // UPDATE ORDER - Mark Paid (Admin)
    if (action === 'update' && req.method === 'POST') {
      const { orderId } = req.body;
      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (!order) return res.status(404).json({ error: 'Order not found' });

      await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId);
      await assignPixels(order);

      return res.status(200).json({ ok: true });
    }

    // DELETE ORDER (Admin)
    if (action === 'delete' && req.method === 'POST') {
      const { orderId } = req.body;
      const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
      if (!order) return res.status(404).json({ error: 'Order not found' });

      await supabase.from('pixels')
        .update({ status: 'free', order_id: null, color: null, link: null })
        .in('pixel_id', order.pixel_ids);

      await supabase.from('orders').delete().eq('id', orderId);
      return res.status(200).json({ ok: true });
    }

    // CLEANUP EXPIRED (Manual)
    if (action === 'cleanup' && req.method === 'POST') {
      await cleanupExpiredOrders();
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
