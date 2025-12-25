import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function PublicStats() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: orders } = await supabase.from('orders').select('*');
      const { data: pixels } = await supabase.from('pixels').select('*');

      setStats({
        sold: pixels?.filter(p => p.status === 'sold').length || 0,
        revenue: orders?.filter(o => o.status === 'paid')
          .reduce((s, o) => s + o.amount_usd, 0) || 0
      });
    };
    load();
  }, []);

  if (!stats) return null;

  return (
    <div className="p-6 text-center text-white bg-black">
      <h1 className="text-2xl font-bold mb-2">Live Stats</h1>
      <p>Pixels sold: {stats.sold.toLocaleString()}</p>
      <p>Total revenue: ${stats.revenue.toLocaleString()}</p>
    </div>
  );
}
