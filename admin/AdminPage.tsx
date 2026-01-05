import React, { useEffect, useState } from 'react';

interface Order {
  id: string;
  reference: string;
  pixel_ids: number[];
  amount_usd: number;
  status: string;
  payment_note: string | null;
  created_at: string;
}

export default function AdminPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/orders');
    const data = await res.json();
    setOrders(data);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const markPaid = async (orderId: string) => {
    if (!confirm('Mark this order as PAID?')) return;

    const res = await fetch('/api/admin/mark-paid', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId })
    });

    if (!res.ok) {
      alert('Failed');
      return;
    }

    loadOrders();
  };

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Admin – Orders</h1>

      {loading && <p>Loading…</p>}

      <div className="space-y-4">
        {orders.map(o => (
          <div
            key={o.id}
            className="border border-gray-700 rounded p-4 bg-gray-900"
          >
            <div className="flex justify-between">
              <div>
                <div className="font-mono text-green-400">
                  {o.reference}
                </div>
                <div className="text-sm text-gray-400">
                  {o.pixel_ids.length} pixels • ${o.amount_usd}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(o.created_at).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => markPaid(o.id)}
                className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
              >
                Mark as Paid
              </button>
            </div>

            {o.payment_note && (
              <div className="mt-3 text-sm bg-black p-3 rounded">
                <div className="text-gray-400 mb-1">Payment proof</div>
                <div className="break-all">{o.payment_note}</div>
              </div>
            )}
          </div>
        ))}

        {orders.length === 0 && !loading && (
          <p className="text-gray-400">No pending orders</p>
        )}
      </div>
    </div>
  );
}
