import React, { useState, useEffect } from 'react';

interface Props {
  pixelId: number;
  onClose: () => void;
  onReserved: (reference: string) => void;
}

type Region = 'NG' | 'INTL';

export default function PaymentModal({ pixelId, onClose, onReserved }: Props) {
  const [color, setColor] = useState('#ff0000');
  const [link, setLink] = useState('');
  const [email, setEmail] = useState(''); // ✅ NEW
  const [loading, setLoading] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [region, setRegion] = useState<Region>('INTL');

  // 🌍 Auto-detect region
  useEffect(() => {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      if (locale.toLowerCase().includes('ng')) {
        setRegion('NG');
      }
    } catch {}
  }, []);

  const reservePixel = async () => {
    if (!link.startsWith('http')) {
      alert('Please enter a valid link (https://…)');
      return;
    }

    if (email && !email.includes('@')) {
      alert('Please enter a valid email or leave it empty');
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
        email: email || null // ✅ SENT TO BACKEND
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
            {/* STEP 1: DETAILS */}
            <h2 className="text-xl font-bold mb-4">
              Buy Pixel #{pixelId}
            </h2>

            {/* Color */}
            <div className="mb-4">
              <label className="block text-sm mb-1">Pixel color</label>
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-full h-10 rounded"
              />
            </div>

            {/* Link */}
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

            {/* Email (optional) */}
            <div className="mb-4">
              <label className="block text-sm mb-1">
                Email (optional — for confirmation)
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-2 rounded bg-gray-800 border border-gray-600"
              />
            </div>

            {/* Price */}
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-300">Price</span>
              <span className="font-bold">$1</span>
            </div>

            {/* Actions */}
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
            {/* STEP 2: PAYMENT */}
            <h2 className="text-xl font-bold mb-3">Pay via Bank Transfer</h2>

            {/* Region switch */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setRegion('INTL')}
                className={`flex-1 py-1 rounded ${
                  region === 'INTL' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                🌍 International
              </button>
              <button
                onClick={() => setRegion('NG')}
                className={`flex-1 py-1 rounded ${
                  region === 'NG' ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              >
                🇳🇬 Nigeria
              </button>
            </div>

            {/* Reference */}
            <div className="bg-black rounded p-3 mb-4 text-sm">
              <div className="text-gray-400 mb-1">Payment Reference</div>
              <div className="text-green-400 font-mono text-lg select-all">
                {reference}
              </div>
            </div>

            {/* Bank details */}
            {region === 'INTL' && (
              <div className="bg-gray-800 rounded p-3 text-sm mb-4">
                <p className="font-semibold mb-1">🌍 International (USD)</p>
                <p><strong>Bank:</strong> Wise</p>
                <p><strong>Account Name:</strong> YOUR NAME</p>
                <p><strong>Account Number:</strong> XXXX-XXXX</p>
                <p><strong>IBAN / Routing:</strong> XXXX</p>
              </div>
            )}

            {region === 'NG' && (
              <div className="bg-gray-800 rounded p-3 text-sm mb-4">
                <p className="font-semibold mb-1">🇳🇬 Nigeria</p>
                <p><strong>Bank:</strong> YOUR BANK</p>
                <p><strong>Account Name:</strong> YOUR NAME</p>
                <p><strong>Account Number:</strong> XXXXXXXXXX</p>
              </div>
            )}

            <p className="text-xs text-yellow-400 mb-4">
              ⚠️ Payments without the exact reference may not be credited.
            </p>

            {/* Acknowledge */}
            <div className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={e => setAcknowledged(e.target.checked)}
              />
              <span className="text-sm text-gray-300">
                I have sent the payment
              </span>
            </div>

            <button
              onClick={onClose}
              disabled={!acknowledged}
              className={`w-full py-2 rounded font-semibold ${
                acknowledged
                  ? 'bg-green-600'
                  : 'bg-gray-700 cursor-not-allowed'
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
