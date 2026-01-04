import React, { useState } from 'react';

interface Props {
  pixelIds: number[];
  onClose: () => void;
}

type Mode = 'sync' | 'individual';

interface PixelInput {
  color: string;
  link: string;
}

export default function PaymentModal({ pixelIds, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('sync');

  // Sync mode
  const [syncColor, setSyncColor] = useState('#ff0000');
  const [syncLink, setSyncLink] = useState('');

  // Individual mode
  const [individual, setIndividual] = useState<Record<number, PixelInput>>(
    () =>
      Object.fromEntries(
        pixelIds.map(id => [id, { color: '#ff0000', link: '' }])
      )
  );

  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------- UPDATE INDIVIDUAL ---------- */
  const updateIndividual = (
    id: number,
    field: 'color' | 'link',
    value: string
  ) => {
    setIndividual(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value }
    }));
  };

  /* ---------- RESERVE ---------- */
  const reserve = async () => {
    setError(null);

    // Validation
    if (mode === 'sync') {
      if (!syncLink.trim()) {
        setError('Link is required');
        return;
      }
    } else {
      for (const id of pixelIds) {
        if (!individual[id].link.trim()) {
          setError(`Pixel #${id} is missing a link`);
          return;
        }
      }
    }

    setLoading(true);

    try {
      const payload =
        mode === 'sync'
          ? {
              pixelIds,
              mode: 'sync',
              color: syncColor,
              link: syncLink
            }
          : {
              pixelIds,
              mode: 'individual',
              data: individual
            };

      const res = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setReference(data.reference);
    } catch {
      setError('Reservation failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="relative bg-gray-900 p-6 rounded-xl w-full max-w-lg text-white border border-gray-700 shadow-xl">

        {/* CLOSE */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-white text-lg"
        >
          ✕
        </button>

        {!reference ? (
          <>
            <h2 className="text-xl font-bold mb-3">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? 's' : ''}
            </h2>

            {/* MODE TOGGLE */}
            {pixelIds.length > 1 && (
              <div className="flex mb-4 rounded overflow-hidden border border-gray-600">
                <button
                  onClick={() => setMode('sync')}
                  className={`flex-1 py-2 text-sm ${
                    mode === 'sync'
                      ? 'bg-blue-600'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  Sync all
                </button>
                <button
                  onClick={() => setMode('individual')}
                  className={`flex-1 py-2 text-sm ${
                    mode === 'individual'
                      ? 'bg-blue-600'
                      : 'bg-gray-800 hover:bg-gray-700'
                  }`}
                >
                  Individual
                </button>
              </div>
            )}

            {/* SYNC MODE */}
            {mode === 'sync' && (
              <>
                <label className="block text-sm mb-1">Color (all pixels)</label>
                <input
                  type="color"
                  value={syncColor}
                  onChange={e => setSyncColor(e.target.value)}
                  className="w-full h-10 rounded mb-4"
                />

                <label className="block text-sm mb-1">Link (all pixels)</label>
                <input
                  className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2"
                  placeholder="example.com"
                  value={syncLink}
                  onChange={e => setSyncLink(e.target.value)}
                />
              </>
            )}

            {/* INDIVIDUAL MODE */}
            {mode === 'individual' && (
              <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3">
                {pixelIds.map(id => (
                  <div
                    key={id}
                    className="bg-gray-800 border border-gray-600 rounded p-3"
                  >
                    <div className="font-semibold mb-2">Pixel #{id}</div>

                    <input
                      type="color"
                      value={individual[id].color}
                      onChange={e =>
                        updateIndividual(id, 'color', e.target.value)
                      }
                      className="w-full h-8 rounded mb-2"
                    />

                    <input
                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
                      placeholder="example.com"
                      value={individual[id].link}
                      onChange={e =>
                        updateIndividual(id, 'link', e.target.value)
                      }
                    />
                  </div>
                ))}
              </div>
            )}

            {error && (
              <div className="text-red-400 text-sm mt-3">{error}</div>
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

            <div className="bg-gray-800 p-3 rounded text-sm mb-3">
              <div className="font-semibold mb-1">🏦 Bank Transfer</div>
              <p><strong>Bank:</strong> YOUR BANK</p>
              <p><strong>Account Name:</strong> YOUR NAME</p>
              <p><strong>Account Number:</strong> XXXXXXXX</p>
            </div>

            <div className="bg-gray-800 p-3 rounded text-sm mb-4">
              <div className="font-semibold mb-1">💎 Crypto</div>
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
