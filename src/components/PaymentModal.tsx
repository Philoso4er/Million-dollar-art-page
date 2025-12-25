import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  pixelId: number;
  onClose: () => void;
  onReservedUI: (pixelId: number) => void;
}

type Step = 'FORM' | 'PAY';

function normalizeLink(input: string) {
  if (!input) return '';
  if (input.startsWith('http://') || input.startsWith('https://')) return input;
  return `https://${input}`;
}

export default function PaymentModal({ pixelId, onClose, onReservedUI }: Props) {
  const [step, setStep] = useState<Step>('FORM');
  const [color, setColor] = useState('#ff0000');
  const [link, setLink] = useState('');
  const [email, setEmail] = useState('');
  const [reference, setReference] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState('');

  const reserve = async () => {
    const fixedLink = normalizeLink(link);
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

    const data = await res.json();
    setReference(data.reference);
    setStep('PAY');
    onReservedUI(pixelId);
  };

  const uploadProof = async () => {
    if (!file || !reference) return;

    const path = `${reference}/${file.name}`;
    await supabase.storage.from('payment-proofs').upload(path, file);

    const { data } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(path);

    await fetch('/api/attach-proof', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reference,
        payment_proof_url: data.publicUrl,
        payment_note: note
      })
    });

    alert('Proof submitted. Awaiting confirmation.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center">
      <div className="bg-gray-900 p-6 rounded w-full max-w-md">
        {step === 'FORM' && (
          <>
            <h2 className="text-xl mb-4">Buy Pixel #{pixelId}</h2>
            <input type="color" value={color} onChange={e => setColor(e.target.value)} />
            <input
              className="w-full mt-2"
              placeholder="twitter.com"
              value={link}
              onChange={e => setLink(e.target.value)}
            />
            <input
              className="w-full mt-2"
              placeholder="Email (optional)"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <button className="mt-4 w-full bg-blue-600 py-2" onClick={reserve}>
              Reserve & Pay
            </button>
          </>
        )}

        {step === 'PAY' && (
          <>
            <h2 className="text-lg mb-2">Payment Reference</h2>
            <div className="font-mono bg-black p-2 mb-4">{reference}</div>

            <input
              type="file"
              onChange={e => setFile(e.target.files?.[0] || null)}
            />

            <textarea
              placeholder="TX hash or note (optional)"
              className="w-full mt-2"
              value={note}
              onChange={e => setNote(e.target.value)}
            />

            <button
              className="mt-4 w-full bg-green-600 py-2"
              onClick={uploadProof}
              disabled={!file}
            >
              Submit Proof
            </button>
          </>
        )}
      </div>
    </div>
  );
}
