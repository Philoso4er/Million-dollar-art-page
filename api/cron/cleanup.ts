import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(_: any, res: any) {
  const now = new Date().toISOString();

  // Find expired pending orders
  const { data: expiredOrders } = await supabase
    .from('orders')
    .select('id')
    .eq('status', 'pending')
    .lt('expires_at', now);

  if (!expiredOrders || expiredOrders.length === 0) {
    return res.status(200).json({ cleaned: 0 });
  }

  const orderIds = expiredOrders.map(o => o.id);

  // Free pixels
  await supabase
    .from('pixels')
    .update({
      status: 'free',
      color: null,
      link: null,
      order_id: null
    })
    .in('order_id', orderIds);

  // Mark orders expired
  await supabase
    .from('orders')
    .update({ status: 'expired' })
    .in('id', orderIds);

  res.status(200).json({ cleaned: orderIds.length });
}
