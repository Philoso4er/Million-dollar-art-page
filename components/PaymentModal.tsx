import React, { useState } from "react";
import FlutterwaveCheckout from "flutterwave-react-v3";

interface Props {
  pixelIds: number[];
  onClose: () => void;
}

export default function PaymentModal({ pixelIds, onClose }: Props) {
  const [color, setColor] = useState("#ff0000");
  const [link, setLink] = useState("");
  const [reference, setReference] = useState<string | null>(null);

  const reserve = async () => {
    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pixelIds, color, link }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Reservation failed");
      return;
    }

    setReference(data.reference);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded w-full max-w-md border border-gray-700">
        {!reference ? (
          <>
            <h2 className="text-xl mb-4">Buy {pixelIds.length} pixels</h2>

            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
            <input
              className="w-full mt-3 bg-gray-800 border p-2"
              placeholder="https://example.com"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />

            <div className="flex gap-2 mt-4">
              <button onClick={onClose} className="flex-1 bg-gray-700 p-2">
                Cancel
              </button>
              <button onClick={reserve} className="flex-1 bg-green-600 p-2">
                Reserve
              </button>
            </div>
          </>
        ) : (
          <>
            <FlutterwaveCheckout
              public_key={import.meta.env.VITE_FLW_PUBLIC_KEY}
              tx_ref={reference}
              amount={pixelIds.length}
              currency="USD"
              payment_options="card,banktransfer"
              customer={{ email: "buyer@pixel.art" }}
              customizations={{ title: "Million Pixel Art" }}
              callback={() => alert("Payment processing…")}
              onClose={onClose}
            />

            <div className="mt-4 text-sm">
              <p>Crypto (manual):</p>
              <p className="break-all text-green-400">
                FcUQAQRfwo3mdUhchU1y4txpnPUEZEgYe98LesmAxdXM
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
