import React, { useEffect, useState } from "react";

interface Order {
  id: string;
  reference: string;
  pixel_ids: number[];
  amount_usd: number;
  status: string;
  payment_proof_url: string | null;
  created_at: string;
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const loadOrders = async () => {
    setLoading(true);
    const res = await fetch("/api/get-orders");
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  };

  const markPaid = async (id: string) => {
    const res = await fetch("/api/admin-mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      alert("Marked as paid");
      loadOrders();
    } else {
      alert("Failed");
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-gray-900 w-full max-w-2xl p-6 rounded border border-gray-700 text-white overflow-y-auto max-h-[85vh]">

        <button onClick={onClose} className="absolute top-5 right-5 text-xl">
          ✕
        </button>

        <h2 className="text-2xl mb-4 font-bold">Admin Panel</h2>

        {loading ? (
          <p>Loading orders...</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-800">
                <th className="p-2 border border-gray-700">Ref</th>
                <th className="p-2 border border-gray-700">Pixels</th>
                <th className="p-2 border border-gray-700">Amount</th>
                <th className="p-2 border border-gray-700">Proof</th>
                <th className="p-2 border border-gray-700">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="odd:bg-gray-800/40">
                  <td className="p-2 border border-gray-700">{o.reference}</td>
                  <td className="p-2 border border-gray-700">
                    {o.pixel_ids.join(", ")}
                  </td>
                  <td className="p-2 border border-gray-700">${o.amount_usd}</td>
                  <td className="p-2 border border-gray-700 text-center">
                    {o.payment_proof_url ? (
                      <a
                        href={o.payment_proof_url}
                        className="text-blue-400 underline"
                        target="_blank"
                      >
                        View
                      </a>
                    ) : (
                      "No proof"
                    )}
                  </td>
                  <td className="p-2 border border-gray-700">
                    {o.status !== "paid" ? (
                      <button
                        onClick={() => markPaid(o.id)}
                        className="bg-green-600 px-3 py-1 rounded"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <span className="text-green-400">Paid</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
