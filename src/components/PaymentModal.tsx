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
  const [error, setError] = useState<string | null>(null);

  const reserve = async () => {
    setError(null);

    if (!syncLink.trim()) {
      setError('Link is required (can be any valid URL)');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pixelIds,
          color: syncColor,
          link: syncLink
        })
      });

      if (!res.ok) {
        throw new Error('Reservation failed');
      }

      const data = await res.json();
      setReference(data.reference);
    } catch (err) {
      setError('Could not reserve pixels. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="relative bg-gray-900 p-6 rounded-xl w-full max-w-md text-white border border-gray-700 shadow-xl">

        {/* ❌ CLOSE BUTTON — ALWAYS AVAILABLE */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-lg"
          aria-label="Close"
        >
          ✕
        </button>

        {!reference ? (
          <>
            <h2 className="text-xl font-bold mb-4">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? 's' : ''}
            </h2>

            {/* MODE (future-proofed, sync default) */}
            <div className="mb-4 text-sm text-gray-400">
              Color & link will apply to all selected pixels
            </div>

            {/* COLOR */}
            <label className="block text-sm mb-1">Pixel color</label>
            <input
              type="color"
              value={syncColor}
              onChange={e => setSyncColor(e.target.value)}
              className="w-full h-10 rounded mb-4"
            />

            {/* LINK */}
            <label className="block text-sm mb-1">Link</label>
            <input
              className="block w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 mb-2"
              placeholder="example.com or https://example.com"
              value={syncLink}
              onChange={e => setSyncLink(e.target.value)}
            />

            {error && (
              <div className="text-red-400 text-sm mb-2">{error}</div>
            )}

            <button
              onClick={reserve}
              disabled={loading}
              className="w-full mt-4 bg-green-600 hover:bg-green-500 py-2 rounded font-semibold"
            >
              {loading
                ? 'Reserving…'
                : `Reserve (${pixelIds.length} × $1 = $${pixelIds.length})`}
            </button>

            {/* BACK */}
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
              <div className="text-gray-400 mb-1">Payment reference</div>
              <div className="text-green-400 font-mono select-all text-lg">
                {reference}
              </div>
            </div>

            {/* BANK */}
            <div className="bg-gray-800 p-3 rounded text-sm mb-3">
              <div className="font-semibold mb-1">🏦 Bank Transfer</div>
              <p><strong>Bank:</strong> YOUR BANK</p>
              <p><strong>Account Name:</strong> YOUR NAME</p>
              <p><strong>Account Number:</strong> XXXXXXXX</p>
            </div>

            {/* CRYPTO */}
            <div className="bg-gray-800 p-3 rounded text-sm mb-4">
              <div className="font-semibold mb-1">💎 Crypto (USDT / SOL / ETH)</div>
              <p className="break-all">YOUR_CRYPTO_ADDRESS</p>
            </div>

            <p className="text-xs text-yellow-400 mb-4">
              ⚠️ Use the exact reference or payment may not be credited.
            </p>

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
