import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Support both SUPABASE_URL and VITE_SUPABASE_URL
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Webhook: missing env vars', { SUPABASE_URL: !!SUPABASE_URL, SUPABASE_KEY: !!SUPABASE_KEY });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    // Verify webhook signature
    const signature = req.headers['verif-hash'];
    if (!signature || signature !== process.env.FLW_WEBHOOK_HASH) {
      console.error('Webhook: invalid signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { data } = req.body;

    if (!data) {
      console.error('Webhook: no data in body');
      return res.status(400).json({ error: 'No data received' });
    }

    if (data.status !== 'successful') {
      console.log('Webhook: payment not successful, status:', data.status);
      return res.status(200).json({ message: 'Payment not successful, ignored' });
    }

    const reference = data.tx_ref;

    if (!reference) {
      console.error('Webhook: no tx_ref in data');
      return res.status(400).json({ error: 'No reference found' });
    }

    // Find the order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('reference', reference)
      .single();

    if (orderError || !order) {
      console.error('Webhook: order not found for reference', reference);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Already paid — idempotent, just return ok
    if (order.status === 'paid') {
      console.log('Webhook: order already paid', reference);
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    // Mark order as paid
    await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id);

    // Assign pixels
    const pixelUpdates = order.pixel_ids.map(pixelId => {
      let pixelColor = order.color;
      let pixelLink = order.link;

      if (order.individual_data && Array.isArray(order.individual_data)) {
        const match = order.individual_data.find(p => p.id === pixelId);
        if (match) {
          pixelColor = match.color;
          pixelLink = match.link;
        }
      }

      return {
        pixel_id: pixelId,
        status: 'sold',
        color: pixelColor,
        link: pixelLink,
        order_id: order.id,
      };
    });

    const { error: pixelError } = await supabase.from('pixels').upsert(pixelUpdates);

    if (pixelError) {
      console.error('Webhook: failed to assign pixels', pixelError);
      return res.status(500).json({ error: 'Failed to assign pixels' });
    }

    console.log(`Webhook: successfully processed order ${reference}, assigned ${order.pixel_ids.length} pixels`);
    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
