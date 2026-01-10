import React, { useState } from "react";

interface Props {
  pixelIds: number[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentModal({ pixelIds, onClose, onSuccess }: Props) {
  const [color, setColor] = useState("#ff0000");
  const [link, setLink] = useState("https://");
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
        link
      })
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert("Reservation failed. Try again.");
      return;
    }

    setReference(data.reference);
  };

  const startFlutterwave = () => {
    // @ts-ignore
    FlutterwaveCheckout({
      public_key: "FLWPUBK-75c6f8d8a4138d8a1bf38ffc35dd97b9-X",
      tx_ref: reference!,
      amount: pixelIds.length,
      currency: "USD",
      customer: {
        email: "customer@example.com"
      },
      callback: (response: any) => {
        alert("Payment complete: " + response.status);
        onSuccess();
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-700 p-6 rounded-xl w-full max-w-md text-white">

        {!reference ? (
          <>
            <h2 className="text-xl font-bold mb-4">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? "s" : ""}
            </h2>

            <label className="text-sm">Color</label>
            <input type="color" className="w-full h-10" value={color} onChange={e => setColor(e.target.value)} />

            <label className="text-sm mt-3 block">Link</label>
            <input
              type="url"
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1"
              value={link}
              onChange={e => setLink(e.target.value)}
            />

            <button
              onClick={reserve}
              disabled={loading}
              className="w-full mt-4 bg-green-600 py-2 rounded"
            >
              {loading ? "Reserving..." : `Reserve ($${pixelIds.length})`}
            </button>

            <button
              onClick={onClose}
              className="w-full mt-2 bg-gray-600 py-2 rounded"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl mb-2">Complete Payment</h2>

            <div className="bg-black border border-gray-700 p-3 rounded mb-4">
              <p className="text-sm text-gray-300">Payment Reference</p>
              <p className="font-mono text-green-400 text-lg">{reference}</p>
            </div>

            <button
              onClick={startFlutterwave}
              className="w-full bg-blue-600 py-2 rounded mb-3"
            >
              Pay with Flutterwave
            </button>

            <p className="text-sm text-gray-300 mb-2">OR Pay with Crypto</p>

            <div className="bg-gray-800 p-3 rounded text-sm">
              <p><strong>USDT (Solana):</strong></p>
              <p className="text-green-400 font-mono">
                FcUQAQRfwo3mdUhchU1y4txpnPUEZEgYe98LesmAxdXM
              </p>

              <p className="mt-3"><strong>ETH/BSC/Polygon:</strong></p>
              <p className="text-yellow-400 font-mono break-all">
                0x960e43d6d46B6D61A3888b632C4c008d0A688443
              </p>
            </div>

            <button
              onClick={onSuccess}
              className="w-full bg-green-700 py-2 rounded mt-4"
            >
              I Have Paid
            </button>

            <button
              onClick={onClose}
              className="w-full bg-gray-600 py-2 rounded mt-2"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
}
