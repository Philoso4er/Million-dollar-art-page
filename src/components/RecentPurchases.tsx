import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface Order {
  id: string;
  reference: string;
  pixel_ids: number[];
  created_at: string;
  link: string;
}

export default function RecentPurchases() {
  const [orders, setOrders] = useState<Order[]>([]);

  const loadRecent = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, reference, pixel_ids, created_at, link')
      .eq('status', 'paid')
      .order('created_at', { ascending: false })
      .limit(10);

    setOrders(data || []);
  };

  useEffect(() => {
    loadRecent();
    const interval = setInterval(loadRecent, 10000);
    return () => clearInterval(interval);
  }, []);

  if (orders.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-black/90 border-t border-gray-700">
      <div className="flex overflow-x-auto gap-6 px-4 py-2 text-sm text-gray-200">
        {orders.map(o => (
          <div key={o.id} className="whitespace-nowrap">
            🟩 Pixel #{o.pixel_ids.join(', ')} purchased ·{' '}
            <a
              href={o.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              visit
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
