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
  const [acknowledged, setAcknowledged] = useState(false);

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
            {/* STEP 1: DETAILS */}
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
            {/* STEP 2: BANK TRANSFER */}
            <h2 className="text-xl font-bold mb-3">
              Pay via Bank Transfer
            </h2>

            <p className="text-sm text-gray-300 mb-4">
              Send <strong>$1</strong> using <strong>ANY bank</strong>.  
              You <strong>MUST</strong> include the reference below.
            </p>

            {/* Reference */}
            <div className="bg-black rounded p-3 mb-4 text-sm">
              <div className="text-gray-400 mb-1">Payment Reference</div>
              <div className="text-green-400 font-mono text-lg select-all">
                {reference}
              </div>
            </div>

            {/* International */}
            <div className="bg-gray-800 rounded p-3 text-sm mb-3">
              <p className="font-semibold mb-1">🌍 International (USD)</p>
              <p><strong>Bank:</strong> Wise</p>
              <p><strong>Account Name:</strong> YOUR NAME</p>
              <p><strong>Account Number:</strong> XXXX-XXXX</p>
              <p><strong>Routing / IBAN:</strong> XXXX</p>
            </div>

            {/* Nigeria */}
            <div className="bg-gray-800 rounded p-3 text-sm mb-4">
              <p className="font-semibold mb-1">🇳🇬 Nigeria</p>
              <p><strong>Bank:</strong> YOUR BANK</p>
              <p><strong>Account Name:</strong> YOUR NAME</p>
              <p><strong>Account Number:</strong> XXXXXXXXXX</p>
            </div>

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
                  ? 'bg-green-600 hover:bg-green-500'
                  : 'bg-gray-700 cursor-not-allowed'
              }`}
            >
              Done
            </button>

            <p className="text-xs text-gray-400 mt-3 text-center">
              Your pixel will be finalized after payment is confirmed.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
