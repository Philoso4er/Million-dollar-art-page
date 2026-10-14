// Stripe webhook: marks pixels as owned once Checkout is paid.
// Dashboard endpoint: https://<your-domain>/api/stripe-webhook
// Events: checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.expired
import { getStripe, getSupabase, fulfilOrder, releaseOrder } from './_lib/payments.js';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const stripe = getStripe();
  const supabase = getSupabase();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !supabase || !secret) {
    console.error('Stripe webhook: missing env vars');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(await getRawBody(req), req.headers['stripe-signature'], secret);
  } catch (err) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    const obj = event.data.object;
    const reference = obj.metadata?.reference || obj.client_reference_id;
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        if (obj.payment_status !== 'paid') return res.status(200).json({ received: true, pending: true });
        if (!reference) return res.status(200).json({ received: true, ignored: 'no reference' });
        const r = await fulfilOrder(supabase, reference, `stripe:${obj.id}`);
        // 409 = paid but conflicted: ack so Stripe stops retrying; it's logged for a manual refund.
        if (!r.ok && r.status !== 409) return res.status(r.status || 500).json({ error: r.error });
        return res.status(200).json({ received: true });
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed':
        if (reference) await releaseOrder(supabase, reference);
        return res.status(200).json({ received: true });
      default:
        return res.status(200).json({ received: true });
    }
  } catch (err) {
    console.error('Stripe webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook handler error' });
  }
}
