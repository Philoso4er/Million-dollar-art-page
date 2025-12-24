import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const now = new Date().toISOString();

  const { data: expired } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'pending')
    .lt('expires_at', now);

  if (!expired || expired.length === 0) {
    return res.status(200).json({ message: 'No expired orders' });
  }

  const orderIds = expired.map(o => o.id);

  await supabase
    .from('orders')
    .update({ status: 'expired' })
    .in('id', orderIds);

  await supabase
    .from('pixels')
    .update({ status: 'free', order_id: null })
    .in('order_id', orderIds);

  return res.status(200).json({ expired: orderIds.length });
}
