import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: 'Missing orderId' });
    }

    // 1. Mark order as paid
    const { error: orderError } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', orderId);

    if (orderError) {
      return res.status(500).json({ error: orderError.message });
    }

    // 2. Mark pixels as sold
    const { error: pixelError } = await supabase
      .from('pixels')
      .update({ status: 'sold' })
      .eq('order_id', orderId);

    if (pixelError) {
      return res.status(500).json({ error: pixelError.message });
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
