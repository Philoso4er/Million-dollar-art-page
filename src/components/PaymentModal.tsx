import React, { useState, useEffect } from 'react';

interface Props {
  pixelId: number;
  onClose: () => void;
  onReserved: (reference: string) => void;
}

type Region = 'NG' | 'INTL';
type PayMethod = 'BANK' | 'CRYPTO';

export default function PaymentModal({ pixelId, onClose, onReserved }: Props) {
  const [color, setColor] = useState('#ff0000');
  const [link, setLink] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [region, setRegion] = useState<Region>('INTL');
  const [method, setMethod] = useState<PayMethod>('BANK');

  // Auto-detect Nigeria
  useEffect(() => {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      if (locale.toLowerCase().includes('ng')) setRegion('NG');
    } catch {}
  }, []);

  const reservePixel = async () => {
    if (!link.startsWith('http')) {
      alert('Enter a valid link');
      return;
    }
    if (email && !email.includes('@')) {
      alert('Invalid email');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pixelIds: [pixelId],
        color,
        link,
        email
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
            <h2 className="text-xl font-bold mb-4">Buy Pixel #{pixelId}</h2>

            <div className="mb-3">
              <label className="block text-sm mb-1">Pixel color</label>
              <input type="color" value={color} onChange={e => setColor(e.target.value)} />
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1">Link</label>
              <input
                className="w-full bg-gray-800 border border-gray-600 px-2 py-1 rounded"
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="https://example.com"
              />
            </div>

            <div className="mb-3">
              <label className="block text-sm mb-1">Email (optional)</label>
              <input
                className="w-full bg-gray-800 border border-gray-600 px-2 py-1 rounded"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@email.com"
              />
            </div>

            <div className="flex justify-between mb-4">
              <span>Price</span>
              <strong>$1</strong>
            </div>

            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 bg-gray-700 py-2 rounded">
                Cancel
              </button>
              <button
                onClick={reservePixel}
                disabled={loading}
                className="flex-1 bg-blue-600 py-2 rounded"
              >
                {loading ? 'Reserving…' : 'Reserve & Pay'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* PAYMENT METHOD SWITCH */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setMethod('BANK')}
                className={`flex-1 py-1 rounded ${method === 'BANK' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                🏦 Bank
              </button>
              <button
                onClick={() => setMethod('CRYPTO')}
                className={`flex-1 py-1 rounded ${method === 'CRYPTO' ? 'bg-blue-600' : 'bg-gray-700'}`}
              >
                🪙 Crypto
              </button>
            </div>

            <div className="bg-black rounded p-3 mb-4">
              <div className="text-gray-400 text-sm">Payment Reference</div>
              <div className="text-green-400 font-mono text-lg select-all">
                {reference}
              </div>
            </div>

            {method === 'BANK' && (
              <>
                {region === 'INTL' ? (
                  <div className="bg-gray-800 p-3 rounded mb-3 text-sm">
                    <p><strong>Bank:</strong> Wise</p>
                    <p><strong>Account Name:</strong> YOUR NAME</p>
                    <p><strong>Account No:</strong> XXXX</p>
                  </div>
                ) : (
                  <div className="bg-gray-800 p-3 rounded mb-3 text-sm">
                    <p><strong>Bank:</strong> YOUR BANK</p>
                    <p><strong>Account Name:</strong> YOUR NAME</p>
                    <p><strong>Account No:</strong> XXXXXXXX</p>
                  </div>
                )}
              </>
            )}

            {method === 'CRYPTO' && (
              <>
                <div className="bg-gray-800 p-3 rounded mb-3 text-sm">
                  <p className="font-semibold">USDT (Solana)</p>
                  <p className="font-mono select-all">YOUR_SOLANA_USDT_ADDRESS</p>
                </div>

                <div className="bg-gray-800 p-3 rounded mb-3 text-sm">
                  <p className="font-semibold">USDT (TRC20)</p>
                  <p className="font-mono select-all">YOUR_TRC20_ADDRESS</p>
                </div>

                <p className="text-xs text-yellow-400 mb-3">
                  ⚠️ Send exact amount. Use reference in memo if supported.
                </p>
              </>
            )}

            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={e => setAcknowledged(e.target.checked)}
              />
              <span className="text-sm">I have sent the payment</span>
            </div>

            <button
              onClick={onClose}
              disabled={!acknowledged}
              className={`w-full py-2 rounded ${
                acknowledged ? 'bg-green-600' : 'bg-gray-700'
              }`}
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
