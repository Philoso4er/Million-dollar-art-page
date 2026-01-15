import React, { useEffect, useState } from "react";

export default function Pixels() {
  const [stats, setStats] = useState({ free: 0, reserved: 0, sold: 0 });

  const loadStats = async () => {
    const res = await fetch("/api/admin/pixels");
    const data = await res.json();
    setStats(data);
  };

  useEffect(() => loadStats(), []);

  return (
    <div className="p-4">
      <h2 className="text-lg mb-4">Pixel Statistics</h2>

      <div className="bg-gray-900 p-4 rounded border border-gray-700">
        <p>Free: {stats.free}</p>
        <p>Reserved: {stats.reserved}</p>
        <p>Sold: {stats.sold}</p>
      </div>
    </div>
  );
}
