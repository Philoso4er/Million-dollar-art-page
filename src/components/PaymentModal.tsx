import React, { useState, useEffect } from 'react';

interface Props {
  pixelId: number;
  onClose: () => void;
  onReservedUI: (pixelId: number) => void;
}

type Region = 'NG' | 'INTL';
type Step = 'FORM' | 'PAY';

function normalizeLink(input: string) {
  if (!input) return '';
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  return `https://${input}`;
}

export default function PaymentModal({ pixelId, onClose, onReservedUI }: Props) {
  const [color, setColor] = useState('#ff0000');
  const [link, setLink] = useState('');
  const [email, setEmail] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [step, setStep] = useState<Step>('FORM');
  const [region, setRegion] = useState<Region>('INTL');

  useEffect(() => {
    try {
      const locale = Intl.DateTimeFormat().resolvedOptions().locale;
      if (locale.toLowerCase().includes('ng')) setRegion('NG');
    } catch {}
  }, []);

  const reserve = async () => {
    const fixedLink = normalizeLink(link);

    if (!fixedLink.includes('.')) {
      alert('Enter a valid website');
      return;
    }

    setLoading(true);

    const res = await fetch('/api/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pixelIds: [pixelId],
        color,
        link: fixedLink,
        email: email || null
      })
    });

    setLoading(false);

    if (!res.ok) {
      alert('Reservation failed');
      return;
    }

    const data = await res.json();
    setReference(data.reference);
    setStep('PAY');
    onReservedUI(pixelId);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-gray-900 w-full max-w-md rounded-xl p-6 border border-gray-700">
        {step === 'FORM' && (
          <>
            <h2 className="text-xl font-bold mb-4">Buy Pixel #{pixelId}</h2>

            <label className="block mb-3">
              Color
              <input type="color" value={color} onChange={e => setColor(e.target.value)} />
            </label>

            <label className="block mb-3">
              Link
              <input
                value={link}
                onChange={e => setLink(e.target.value)}
                placeholder="twitter.com"
                className="w-full bg-gray-800 border px-2 py-1 rounded"
              />
            </label>

            <label className="block mb-4">
              Email (optional)
              <input
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-gray-800 border px-2 py-1 rounded"
              />
            </label>

            <button
              onClick={reserve}
              disabled={loading}
              className="w-full bg-blue-600 py-2 rounded"
            >
              {loading ? 'Reserving…' : 'Reserve & Pay'}
            </button>
          </>
        )}

        {step === 'PAY' && (
          <>
            <h2 className="text-xl font-bold mb-3">Payment</h2>

            <div className="bg-black p-3 mb-3 rounded">
              <div className="text-gray-400 text-sm">Reference</div>
              <div className="font-mono text-green-400">{reference}</div>
            </div>

            {region === 'INTL' ? (
              <div className="bg-gray-800 p-3 rounded mb-3 text-sm">
                <p><strong>Wise (USD)</strong></p>
                <p>Account Name: YOUR NAME</p>
                <p>Account Number: XXXX</p>
              </div>
            ) : (
              <div className="bg-gray-800 p-3 rounded mb-3 text-sm">
                <p><strong>Nigeria</strong></p>
                <p>Bank: YOUR BANK</p>
                <p>Account: XXXXXXXX</p>
              </div>
            )}

            <label className="flex gap-2 mb-4 text-sm">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={e => setAcknowledged(e.target.checked)}
              />
              I have sent payment
            </label>

            <button
              onClick={onClose}
              disabled={!acknowledged}
              className="w-full bg-green-600 py-2 rounded"
            >
              Done
            </button>
          </>
        )}
      </div>
    </div>
  );
}
