import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

interface Order {
  id: string;
  reference: string;
  amount_usd: number;
  status: string;
  expires_at: string;
  created_at: string;
}

export default function Admin() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const confirmPayment = async (orderId: string) => {
    const ok = confirm('Confirm payment for this order?');
    if (!ok) return;

    const res = await fetch('/api/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });

    if (res.ok) {
      alert('Payment confirmed');
      loadOrders();
    } else {
      alert('Failed to confirm payment');
    }
  };

  if (loading) {
    return <div className="p-6 text-white">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Admin – Orders</h1>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-700 text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-2 border">Reference</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Created</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t border-gray-700">
                <td className="p-2 border">{o.reference}</td>
                <td className="p-2 border">${o.amount_usd}</td>
                <td className="p-2 border">{o.status}</td>
                <td className="p-2 border">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="p-2 border">
                  {o.status === 'pending' ? (
                    <button
                      onClick={() => confirmPayment(o.id)}
                      className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
                    >
                      Confirm
                    </button>
                  ) : (
                    '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
