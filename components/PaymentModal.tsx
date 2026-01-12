import React, { useState } from "react";

interface Props {
  pixelIds: number[];
  onClose: () => void;
}

export default function PaymentModal({ pixelIds, onClose }: Props) {
  const [color, setColor] = useState("#ff0000");
  const [link, setLink] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reserve = async () => {
    setLoading(true);

    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pixelIds,
        color,
        link,
      }),
    });

    if (!res.ok) {
      alert("Reservation failed");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setReference(data.reference);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-xl w-full max-w-md text-white border border-gray-700">

        {/* No payment created yet */}
        {!reference ? (
          <>
            <h2 className="text-xl font-bold mb-4">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? "s" : ""}
            </h2>

            {/* Color */}
            <label className="block text-sm mb-1">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-full h-10 rounded mb-4"
            />

            {/* Link */}
            <label className="block text-sm mb-1">Link</label>
            <input
              type="url"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded mb-4"
              placeholder="https://example.com"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 py-2 rounded bg-gray-700"
              >
                Cancel
              </button>

              <button
                disabled={loading}
                onClick={reserve}
                className="flex-1 py-2 rounded bg-green-600 font-bold"
              >
                {loading ? "Reserving…" : `Reserve $${pixelIds.length}`}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Payment instructions */}
            <h2 className="text-xl font-bold mb-4">Payment Instructions</h2>

            <div className="bg-black p-3 rounded border border-gray-700 mb-4">
              <p className="text-sm text-gray-300">Reference</p>
              <p className="text-green-400 font-mono text-lg">{reference}</p>
            </div>

            <h3 className="font-bold mb-2">Pay with Flutterwave</h3>
            <a
              href={`https://flutterwave.com/pay/${reference}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-yellow-600 py-2 rounded mb-4 font-semibold"
            >
              Pay Now
            </a>

            <h3 className="font-bold mb-2">Crypto (USDT/SOL)</h3>
            <p className="text-sm mb-1">Solana:</p>
            <p className="text-green-300 break-all mb-2">
              FcUQAQRfwo3mdUhchU1y4txpnPUEZEgYe98LesmAxdXM
            </p>

            <p className="text-sm mb-1">Ethereum / BSC / Polygon:</p>
            <p className="text-green-300 break-all mb-6">
              0x960e43d6d46B6D61A3888b632C4c008d0A688443
            </p>

            <button
              onClick={onClose}
              className="w-full py-2 rounded bg-blue-600 font-semibold"
            >
              I’ve Paid
            </button>
          </>
        )}
      </div>
    </div>
  );
}
