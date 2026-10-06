import { createClient } from '@supabase/supabase-js';

/**
 * One-shot admin tidy: DELETE free pixels + expired orders only.
 * Keeps sold pixels and paid orders.
 * POST { password } — password must match ADMIN_PASSWORD.
 */
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
  if (!ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }
  if (!req.body || req.body.password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      error: `Missing ${!SUPABASE_URL ? 'SUPABASE_URL' : 'SUPABASE_SERVICE_ROLE_KEY'}`,
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { data: pixelsBefore, error: pErr } = await supabase
      .from('pixels')
      .select('pixel_id, status');
    if (pErr) return res.status(500).json({ error: pErr.message });

    const { data: ordersBefore, error: oErr } = await supabase
      .from('orders')
      .select('id, status, reference, pixel_ids');
    if (oErr) return res.status(500).json({ error: oErr.message });

    const countBy = (rows, key = 'status') =>
      (rows || []).reduce((acc, r) => {
        acc[r[key]] = (acc[r[key]] || 0) + 1;
        return acc;
      }, {});

    const freeIds = (pixelsBefore || [])
      .filter((p) => p.status === 'free')
      .map((p) => p.pixel_id);
    const expiredIds = (ordersBefore || [])
      .filter((o) => o.status === 'expired')
      .map((o) => o.id);
    const soldBefore = (pixelsBefore || [])
      .filter((p) => p.status === 'sold')
      .map((p) => p.pixel_id)
      .sort((a, b) => a - b);
    const paidBefore = (ordersBefore || []).filter((o) => o.status === 'paid').length;

    const before = {
      pixels: countBy(pixelsBefore),
      orders: countBy(ordersBefore),
      freePixelIds: freeIds,
      expiredOrderCount: expiredIds.length,
      soldPixelIds: soldBefore,
      paidOrderCount: paidBefore,
    };

    if (freeIds.length > 0) {
      const { error } = await supabase.from('pixels').delete().eq('status', 'free');
      if (error) return res.status(500).json({ error: 'Delete free pixels: ' + error.message, before });
    }

    if (expiredIds.length > 0) {
      const { error } = await supabase.from('orders').delete().eq('status', 'expired');
      if (error) return res.status(500).json({ error: 'Delete expired orders: ' + error.message, before });
    }

    const { data: pixelsAfter } = await supabase.from('pixels').select('pixel_id, status');
    const { data: ordersAfter } = await supabase.from('orders').select('id, status');

    const soldAfter = (pixelsAfter || [])
      .filter((p) => p.status === 'sold')
      .map((p) => p.pixel_id)
      .sort((a, b) => a - b);

    const after = {
      pixels: countBy(pixelsAfter),
      orders: countBy(ordersAfter),
      soldPixelIds: soldAfter,
      paidOrderCount: (ordersAfter || []).filter((o) => o.status === 'paid').length,
    };

    return res.status(200).json({
      ok: true,
      deleted: { freePixels: freeIds.length, expiredOrders: expiredIds.length },
      before,
      after,
    });
  } catch (err) {
    console.error('tidy-leftovers error:', err);
    return res.status(500).json({ error: err.message });
  }
}
