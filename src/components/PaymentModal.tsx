import React, { useState } from 'react';

interface Props {
  pixelIds: number[];
  onClose: () => void;
}

type Mode = 'sync' | 'individual';

export default function PaymentModal({ pixelIds, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('sync');
  const [syncColor, setSyncColor] = useState('#ff0000');
  const [syncLink, setSyncLink] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reserve = async () => {
    setLoading(true);
    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pixelIds, syncColor, syncLink })
    });
    const data = await res.json();
    setReference(data.reference);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded w-full max-w-md text-white">
        {!reference ? (
          <>
            <h2 className="text-xl mb-4">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? 's' : ''}
            </h2>

            <input type="color" value={syncColor} onChange={e => setSyncColor(e.target.value)} />
            <input
              className="block w-full mt-3 bg-gray-800 border px-2 py-1"
              placeholder="https://example.com"
              value={syncLink}
              onChange={e => setSyncLink(e.target.value)}
            />

            <button
              onClick={reserve}
              disabled={loading}
              className="w-full mt-4 bg-green-600 py-2 rounded"
            >
              {loading ? 'Reserving…' : `Reserve ($${pixelIds.length})`}
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl mb-3">Payment Instructions</h2>
            <div className="bg-black p-3 rounded mb-4">
              Reference: <span className="text-green-400">{reference}</span>
            </div>

            <p>Bank: YOUR BANK</p>
            <p>Account: XXXXXXXX</p>
            <p className="mt-2">Crypto (USDT): YOUR_ADDRESS</p>

            <button onClick={onClose} className="w-full mt-4 bg-blue-600 py-2 rounded">
              I’ve Paid
            </button>
          </>
        )}
      </div>
    </div>
  );
}
