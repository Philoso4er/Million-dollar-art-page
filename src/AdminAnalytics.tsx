import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

export default function AdminAnalytics() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      const { data: orders } = await supabase.from('orders').select('*');
      const { data: pixels } = await supabase.from('pixels').select('*');

      const paid = orders?.filter(o => o.status === 'paid') || [];
      const pending = orders?.filter(o => o.status === 'pending') || [];

      setStats({
        revenue: paid.reduce((s, o) => s + o.amount_usd, 0),
        sold: pixels?.filter(p => p.status === 'sold').length || 0,
        pending: pending.length,
        paid: paid.length,
        conversion: orders?.length
          ? Math.round((paid.length / orders.length) * 100)
          : 0
      });
    };
    load();
  }, []);

  if (!stats) return <div className="p-6 text-white">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Analytics</h1>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Revenue ($)" value={stats.revenue} />
        <Stat label="Pixels Sold" value={stats.sold} />
        <Stat label="Orders Paid" value={stats.paid} />
        <Stat label="Orders Pending" value={stats.pending} />
        <Stat label="Conversion %" value={`${stats.conversion}%`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-gray-800 rounded p-4">
      <div className="text-sm text-gray-400">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
