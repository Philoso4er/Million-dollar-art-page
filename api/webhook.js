const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify webhook signature
    const signature = req.headers['verif-hash'];
    if (!signature || signature !== process.env.FLW_WEBHOOK_HASH) {
      console.error('Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const { data } = req.body;

    if (data.status !== 'successful') {
      return res.status(200).json({ message: 'Payment not successful' });
    }

    const reference = data.tx_ref;

    // Find order
    const { data: order } = await supabase
      .from('orders')
      .select('*')
      .eq('reference', reference)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Mark order as paid
    await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id);

    // Update pixels to sold
    const pixelUpdates = order.pixel_ids.map(pixelId => {
      let pixelColor = order.color;
      let pixelLink = order.link;

      if (order.individual_data && Array.isArray(order.individual_data)) {
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
        order_id: order.id,
      };
    });

    await supabase.from('pixels').upsert(pixelUpdates);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
};
