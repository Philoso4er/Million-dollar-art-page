import React, { useEffect, useState } from "react";

interface Props {
  pixelIds: number[];
  onClose: () => void;
}

type Mode = "sync" | "individual";

export default function PaymentModal({ pixelIds, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("sync");
  const [syncColor, setSyncColor] = useState("#ff0000");
  const [syncLink, setSyncLink] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Load Flutterwave SDK
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.flutterwave.com/v3.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  const reserveAndPay = async () => {
    setLoading(true);

    // Create backend reservation
    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pixelIds,
        color: syncColor,
        link: syncLink,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "Reservation failed");
      return;
    }

    setReference(data.reference);

    // Now open Flutterwave inline popup
    // @ts-ignore
    FlutterwaveCheckout({
      public_key: process.env.FLW_PUBLIC_KEY,
      tx_ref: data.reference,
      amount: pixelIds.length,
      currency: "USD",
      payment_options: "card,banktransfer,ussd",
      customer: {
        email: "buyer@millionpixel.com",
      },
      customizations: {
        title: "Million Dollar Art",
        description: `Purchase of ${pixelIds.length} pixels`,
      },
      callback: function (payment: any) {
        // Close modal
        alert("Payment received! Your order is being confirmed.");
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-xl w-full max-w-lg border border-gray-700">
        <h2 className="text-xl font-bold mb-4 text-white">
          Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? "s" : ""}
        </h2>

        {/* SYNC COLOR & LINK */}
        <label className="block text-sm mb-1 text-white">Color</label>
        <input
          type="color"
          value={syncColor}
          onChange={(e) => setSyncColor(e.target.value)}
          className="w-full h-10 rounded mb-4"
        />

        <label className="block text-sm mb-1 text-white">Link</label>
        <input
          type="url"
          placeholder="https://example.com"
          value={syncLink}
          onChange={(e) => setSyncLink(e.target.value)}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded mb-4 text-white"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded bg-gray-700 text-white"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={reserveAndPay}
            className="flex-1 py-2 rounded bg-green-600 font-bold text-white"
          >
            {loading ? "Reserving…" : `Pay $${pixelIds.length}`}
          </button>
        </div>
      </div>
    </div>
  );
}
