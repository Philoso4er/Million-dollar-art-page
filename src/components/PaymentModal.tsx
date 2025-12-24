import React, { useState } from 'react';

interface Props {
  pixelId: number;
  onClose: () => void;
  onReserved: (reference: string) => void;
}

export default function PaymentModal({ pixelId, onClose, onReserved }: Props) {
  const [color, setColor] = useState('#ff0000');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);

  const reservePixel = async () => {
    if (!link.startsWith('http')) {
      alert('Please enter a valid link (https://…)');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pixelIds: [pixelId],
        color,
        link
      })
    });

    setLoading(false);

    if (!res.ok) {
      alert('Reservation failed');
      return;
    }

    const data = await res.json();
    setReference(data.reference);
    onReserved(data.reference);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-gray-900 text-white w-full max-w-md rounded-xl p-6 border border-gray-700">
        {!reference ? (
          <>
            <h2 className="text-xl font-bold mb-4">
              Buy Pixel #{pixelId}
            </h2>

            <div className="mb-4">
              <label className="block text-sm mb-1">Pixel color</label>
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-full h-10 rounded"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm mb-1">Link</label>
              <input
                type="url"
                placeholder="https://example.com"
                value={link}
                onChange={e => setLink(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600"
              />
            </div>

            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-300">Price</span>
              <span className="font-bold">$1</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={reservePixel}
                disabled={loading}
                className="flex-1 bg-blue-600 py-2 rounded font-semibold"
              >
                {loading ? 'Reserving…' : 'Reserve & Pay'}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-4">
              Payment Instructions
            </h2>

            <p className="text-sm text-gray-300 mb-3">
              Send <strong>$1</strong> via bank transfer using the reference below.
            </p>

            <div className="bg-black rounded p-3 mb-4 text-sm">
              <div><strong>Reference:</strong></div>
              <div className="text-green-400 font-mono">{reference}</div>
            </div>

            <div className="bg-gray-800 rounded p-3 text-sm mb-4">
              <p><strong>Bank:</strong> Wise (or local equivalent)</p>
              <p><strong>Account name:</strong> Your Name</p>
              <p><strong>Account number:</strong> XXXX-XXXX</p>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              Your pixel will be finalized after payment is confirmed.
            </p>

            <button
              onClick={onClose}
              className="w-full bg-green-600 py-2 rounded font-semibold"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
