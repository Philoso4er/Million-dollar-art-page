// Shared payment helpers (files under api/_lib are not exposed as routes on Vercel).
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  return key ? new Stripe(key) : null;
}

export function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key) : null;
}

export function isAdmin(req) {
  const pw = process.env.ADMIN_PASSWORD;
  return Boolean(pw) && req.headers['x-admin-password'] === pw;
}

function encodePixelMeta({ owner, message, url }) {
  return JSON.stringify({ owner: owner || '', message: message || '', url: url || '' });
}

export function resolvePixelFields(order, pixelId) {
  let color = order.color;
  let owner = '';
  let message = '';
  let url = '';
  if (Array.isArray(order.individual_data)) {
    const m = order.individual_data.find((p) => p.id === pixelId);
    if (m) {
      color = m.color;
      owner = m.owner || '';
      message = m.message || '';
      url = m.link || m.url || '';
    }
  } else if (order.link && String(order.link).trim().startsWith('{')) {
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
  }
  return { pixel_id: pixelId, status: 'sold', color, link: encodePixelMeta({ owner, message, url }), order_id: order.id };
}

/**
 * Marks an order paid and its pixels sold. Idempotent.
 * Pays even if the 20-minute reservation lapsed, as long as the pixels were not
 * taken by someone else in the meantime (the customer has already been charged).
 */
export async function fulfilOrder(supabase, reference, proof) {
  const { data: order, error } = await supabase.from('orders').select('*').eq('reference', reference).single();
  if (error || !order) return { ok: false, status: 404, error: 'Order not found' };
  if (order.status === 'paid') return { ok: true, already: true };

  const { data: rows } = await supabase.from('pixels').select('pixel_id, status, order_id').in('pixel_id', order.pixel_ids);
  const conflict = (rows || []).filter((p) => p.status === 'sold' && p.order_id !== order.id);
  if (conflict.length) {
    await supabase.from('orders').update({ status: 'conflict', payment_proof_url: proof }).eq('id', order.id);
    console.error(`Order ${reference} paid but pixels already sold: ${conflict.map((p) => p.pixel_id).join(',')} — refund needed`);
    return { ok: false, status: 409, error: 'Pixels already sold; refund required' };
  }

  const { error: pxErr } = await supabase.from('pixels').upsert(order.pixel_ids.map((id) => resolvePixelFields(order, id)));
  if (pxErr) return { ok: false, status: 500, error: 'Failed to assign pixels' };
  await supabase.from('orders').update({ status: 'paid', payment_proof_url: proof }).eq('id', order.id);
  return { ok: true };
}

export async function releaseOrder(supabase, reference) {
  const { data: order } = await supabase.from('orders').select('id,status').eq('reference', reference).single();
  if (!order || order.status !== 'pending') return;
  await supabase.from('pixels').update({ status: 'free', order_id: null, color: null, link: null }).eq('order_id', order.id).neq('status', 'sold');
  await supabase.from('orders').update({ status: 'expired' }).eq('id', order.id);
}
