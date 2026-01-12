import React, { useEffect, useState } from "react";

export default function AdminPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updateMessage, setUpdateMessage] = useState("");

  const loadOrders = async () => {
    setLoading(true);

    // Trigger cleanup first (no cron needed)
    await fetch("/api/admin/expire-orders", {
      method: "POST",
    });

    const res = await fetch("/api/admin/orders");
    const data = await res.json();

    setOrders(data.orders || []);
    setLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const markPaid = async (id: string) => {
    const res = await fetch("/api/admin/mark-paid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id }),
    });

    if (!res.ok) {
      alert("Failed to mark paid");
      return;
    }

    setUpdateMessage("Order marked as PAID successfully");
    loadOrders();
  };

  const attachProof = async (id: string) => {
    const url = prompt("Enter proof image URL or transaction link");
    if (!url) return;

    const res = await fetch("/api/admin/attach-proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, proofUrl: url }),
    });

    if (!res.ok) {
      alert("Failed to attach proof");
      return;
    }

    setUpdateMessage("Proof added successfully");
    loadOrders();
  };

  return (
    <div className="p-6 bg-gray-950 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>

      {updateMessage && (
        <div className="bg-green-700 p-3 rounded mb-4">{updateMessage}</div>
      )}

      {loading ? (
        <p>Loading orders…</p>
      ) : orders.length === 0 ? (
        <p>No orders found.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="border border-gray-700 p-4 bg-gray-900 rounded"
            >
              <h2 className="font-bold text-lg mb-2">
                Order #{o.reference} -{" "}
                <span
                  className={
                    o.status === "paid"
                      ? "text-green-400"
                      : o.status === "pending"
                      ? "text-yellow-300"
                      : "text-red-400"
                  }
                >
                  {o.status.toUpperCase()}
                </span>
              </h2>

              <p className="text-sm text-gray-300 mb-2">
                Pixels: {o.pixel_ids.join(", ")}
              </p>

              {o.color && (
                <p className="text-sm">
                  Color: <span style={{ color: o.color }}>{o.color}</span>
                </p>
              )}

              {o.link && (
                <p className="text-sm break-all">
                  Link:{" "}
                  <a
                    href={o.link}
                    target="_blank"
                    className="text-blue-400 underline"
                  >
                    {o.link}
                  </a>
                </p>
              )}

              <p className="text-sm mt-2">Amount: ${o.amount_usd}</p>

              <p className="text-xs text-gray-500 mt-2">
                Created: {new Date(o.created_at).toLocaleString()}
              </p>

              <p className="text-xs text-gray-500">
                Expires: {new Date(o.expires_at).toLocaleString()}
              </p>

              {o.payment_proof_url && (
                <p className="text-xs mt-2 break-all">
                  Proof:{" "}
                  <a
                    href={o.payment_proof_url}
                    className="text-yellow-400 underline"
                    target="_blank"
                  >
                    {o.payment_proof_url}
                  </a>
                </p>
              )}

              {/* Buttons */}
              <div className="mt-4 flex gap-3">
                {o.status !== "paid" && (
                  <button
                    onClick={() => markPaid(o.id)}
                    className="bg-green-700 px-3 py-1 rounded"
                  >
                    Mark Paid
                  </button>
                )}

                <button
                  onClick={() => attachProof(o.id)}
                  className="bg-blue-700 px-3 py-1 rounded"
                >
                  Add Proof
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
