import React, { useState } from "react";

interface Props {
  pixelIds: number[];
  onClose: () => void;
}

export default function PaymentModal({ pixelIds, onClose }: Props) {
  const [color, setColor] = useState("#ff0000");
  const [link, setLink] = useState("");
  const [reference, setReference] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const amount = pixelIds.length;

  const reserveOrder = async () => {
    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pixelIds, color, link }),
    });

    const data = await res.json();
    if (!res.ok) {
      alert("Reservation failed");
      return;
    }

    setReference(data.reference);
  };

  const uploadProof = async () => {
    if (!proofFile || !reference) return;

    const form = new FormData();
    form.append("reference", reference);
    form.append("file", proofFile);

    const res = await fetch("/api/submit-proof", { method: "POST", body: form });

    if (res.ok) alert("Proof submitted");
    else alert("Upload failed");
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded w-full max-w-md text-white border border-gray-700">
        
        {/* Close */}
        <button onClick={onClose} className="absolute top-4 right-4 text-xl">
          ✕
        </button>

        {!reference ? (
          <>
            <h2 className="text-xl mb-4 font-bold">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? "s" : ""}
            </h2>

            {/* Color */}
            <label>Pixel Color</label>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-12 rounded mt-1" />

            {/* Link */}
            <label className="mt-3 block">Link</label>
            <input
              value={link}
              placeholder="https://example.com"
              onChange={e => setLink(e.target.value)}
              className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-2"
            />

            {/* Reserve Button */}
            <button
              onClick={reserveOrder}
              className="w-full bg-green-600 py-2 rounded mt-4 font-semibold"
            >
              Reserve & Pay (${amount})
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl mb-4 font-bold">Payment Instructions</h2>

            <div className="bg-black p-3 rounded border border-gray-700 mb-4">
              Reference: <span className="text-green-400">{reference}</span>
            </div>

            {/* Flutterwave */}
            <h3 className="font-bold mb-1">Pay with Flutterwave</h3>
            <p className="text-sm mb-2">Use your card or mobile money:</p>

            <button
              className="bg-yellow-500 w-full py-2 rounded mb-4 font-semibold"
              onClick={() => {
                // open Flutterwave modal
                window.location.href = `https://flutterwave.com/pay/${reference}`;
              }}
            >
              Pay Automatically
            </button>

            {/* Crypto Instructions */}
            <h3 className="font-bold mt-4 mb-1">Pay with Crypto</h3>
            <p>Solana: <span className="text-blue-400">FcUQAQRfwo3mdUhchU1y4txpnPUEZEgYe98LesmAxdXM</span></p>
            <p>Ethereum/BNB: <span className="text-blue-400">0x960e43d6d46B6D61A3888b632C4c008d0A688443</span></p>

            {/* File Upload */}
            <h3 className="font-bold mt-4 mb-1">Upload Payment Proof</h3>
            <input type="file" className="mb-3" onChange={e => setProofFile(e.target.files?.[0] ?? null)} />

            <button onClick={uploadProof} className="bg-blue-600 w-full py-2 rounded">
              Submit Proof
            </button>
          </>
        )}
      </div>
    </div>
  );
}
