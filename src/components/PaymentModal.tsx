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

  const [perPixel, setPerPixel] = useState(
    pixelIds.map(id => ({
      id,
      color: '#ff0000',
      link: ''
    }))
  );

  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const reserve = async () => {
    setLoading(true);
    try {
      const payload =
        mode === 'sync'
          ? {
              pixelIds,
              pixels: pixelIds.map(id => ({
                id,
                color: syncColor,
                link: syncLink
              }))
            }
          : {
              pixelIds,
              pixels: perPixel
            };

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Reservation failed');

      const data = await res.json();
      setReference(data.reference);
    } catch {
      alert('Reservation failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded w-full max-w-lg text-white overflow-y-auto max-h-[90vh]">
        {!reference ? (
          <>
            <h2 className="text-xl mb-3">
              Buy {pixelIds.length} pixel{pixelIds.length > 1 ? 's' : ''}
            </h2>

            {/* MODE SWITCH */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setMode('sync')}
                className={`flex-1 py-1 rounded ${
                  mode === 'sync' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                Same for all
              </button>
              <button
                onClick={() => setMode('individual')}
                className={`flex-1 py-1 rounded ${
                  mode === 'individual' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                Per pixel
              </button>
            </div>

            {/* SYNC MODE */}
            {mode === 'sync' && (
              <>
                <label className="block mb-3">
                  Color
                  <input
                    type="color"
                    value={syncColor}
                    onChange={e => setSyncColor(e.target.value)}
                    className="block mt-1"
                  />
                </label>

                <label className="block mb-4">
                  Link
                  <input
                    value={syncLink}
                    onChange={e => setSyncLink(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full bg-gray-800 border border-gray-600 rounded px-2 py-1 mt-1"
                  />
                </label>
              </>
            )}

            {/* INDIVIDUAL MODE */}
            {mode === 'individual' && (
              <div className="space-y-4">
                {perPixel.map((p, i) => (
                  <div key={p.id} className="bg-gray-800 p-3 rounded">
                    <div className="mb-1">Pixel #{p.id}</div>
                    <input
                      type="color"
                      value={p.color}
                      onChange={e => {
                        const next = [...perPixel];
                        next[i].color = e.target.value;
                        setPerPixel(next);
                      }}
                    />
                    <input
                      value={p.link}
                      onChange={e => {
                        const next = [...perPixel];
                        next[i].link = e.target.value;
                        setPerPixel(next);
                      }}
                      placeholder="https://example.com"
                      className="block w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 mt-2"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-6">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 py-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={reserve}
                disabled={loading}
                className="flex-1 bg-green-600 py-2 rounded"
              >
                {loading ? 'Reserving…' : `Reserve ($${pixelIds.length})`}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-xl mb-3">Payment Instructions</h2>

            <div className="bg-black p-3 rounded mb-4">
              <div className="text-gray-400 text-sm">Reference</div>
              <div className="font-mono text-green-400">{reference}</div>
            </div>

            <div className="bg-gray-800 p-3 rounded text-sm mb-4">
              <p className="font-semibold mb-1">Bank Transfer</p>
              <p>Bank: YOUR BANK</p>
              <p>Account Name: YOUR NAME</p>
              <p>Account Number: XXXXXXXX</p>
            </div>

            <div className="bg-gray-800 p-3 rounded text-sm mb-4">
              <p className="font-semibold mb-1">Crypto (USDT)</p>
              <p>Network: TRC20</p>
              <p className="break-all">Address: YOUR_USDT_ADDRESS</p>
            </div>

            <button
              onClick={onClose}
              className="w-full bg-green-600 py-2 rounded"
            >
              I’ve Paid
            </button>
          </>
        )}
      </div>
    </div>
  );
}
