import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

interface Order {
  id: string;
  reference: string;
  amount_usd: number;
  status: string;
  created_at: string;
  email: string | null;
  pixel_ids: number[];
}

export default function Admin() {
  const [authorized, setAuthorized] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const pass = prompt('Admin password:');
    if (pass === import.meta.env.VITE_ADMIN_PASSWORD) {
      setAuthorized(true);
    } else {
      alert('Unauthorized');
      window.location.href = '/';
    }
  }, []);

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
    if (authorized) loadOrders();
  }, [authorized]);

  const confirmPayment = async (orderId: string) => {
    const res = await fetch('/api/confirm-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-password': prompt('Confirm admin password:') || ''
      },
      body: JSON.stringify({ orderId })
    });

    if (res.ok) {
      alert('Payment confirmed & email sent (if provided)');
      loadOrders();
    } else {
      alert('Confirmation failed');
    }
  };

  if (!authorized) return null;
  if (loading) return <div className="p-6 text-white">Loading…</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Admin – Orders</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border border-gray-700">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-2 border">Reference</th>
              <th className="p-2 border">Pixels</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Amount</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t border-gray-700">
                <td className="p-2 border font-mono">{o.reference}</td>
                <td className="p-2 border">{o.pixel_ids?.join(', ')}</td>
                <td className="p-2 border">
                  {o.email ? o.email : <span className="text-gray-500">—</span>}
                </td>
                <td className="p-2 border">${o.amount_usd}</td>
                <td className="p-2 border">{o.status}</td>
                <td className="p-2 border">
                  {o.status === 'pending' && (
                    <button
                      onClick={() => confirmPayment(o.id)}
                      className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
                    >
                      Confirm
                    </button>
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
