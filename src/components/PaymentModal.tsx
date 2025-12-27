import React, { useState } from 'react';

interface Props {
  pixelIds: number[];
  onClose: () => void;
}

export default function PaymentModal({ pixelIds, onClose }: Props) {
  const [reference, setReference] = useState<string | null>(null);

  const reserve = async () => {
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pixelIds })
    });

    const data = await res.json();
    setReference(data.reference);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded max-w-md w-full">
        {!reference ? (
          <>
            <h2 className="text-lg mb-4">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? 's' : ''}
            </h2>
            <p>Total: ${pixelIds.length}</p>
            <button
              onClick={reserve}
              className="w-full bg-blue-600 mt-4 py-2 rounded"
            >
              Reserve & Pay
            </button>
          </>
        ) : (
          <>
            <h2 className="text-lg mb-2">Payment Reference</h2>
            <div className="font-mono bg-black p-2 mb-4">{reference}</div>
            <button onClick={onClose} className="w-full bg-green-600 py-2 rounded">
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
