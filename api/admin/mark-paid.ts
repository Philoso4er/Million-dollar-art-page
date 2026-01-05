import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  const { orderId } = req.body;

  // Mark order as paid
  const { data: order, error } = await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  // Mark pixels as sold
  await supabase
    .from('pixels')
    .update({ status: 'sold' })
    .eq('order_id', orderId);

  res.status(200).json({ success: true });
}
