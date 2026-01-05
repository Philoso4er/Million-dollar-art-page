import React, { useEffect, useState } from 'react';

interface Stats {
  totalRevenue: number;
  totalOrders: number;
  soldPixels: number;
}

interface Order {
  id: string;
  reference: string;
  amount_usd: number;
  status: 'pending' | 'paid';
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);

  /* ---------- LOAD DATA ---------- */
  const load = async () => {
    setLoading(true);

    const [statsRes, ordersRes] = await Promise.all([
      fetch('/api/admin-stats').then(r => r.json()),
      fetch('/api/admin-orders').then(r => r.json())
    ]);

    setStats(statsRes);
    setOrders(ordersRes);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  /* ---------- CONFIRM PAYMENT ---------- */
  const markAsPaid = async (orderId: string) => {
    if (!confirm('Mark this order as PAID?')) return;

    setWorkingId(orderId);

    try {
      const res = await fetch('/api/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      });

      if (!res.ok) throw new Error();

      // Optimistic UI update
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId ? { ...o, status: 'paid' } : o
        )
      );

      // Reload stats (revenue + sold pixels)
      const statsRes = await fetch('/api/admin-stats').then(r => r.json());
      setStats(statsRes);
    } catch {
      alert('Failed to confirm payment');
    } finally {
      setWorkingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-gray-400 p-6">
        Loading admin dashboard…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-900 p-4 rounded border border-gray-700">
          <div className="text-gray-400 text-sm">Total Revenue</div>
          <div className="text-2xl font-bold">${stats?.totalRevenue}</div>
        </div>

        <div className="bg-gray-900 p-4 rounded border border-gray-700">
          <div className="text-gray-400 text-sm">Total Orders</div>
          <div className="text-2xl font-bold">{stats?.totalOrders}</div>
        </div>

        <div className="bg-gray-900 p-4 rounded border border-gray-700">
          <div className="text-gray-400 text-sm">Sold Pixels</div>
          <div className="text-2xl font-bold">{stats?.soldPixels}</div>
        </div>
      </div>

      {/* ORDERS */}
      <h2 className="text-xl font-semibold mb-3">Recent Orders</h2>

      <div className="overflow-x-auto">
        <table className="w-full border border-gray-700 text-sm">
          <thead className="bg-gray-800">
            <tr>
              <th className="p-2 border-b border-gray-700 text-left">
                Reference
              </th>
              <th className="p-2 border-b border-gray-700 text-left">
                Amount
              </th>
              <th className="p-2 border-b border-gray-700 text-left">
                Status
              </th>
              <th className="p-2 border-b border-gray-700 text-left">
                Date
              </th>
              <th className="p-2 border-b border-gray-700 text-left">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {orders.map(order => (
              <tr key={order.id} className="border-t border-gray-800">
                <td className="p-2 font-mono">{order.reference}</td>
                <td className="p-2">${order.amount_usd}</td>
                <td className="p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      order.status === 'paid'
                        ? 'bg-green-600'
                        : 'bg-yellow-600'
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
                <td className="p-2 text-gray-400">
                  {new Date(order.created_at).toLocaleString()}
                </td>
                <td className="p-2">
                  {order.status === 'pending' ? (
                    <button
                      onClick={() => markAsPaid(order.id)}
                      disabled={workingId === order.id}
                      className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded text-xs"
                    >
                      {workingId === order.id
                        ? 'Processing…'
                        : 'Mark as Paid'}
                    </button>
                  ) : (
                    <span className="text-gray-500 text-xs">—</span>
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
