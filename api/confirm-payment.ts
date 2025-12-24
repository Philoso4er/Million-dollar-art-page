import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const adminPass = req.headers['x-admin-password'];

  if (adminPass !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { orderId } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Missing orderId' });

  const { data: order } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .single();

  if (!order || order.status !== 'pending') {
    return res.status(400).json({ error: 'Invalid order' });
  }

  await supabase
    .from('orders')
    .update({ status: 'paid' })
    .eq('id', orderId);

  await supabase
    .from('pixels')
    .update({
      status: 'sold',
      color: order.color,
      link: order.link
    })
    .eq('order_id', orderId);

  return res.status(200).json({ success: true });
}
