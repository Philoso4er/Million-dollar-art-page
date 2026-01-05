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
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/admin-stats').then(r => r.json()),
      fetch('/api/admin-orders').then(r => r.json())
    ]).then(([statsData, ordersData]) => {
      setStats(statsData);
      setOrders(ordersData);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-gray-400">Loading admin dashboard…</div>
    );
  }

  return (
    <div className="p-6 text-white bg-gray-950 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {/* Stats */}
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

      {/* Orders */}
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
            </tr>
          </thead>
          <tbody>
            {orders.map(o => (
              <tr key={o.id} className="border-t border-gray-800">
                <td className="p-2 font-mono">{o.reference}</td>
                <td className="p-2">${o.amount_usd}</td>
                <td className="p-2">
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      o.status === 'paid'
                        ? 'bg-green-600'
                        : 'bg-yellow-600'
                    }`}
                  >
                    {o.status}
                  </span>
                </td>
                <td className="p-2 text-gray-400">
                  {new Date(o.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
