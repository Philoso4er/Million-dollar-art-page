import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Server configuration error: missing STRIPE_SECRET_KEY' });
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY);

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({ error: 'Server configuration error: missing Supabase credentials' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ error: 'Missing order reference' });
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('reference', reference)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (order.status === 'paid') {
      return res.status(400).json({ error: 'Order already paid' });
    }
    if (order.status === 'expired') {
      return res.status(400).json({ error: 'Order has expired, please reselect your pixels' });
    }

    const amountInPence = Math.round(order.amount_usd * 100);
    if (amountInPence < 30) {
      return res.status(400).json({ error: 'Minimum contribution is £1' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInPence,
      currency: 'gbp',
      automatic_payment_methods: { enabled: true },
      metadata: {
        reference: order.reference,
        order_id: order.id,
        pixel_count: order.pixel_ids.length,
      },
    });

    await supabase
      .from('orders')
      .update({ payment_proof_url: `stripe_pending:${paymentIntent.id}` })
      .eq('id', order.id);

    return res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Stripe PaymentIntent error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create payment intent' });
  }
}
