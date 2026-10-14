// POST { reference } -> { url } : starts a hosted Stripe Checkout session for a pending order (£1 per pixel).
import { getStripe, getSupabase } from './_lib/payments.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const stripe = getStripe();
  const supabase = getSupabase();
  if (!stripe) return res.status(500).json({ error: 'Payments are not configured (missing STRIPE_SECRET_KEY)' });
  if (!supabase) return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });

  const { reference } = req.body || {};
  if (!reference) return res.status(400).json({ error: 'Missing order reference' });

  const { data: order } = await supabase.from('orders').select('*').eq('reference', reference).single();
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'pending') return res.status(400).json({ error: `Order is ${order.status}` });

  const origin = process.env.SITE_URL || `https://${req.headers['x-forwarded-host'] || req.headers.host}`;
  const count = order.pixel_ids.length;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: count,
        price_data: {
          currency: 'gbp',
          unit_amount: 100, // £1 per pixel
          product_data: { name: 'Pixel Art Grid pixel', description: `Pixel claim ${order.reference}` },
        },
      }],
      client_reference_id: order.reference,
      metadata: { reference: order.reference, order_id: String(order.id), pixel_count: String(count) },
      payment_intent_data: { metadata: { reference: order.reference } },
      success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancelled&ref=${encodeURIComponent(order.reference)}`,
      expires_at: Math.floor(Date.now() / 1000) + 31 * 60, // Stripe minimum is 30 min
    });
    await supabase.from('orders').update({ payment_proof_url: `stripe_pending:${session.id}` }).eq('id', order.id);
    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe Checkout error:', err);
    return res.status(500).json({ error: 'Could not start checkout' });
  }
}
