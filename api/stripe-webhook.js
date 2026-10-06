import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false, // Stripe requires the raw body to verify the signature
  },
};

function encodePixelMeta({ owner, message, url }) {
  return JSON.stringify({
    owner: owner || '',
    message: message || '',
    url: url || '',
  });
}

function resolvePixelFields(order, pixelId) {
  let pixelColor = order.color;
  let owner = '';
  let message = '';
  let url = '';

  if (order.individual_data && Array.isArray(order.individual_data)) {
    const match = order.individual_data.find((p) => p.id === pixelId);
    if (match) {
      pixelColor = match.color;
      owner = match.owner || '';
      message = match.message || '';
      url = match.link || match.url || '';
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

  return {
    pixel_id: pixelId,
    status: 'sold',
    color: pixelColor,
    link: encodePixelMeta({ owner, message, url }),
    order_id: order.id,
  };
}

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!STRIPE_SECRET_KEY || !STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Stripe webhook: missing required env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  let event;
  try {
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const reference = paymentIntent.metadata?.reference;

      if (!reference) {
        console.error('Webhook: no reference in payment intent metadata');
        return res.status(400).json({ error: 'No reference found' });
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .select('*')
        .eq('reference', reference)
        .single();

      if (orderError || !order) {
        console.error('Webhook: order not found for reference', reference);
        return res.status(404).json({ error: 'Order not found' });
      }

      if (order.status === 'paid') {
        return res.status(200).json({ success: true, message: 'Already processed' });
      }

      await supabase
        .from('orders')
        .update({ status: 'paid', payment_proof_url: `stripe:${paymentIntent.id}` })
        .eq('id', order.id);

      const pixelUpdates = order.pixel_ids.map((pixelId) => resolvePixelFields(order, pixelId));

      const { error: pixelError } = await supabase.from('pixels').upsert(pixelUpdates);
      if (pixelError) {
        console.error('Webhook: failed to assign pixels', pixelError);
        return res.status(500).json({ error: 'Failed to assign pixels' });
      }

      console.log(`Webhook: order ${reference} paid, ${order.pixel_ids.length} pixels assigned`);
      return res.status(200).json({ success: true });
    }

    if (event.type === 'payment_intent.payment_failed') {
      const paymentIntent = event.data.object;
      const reference = paymentIntent.metadata?.reference;
      console.log(`Webhook: payment failed for order ${reference}`);
      return res.status(200).json({ received: true });
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return res.status(500).json({ error: err.message });
  }
}
