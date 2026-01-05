import React, { useState } from 'react';

interface Props {
  pixelIds: number[];
  onClose: () => void;
}

type Mode = 'sync' | 'individual';

export default function PaymentModal({ pixelIds, onClose }: Props) {
  const [mode] = useState<Mode>('sync'); // keep sync for now
  const [color, setColor] = useState('#ff0000');
  const [link, setLink] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reserve = async () => {
    setError(null);

    if (!link.trim()) {
      setError('Please enter a link');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixelIds,
          mode,
          color,
          link,
          paymentNote
        })
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }

      const data = await res.json();
      setReference(data.reference);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message || 'Reservation failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="relative bg-gray-900 p-6 rounded-xl w-full max-w-md text-white border border-gray-700">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white"
        >
          ✕
        </button>

        {!reference ? (
          <>
            <h2 className="text-xl font-bold mb-4">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? 's' : ''}
            </h2>

            <label className="block text-sm mb-1">Color</label>
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="w-full h-10 rounded mb-3"
            />

            <label className="block text-sm mb-1">Link</label>
            <input
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 mb-3"
              placeholder="example.com"
              value={link}
              onChange={e => setLink(e.target.value)}
            />

            {error && (
              <div className="text-red-400 text-sm mb-2">{error}</div>
            )}

            <button
              onClick={reserve}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-500 py-2 rounded font-semibold"
            >
              {loading ? 'Reserving…' : `Reserve ($${pixelIds.length})`}
            </button>

            <button
              onClick={onClose}
              className="w-full mt-2 bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold mb-3">Payment Instructions</h2>

            <div className="bg-black p-3 rounded mb-4 text-sm">
              <div className="text-gray-400">Payment Reference</div>
              <div className="text-green-400 font-mono text-lg select-all">
                {reference}
              </div>
            </div>

            <div className="bg-gray-800 p-3 rounded text-sm mb-3">
              <strong>🏦 Bank Transfer</strong>
              <p>Bank: YOUR BANK</p>
              <p>Account Name: YOUR NAME</p>
              <p>Account Number: XXXXXXXX</p>
            </div>

            <div className="bg-gray-800 p-3 rounded text-sm mb-3">
              <strong>💎 Crypto</strong>
              <p className="break-all">YOUR_CRYPTO_ADDRESS</p>
            </div>

            <label className="block text-sm mb-1">
              Payment proof (transaction link / note)
            </label>
            <textarea
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-sm mb-3"
              rows={3}
              placeholder="Paste transaction hash or bank alert details"
              value={paymentNote}
              onChange={e => setPaymentNote(e.target.value)}
            />

            <button
              onClick={onClose}
              className="w-full bg-blue-600 hover:bg-blue-500 py-2 rounded font-semibold"
            >
              Done / Back to grid
            </button>
          </>
        )}
      </div>
    </div>
  );
}
