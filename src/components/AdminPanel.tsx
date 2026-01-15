import React, { useEffect, useState } from "react";

export default function AdminPanel() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    const res = await fetch("/api/admin-orders");
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  const markPaid = async (id: string) => {
    const res = await fetch("/api/admin/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (!res.ok) return alert("Failed to update order.");

    loadOrders();
  };

  useEffect(() => {
    loadOrders();
  }, []);

  if (loading) return <div className="text-white p-4">Loading...</div>;

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <table className="w-full text-sm border border-gray-700">
        <thead className="bg-gray-800">
          <tr>
            <th className="p-2 border border-gray-700">Reference</th>
            <th className="p-2 border border-gray-700">Pixels</th>
            <th className="p-2 border border-gray-700">Status</th>
            <th className="p-2 border border-gray-700">Expires</th>
            <th className="p-2 border border-gray-700">Proof</th>
            <th className="p-2 border border-gray-700">Action</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border border-gray-700">
              <td className="p-2">{o.reference}</td>
              <td className="p-2">{o.pixel_ids.length}</td>
              <td className="p-2">{o.status}</td>
              <td className="p-2">{o.expires_at}</td>
              <td className="p-2">
                {o.payment_proof_url ? (
                  <a
                    href={o.payment_proof_url}
                    target="_blank"
                    className="text-blue-400 underline"
                  >
                    View
                  </a>
                ) : (
                  "None"
                )}
              </td>
              <td className="p-2">
                {o.status === "pending" ? (
                  <button
                    onClick={() => markPaid(o.id)}
                    className="bg-green-600 px-3 py-1 rounded"
                  >
                    Mark Paid
                  </button>
                ) : (
                  <span className="text-green-400">OK</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
