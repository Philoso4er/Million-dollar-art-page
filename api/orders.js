import { createClient } from '@supabase/supabase-js';

function encodePixelMeta({ owner, message, url }) {
  return JSON.stringify({
    owner: owner || '',
    message: message || '',
    url: url || '',
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
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
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  }

  function resolvePixelFields(order, pixelId) {
    let pixelColor = order.color;
    let owner = '';
    let message = '';
    let url = '';

    if (order.individual_data && Array.isArray(order.individual_data)) {
      const match = order.individual_data.find(p => p.id === pixelId);
      if (match) {
        pixelColor = match.color;
        owner = match.owner || '';
        message = match.message || '';
        url = match.link || match.url || '';
      }
    } else {
      // Sync mode: order.link may be JSON meta or legacy URL
      if (order.link && String(order.link).trim().startsWith('{')) {
        try {
          const meta = JSON.parse(order.link);
          owner = meta.owner || '';
          message = meta.message || '';
          url = meta.url || '';
        } catch {
          url = order.link || '';
        }
      } else {
        url = order.link || '';
        owner = order.owner || '';
        message = order.message || '';
      }
    }

    return {
      pixel_id: pixelId,
      status: 'sold',
      color: pixelColor,
      link: encodePixelMeta({ owner, message, url }),
      order_id: order.id,
    };
  }

  async function assignPixels(order) {
    const pixelUpdates = order.pixel_ids.map(pixelId => resolvePixelFields(order, pixelId));
    await supabase.from('pixels').upsert(pixelUpdates);
  }

  try {
    // CREATE ORDER
    if (action === 'create' && req.method === 'POST') {
      await cleanupExpiredOrders();
      const { pixelIds, mode, color, link, owner, message, individual } = req.body;

      if (!Array.isArray(pixelIds) || pixelIds.length === 0) {
        return res.status(400).json({ error: 'Invalid pixel selection' });
      }

      // Colour is required; name / message / link are optional
      if (mode === 'individual') {
        if (!Array.isArray(individual) || individual.length === 0) {
          return res.status(400).json({ error: 'Individual pixel data is required' });
        }
        const missingColor = individual.find((p) => !p || !p.color);
        if (missingColor) {
          return res.status(400).json({ error: 'Every pixel needs a colour' });
        }
      } else if (!color) {
        return res.status(400).json({ error: 'Colour is required' });
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

      const syncMeta = encodePixelMeta({
        owner: owner ? String(owner).trim().slice(0, 40) : '',
        message: message ? String(message).trim().slice(0, 280) : '',
        url: link ? String(link).trim() : '',
      });

      // Enrich individual rows with optional owner/message defaults
      const individualEnriched = Array.isArray(individual)
        ? individual.map((p) => ({
            id: p.id,
            color: p.color,
            owner: String(p.owner || owner || '').trim().slice(0, 40),
            message: String(p.message || message || '').trim().slice(0, 280),
            link: p.link || '',
          }))
        : null;

      const { data: order, error } = await supabase.from('orders').insert({
        reference,
        pixel_ids: pixelIds,
        amount_usd: pixelIds.length, // £1 each — amount stored as pounds
        color: mode === 'individual' ? null : color,
        link: mode === 'individual' ? null : syncMeta,
        individual_data: mode === 'individual' ? individualEnriched : null,
        status: 'pending',
        expires_at: expiresAt,
      }).select().single();

      if (error) return res.status(500).json({ error: error.message });

      await supabase.from('pixels').upsert(
        pixelIds.map(id => ({ pixel_id: id, status: 'reserved', order_id: order.id }))
      );

      return res.status(200).json({ reference, order_id: order.id });
    }

    // CONFIRM STRIPE PAYMENT (client-side fallback; webhook is the source of truth)
    if (action === 'confirm-stripe' && req.method === 'POST') {
      const { reference } = req.body;
      if (!reference) return res.status(400).json({ error: 'Missing reference' });

      const { data: order } = await supabase
        .from('orders').select('*').eq('reference', reference).single();

      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status === 'paid') return res.status(200).json({ ok: true, message: 'Already paid' });
      if (order.status === 'expired') return res.status(400).json({ error: 'Order has expired' });

      await supabase.from('orders').update({ status: 'paid' }).eq('id', order.id);
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

    // CONFIRM AFTER REDIRECT-BASED STRIPE METHODS (Klarna etc.)
    // Client returns with ?payment_intent=...; webhook remains source of truth.
    if (action === 'confirm-redirect' && req.method === 'POST') {
      const { paymentIntentId, reference } = req.body || {};
      let order = null;

      if (reference) {
        const { data } = await supabase.from('orders').select('*').eq('reference', reference).single();
        order = data;
      } else if (paymentIntentId) {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('payment_proof_url', `stripe_pending:${paymentIntentId}`)
          .maybeSingle();
        order = data;
        if (!order) {
          const { data: paid } = await supabase
            .from('orders')
            .select('*')
            .eq('payment_proof_url', `stripe:${paymentIntentId}`)
            .maybeSingle();
          order = paid;
        }
      }

      if (!order) return res.status(404).json({ error: 'Order not found for payment' });
      if (order.status === 'paid') return res.status(200).json({ ok: true, message: 'Already paid' });
      if (order.status === 'expired') return res.status(400).json({ error: 'Order has expired' });

      await supabase.from('orders').update({
        status: 'paid',
        payment_proof_url: paymentIntentId ? `stripe:${paymentIntentId}` : order.payment_proof_url,
      }).eq('id', order.id);
      await assignPixels(order);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Invalid action' });
  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({ error: err.message });
  }
}
