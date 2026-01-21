const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    // CREATE ORDER
    if (action === 'create' && req.method === 'POST') {
      const { pixelIds, mode, color, link, individual } = req.body;

      if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
        return res.status(400).json({ error: 'Invalid pixel selection' });
      }

      // Check availability
      const { data: existing } = await supabase
        .from('pixels')
        .select('pixel_id, status')
        .in('pixel_id', pixelIds);

      const occupied = existing?.filter(p => p.status !== 'free' && p.status !== null);
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
        pixelIds.map(id => ({
          pixel_id: id,
          status: 'reserved',
          order_id: order.id,
        }))
      );

      return res.status(200).json({ reference, order_id: order.id });
    }

    // GET ALL ORDERS (Admin)
    if (action === 'list' && req.method === 'GET') {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) return res.status(500).json({ error: error.message });
      return res.status(200).json({ orders: data || [] });
    }

    // UPDATE ORDER STATUS (Admin - Mark as Paid)
    if (action === 'update' && req.method === 'POST') {
      const { orderId } = req.body;

      // Get order details
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) return res.status(404).json({ error: 'Order not found' });

      // Mark order as paid
      await supabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId);

      // Update pixels to sold
      const pixelUpdates = order.pixel_ids.map(pixelId => {
        let pixelColor = order.color;
        let pixelLink = order.link;

        if (order.individual_data) {
          const individualPixel = order.individual_data.find(p => p.id === pixelId);
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
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
};
