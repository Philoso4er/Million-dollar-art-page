import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Total revenue (sold orders)
    const { data: revenueRows } = await supabase
      .from('orders')
      .select('amount_usd')
      .eq('status', 'paid');

    const totalRevenue =
      revenueRows?.reduce((sum, o) => sum + (o.amount_usd || 0), 0) || 0;

    // Orders count
    const { count: totalOrders } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    // Sold pixels
    const { count: soldPixels } = await supabase
      .from('pixels')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold');

    return res.status(200).json({
      totalRevenue,
      totalOrders: totalOrders || 0,
      soldPixels: soldPixels || 0
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
