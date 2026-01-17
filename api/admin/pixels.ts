import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: any, res: any) {
  const { data } = await supabase.from('pixels').select('status');

  const stats = { free: 1000000, reserved: 0, sold: 0 };

  if (data) {
    stats.reserved = data.filter((p: any) => p.status === 'reserved').length;
    stats.sold = data.filter((p: any) => p.status === 'sold').length;
    stats.free = 1000000 - stats.reserved - stats.sold;
  }

  return res.status(200).json(stats);
}
