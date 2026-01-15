import React from "react";

export default function OrderDetails({ order, onBack }: any) {
  const markPaid = async () => {
    await fetch("/api/admin/update-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });

    alert("Order marked as PAID and pixels updated!");
    onBack();
  };

  return (
    <div className="p-4">
      <button onClick={onBack} className="mb-4 bg-gray-700 px-3 py-1 rounded">
        Back
      </button>

      <h2 className="text-lg font-bold mb-4">Order Details</h2>

      <div className="bg-gray-900 p-3 rounded border border-gray-700">
        <p><b>Reference:</b> {order.reference}</p>
        <p><b>Status:</b> {order.status}</p>
        <p><b>Pixels:</b> {order.pixel_ids.join(", ")}</p>
        <p><b>Amount:</b> ${order.amount_usd}</p>
        <p><b>Color:</b> {order.color}</p>
        <p><b>Link:</b> {order.link}</p>
      </div>

      <button
        onClick={markPaid}
        className="mt-4 w-full bg-green-600 py-2 rounded font-bold"
      >
        Mark as Paid
      </button>
    </div>
  );
}
