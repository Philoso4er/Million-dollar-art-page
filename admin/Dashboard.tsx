import React, { useState } from "react";
import Orders from "./Orders";
import Pixels from "./Pixels";

export default function Dashboard() {
  const [tab, setTab] = useState<"orders" | "pixels">("orders");

  return (
    <div className="h-screen w-screen bg-black text-white flex flex-col">
      <header className="p-4 bg-gray-900 border-b border-gray-700 flex justify-between">
        <h1 className="text-xl font-bold">Admin Dashboard</h1>

        <button
          onClick={() => {
            localStorage.removeItem("admin_auth");
            window.location.reload();
          }}
          className="bg-red-600 px-3 py-1 rounded"
        >
          Logout
        </button>
      </header>

      <div className="flex gap-3 p-3 bg-gray-800 border-b border-gray-700">
        <button
          onClick={() => setTab("orders")}
          className={tab === "orders" ? "bg-blue-600 px-3 py-1 rounded" : "px-3 py-1"}
        >
          Orders
        </button>

        <button
          onClick={() => setTab("pixels")}
          className={tab === "pixels" ? "bg-blue-600 px-3 py-1 rounded" : "px-3 py-1"}
        >
          Pixels
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === "orders" ? <Orders /> : <Pixels />}
      </div>
    </div>
  );
}
