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
    const now = new Date().toISOString();

    // 1. Find expired pending orders
    const { data: expiredOrders, error } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'pending')
      .lt('expires_at', now);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    if (!expiredOrders || expiredOrders.length === 0) {
      return res.status(200).json({ cleaned: 0 });
    }

    const orderIds = expiredOrders.map(o => o.id);

    // 2. Free pixels
    await supabase
      .from('pixels')
      .update({
        status: 'free',
        order_id: null,
        color: null,
        link: null
      })
      .in('order_id', orderIds);

    return res.status(200).json({
      cleaned: orderIds.length
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
