import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing env vars:', {
      hasUrl: !!process.env.SUPABASE_URL,
      hasKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    });
    return res.status(500).json({ 
      error: 'Server configuration error - Check Vercel env variables'
    });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { action } = req.query;

  // Helper function to cleanup expired orders
  async function cleanupExpiredOrders() {
    try {
      const now = new Date().toISOString();
      
      // Find expired orders
      const { data: expiredOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('status', 'pending')
        .lt('expires_at', now);

      if (expiredOrders && expiredOrders.length > 0) {
        const expiredIds = expiredOrders.map(o => o.id);
        
        // Free the pixels
        await supabase
          .from('pixels')
          .update({ 
            status: 'free', 
            order_id: null, 
            color: null, 
            link: null 
          })
          .in('order_id', expiredIds);
        
        // Mark orders as expired
        await supabase
          .from('orders')
          .update({ status: 'expired' })
          .in('id', expiredIds);
        
        console.log(`Cleaned up ${expiredIds.length} expired orders`);
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  try {
    // CREATE ORDER
    if (action === 'create' && req.method === 'POST') {
      // Cleanup expired orders before creating new one
      await cleanupExpiredOrders();

      const { pixelIds, mode, color, link, individual } = req.body;

      if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
        return res.status(400).json({ error: 'Invalid pixel selection' });
      }

      // Check availability - need to check if pixel exists AND is free
      const { data: existing } = await supabase
        .from('pixels')
        .select('pixel_id, status')
        .in('pixel_id', pixelIds);

      // Filter for actually occupied pixels (not free, not null)
      const occupiedPixels = existing?.filter(p => 
        p.status && p.status !== 'free'
      ) || [];

      if (occupiedPixels.length > 0) {
        const occupiedIds = occupiedPixels.map(p => p.pixel_id).join(', ');
        console.log('Occupied pixels:', occupiedIds);
        return res.status(409).json({ 
          error: `Pixels ${occupiedIds} are unavailable`,
          occupiedPixels: occupiedPixels 
        });
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

    // UPDATE ORDER (Admin)
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

    // DELETE ORDER (Admin)
    if (action === 'delete' && req.method === 'POST') {
      const { orderId } = req.body;

      // Get order details
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) return res.status(404).json({ error: 'Order not found' });

      // Free the pixels
      await supabase
        .from('pixels')
        .update({ 
          status: 'free', 
          order_id: null, 
          color: null, 
          link: null 
        })
        .in('pixel_id', order.pixel_ids);

      // Delete the order
      await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      return res.status(200).json({ ok: true, message: 'Order deleted and pixels freed' });
    }

    // CLEANUP EXPIRED ORDERS (Manual trigger)
    if (action === 'cleanup' && req.method === 'POST') {
      await cleanupExpiredOrders();
      return res.status(200).json({ success: true, message: 'Cleanup completed' });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
