import React, { useEffect, useState } from "react";
import OrderDetails from "./OrderDetails";

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  const loadOrders = async () => {
    const res = await fetch("/api/admin/orders");
    const data = await res.json();
    setOrders(data.orders);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  if (selected) {
    return <OrderDetails order={selected} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="p-4">
      <h2 className="text-lg mb-4">Pending Orders</h2>

      {orders.length === 0 && <div>No orders yet</div>}

      {orders.map((o) => (
        <div
          key={o.id}
          className="p-3 bg-gray-900 border border-gray-700 rounded mb-3 cursor-pointer"
          onClick={() => setSelected(o)}
        >
          <div className="font-bold">{o.reference}</div>
          <div className="text-sm text-gray-400">
            {o.pixel_ids.length} pixels — {o.status}
          </div>
        </div>
      ))}
    </div>
  );
}
