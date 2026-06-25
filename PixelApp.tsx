import React, { useEffect, useState, useRef } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import TermsPage from './TermsPage';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const GRID_SIZE = 1000;
const TOTAL_PIXELS = 1_000_000;
const SITE_URL = 'https://pixelartgrid.vercel.app';

// ============= TYPES =============
interface PixelData {
  id: number;
  color: string;
  link: string;
  status?: 'free' | 'reserved' | 'sold';
}

interface Order {
  id: string;
  reference: string;
  pixel_ids: number[];
  amount_usd: number;
  status: 'pending' | 'paid' | 'expired';
  color: string | null;
  link: string | null;
  individual_data?: Array<{ id: number; color: string; link: string }>;
  payment_proof_url?: string;
  expires_at: string;
  created_at: string;
}

// ============= SHARE HELPERS =============
function buildShareText(pixelCount: number, pixelIds: number[]): string {
  const firstPixel = pixelIds[0];
  if (pixelCount === 1) {
    return `I just claimed pixel #${firstPixel.toLocaleString()} on the Pixel Art Grid 🎨\n\n1,000,000 pixels. £1 each. I own a permanent piece of internet history.\n\nClaim yours:`;
  }
  return `I just claimed ${pixelCount.toLocaleString()} pixels on the Pixel Art Grid 🎨\n\n1,000,000 pixels. £1 each. I own a permanent piece of internet history.\n\nClaim yours:`;
}

function shareToTwitter(text: string, url: string) {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
  window.open(twitterUrl, '_blank', 'noopener,noreferrer');
}

function shareToFacebook(url: string) {
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  window.open(fbUrl, '_blank', 'noopener,noreferrer');
}

function shareToWhatsApp(text: string, url: string) {
  const waUrl = `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
}

async function shareNative(text: string, url: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({ text, url });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

// ============= PIXEL GRID COMPONENT =============
function PixelGrid({
  pixels,
  selected,
  searchedPixel,
  onPixelSelect,
  onHover,
  onPixelClickInfo,
}: {
  pixels: Map<number, PixelData>;
  selected: Set<number>;
  searchedPixel: number | null;
  onPixelSelect: (id: number) => void;
  onHover: (pixel: PixelData | null, x: number, y: number) => void;
  onPixelClickInfo: (id: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    canvas.width = 1000;
    canvas.height = 1000;

    // True matte black — maximum contrast so any colored pixel pops immediately
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1000, 1000);

    // Sold/reserved pixels are rendered as a small block centered on their true
    // coordinate (instead of a literal 1x1 dot) purely for VISIBILITY at scale.
    // The actual "owned" pixel is still just the 1, this just makes it findable
    // at a glance instead of needing to search for it.
    const RENDER_SIZE = 3;
    const OFFSET = Math.floor(RENDER_SIZE / 2);

    pixels.forEach((p) => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      ctx.fillStyle = p.color || '#666666';
      if (p.status === 'reserved') {
        ctx.globalAlpha = 0.5;
      }
      ctx.fillRect(
        Math.max(0, x - OFFSET),
        Math.max(0, y - OFFSET),
        RENDER_SIZE,
        RENDER_SIZE
      );
      ctx.globalAlpha = 1;
    });

    if (searchedPixel !== null) {
      const x = searchedPixel % GRID_SIZE;
      const y = Math.floor(searchedPixel / GRID_SIZE);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, 5, 5);
    }

    selected.forEach((id) => {
      const x = id % GRID_SIZE;
      const y = Math.floor(id / GRID_SIZE);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, 5, 5);
    });
  }, [pixels, selected, searchedPixel]);

  const getPixelId = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 1000 / rect.height;
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);
    if (x >= 0 && x < 1000 && y >= 0 && y < 1000) return y * GRID_SIZE + x;
    return null;
  };

  // Pixels render as a small 3x3 block for visibility, so a click/hover anywhere
  // within that block radius should resolve to the actual owned pixel underneath,
  // not just the exact center coordinate.
  const RENDER_RADIUS = 1;
  const findNearbyOwnedPixel = (id: number): number | null => {
    if (pixels.has(id)) return id;
    const x = id % GRID_SIZE;
    const y = Math.floor(id / GRID_SIZE);
    for (let dy = -RENDER_RADIUS; dy <= RENDER_RADIUS; dy++) {
      for (let dx = -RENDER_RADIUS; dx <= RENDER_RADIUS; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        const nid = ny * GRID_SIZE + nx;
        if (pixels.has(nid)) return nid;
      }
    }
    return null;
  };

  const zoomIn = () => setZoom((z) => Math.min(z * 1.5, 20));
  const zoomOut = () => setZoom((z) => Math.max(z / 1.5, 1));
  const resetZoom = () => setZoom(1);

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-gray-950 p-4 overflow-auto"
      >
        <div
          className="relative"
          style={{
            width: `${800 * zoom}px`,
            height: `${800 * zoom}px`,
            maxWidth: zoom === 1 ? '800px' : 'none',
            maxHeight: zoom === 1 ? '800px' : 'none',
          }}
        >
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-700 rounded-lg cursor-crosshair w-full h-full"
            style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
            onMouseMove={(e) => {
              const id = getPixelId(e);
              if (id !== null) {
                const nearbyId = findNearbyOwnedPixel(id);
                if (nearbyId !== null) {
                  onHover(pixels.get(nearbyId)!, e.clientX, e.clientY);
                } else {
                  onHover({ id, color: '#0a0a0a', link: '', status: 'free' }, e.clientX, e.clientY);
                }
              }
            }}
            onMouseLeave={() => onHover(null, 0, 0)}
            onClick={(e) => {
              const id = getPixelId(e);
              if (id === null) return;
              const nearbyId = findNearbyOwnedPixel(id);
              if (nearbyId !== null) {
                onPixelClickInfo(nearbyId);
              } else {
                onPixelSelect(id);
              }
            }}
          />
        </div>
      </div>

      <div className="absolute bottom-4 right-4 flex flex-col gap-2 bg-gray-900/90 border border-gray-700 rounded-lg p-2 backdrop-blur-sm">
        <button onClick={zoomIn} className="w-9 h-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-lg font-bold transition">+</button>
        <button onClick={resetZoom} className="w-9 h-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-xs font-bold transition">{Math.round(zoom * 100)}%</button>
        <button onClick={zoomOut} className="w-9 h-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded text-lg font-bold transition">−</button>
      </div>
    </div>
  );
}

// ============= PIXEL INFO MODAL =============
function PixelInfoModal({
  pixel,
  onClose,
  onBuy,
}: {
  pixel: PixelData;
  onClose: () => void;
  onBuy: (id: number) => void;
}) {
  const isFree = !pixel.status || pixel.status === 'free';
  const isReserved = pixel.status === 'reserved';
  const isSold = pixel.status === 'sold';

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-2xl w-full max-w-sm border-2 border-cyan-500/30 shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-cyan-300">Pixel #{pixel.id.toLocaleString()}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold leading-none">×</button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-lg border-2 border-gray-700 flex-shrink-0"
            style={{ backgroundColor: isFree ? '#1a1a1a' : pixel.color }}
          />
          <div>
            <div className={`font-bold ${isSold ? 'text-red-400' : isReserved ? 'text-yellow-400' : 'text-green-400'}`}>
              {isSold ? '🔴 Sold' : isReserved ? '🟡 Reserved' : '🟢 Available'}
            </div>
            {!isFree && <div className="text-xs text-gray-500 font-mono">{pixel.color}</div>}
          </div>
        </div>

        {pixel.link && (
          <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="text-xs text-gray-500 mb-1">Linked to:</div>
            <a
              href={pixel.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline text-sm break-all"
            >
              {pixel.link}
            </a>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm text-gray-400 mb-4">
          <div>
            <div className="text-gray-600">Row</div>
            <div className="font-mono text-gray-300">{Math.floor(pixel.id / GRID_SIZE)}</div>
          </div>
          <div>
            <div className="text-gray-600">Column</div>
            <div className="font-mono text-gray-300">{pixel.id % GRID_SIZE}</div>
          </div>
        </div>

        {isFree && (
          <button
            onClick={() => { onBuy(pixel.id); onClose(); }}
            className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold transition"
          >
            Buy This Pixel — £1
          </button>
        )}
      </div>
    </div>
  );
}

// ============= STRIPE CHECKOUT FORM =============
function StripeCheckoutForm({
  pixelCount,
  onSuccess,
  onCancel,
}: {
  pixelCount: number;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setErrorMsg(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    if (error) {
      setErrorMsg(error.message || 'Payment failed. Please try again.');
      setLoading(false);
      return;
    }

    if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    } else {
      setErrorMsg('Payment did not complete. Please try again.');
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      {errorMsg && (
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-lg p-3">
          {errorMsg}
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '⏳ Processing...' : `Pay £${pixelCount}`}
        </button>
      </div>
    </form>
  );
}

// ============= SUCCESS SCREEN WITH SHARE ============
function SuccessScreen({
  pixelCount,
  pixelIds,
  onClose,
}: {
  pixelCount: number;
  pixelIds: number[];
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareText = buildShareText(pixelCount, pixelIds);
  const shareUrl = SITE_URL;

  const handleNativeShare = async () => {
    const ok = await shareNative(shareText, shareUrl);
    if (!ok) {
      // Fallback: copy to clipboard if native share unavailable/cancelled
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="text-center py-4">
      <div className="text-6xl mb-4">🎉</div>
      <h2 className="text-2xl font-bold text-green-400 mb-2">Payment Successful!</h2>
      <p className="text-gray-300 mb-1">
        You've claimed {pixelCount} pixel{pixelCount > 1 ? 's' : ''} on the Pixel Art Grid.
      </p>
      <p className="text-gray-500 text-sm mb-6">
        Your pixel{pixelCount > 1 ? 's are' : ' is'} now permanently part of internet history.
      </p>

      {/* SHARE SECTION */}
      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-6 text-left">
        <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">📣 Tell the world</p>

        {/* Native share — shows on mobile, hidden on desktop where it's unsupported */}
        <button
          onClick={handleNativeShare}
          className="w-full mb-3 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-lg font-bold transition flex items-center justify-center gap-2"
        >
          📤 Share
        </button>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <button
            onClick={() => shareToTwitter(shareText, shareUrl)}
            className="py-2.5 bg-black hover:bg-gray-900 border border-gray-700 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-1.5"
          >
            𝕏 Post
          </button>
          <button
            onClick={() => shareToWhatsApp(shareText, shareUrl)}
            className="py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-1.5"
          >
            WhatsApp
          </button>
          <button
            onClick={() => shareToFacebook(shareUrl)}
            className="py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-sm transition flex items-center justify-center gap-1.5"
          >
            Facebook
          </button>
        </div>

        <button
          onClick={handleCopyLink}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-lg text-sm font-semibold transition"
        >
          {copied ? '✅ Copied to clipboard!' : '🔗 Copy share text + link'}
        </button>
      </div>

      <button
        onClick={onClose}
        className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition"
      >
        Back to the Grid
      </button>
    </div>
  );
}

// ============= PAYMENT MODAL COMPONENT =============
function PaymentModal({
  pixelIds,
  onClose,
  onSuccess,
}: {
  pixelIds: number[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mode, setMode] = useState<'sync' | 'individual'>('sync');
  const [syncColor, setSyncColor] = useState('#ff3366');
  const [syncLink, setSyncLink] = useState('');
  const [individualData, setIndividualData] = useState(
    pixelIds.map((id) => ({ id, color: '#ff3366', link: '' }))
  );
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const updateIndividual = (index: number, key: 'color' | 'link', value: string) => {
    setIndividualData((prev) => {
      const next = [...prev];
      next[index][key] = value;
      return next;
    });
  };

  const createOrderAndIntent = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload =
        mode === 'sync'
          ? { pixelIds, mode, color: syncColor, link: syncLink }
          : { pixelIds, mode, individual: individualData };

      const orderRes = await fetch('/api/orders?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || 'Failed to create order');

      setReference(orderData.reference);

      const intentRes = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reference: orderData.reference }),
      });

      const intentData = await intentRes.json();
      if (!intentRes.ok) throw new Error(intentData.error || 'Failed to start payment');

      setClientSecret(intentData.clientSecret);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    if (reference) {
      try {
        await fetch('/api/orders?action=confirm-stripe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference }),
        });
      } catch {
        // webhook will still catch this even if this call fails
      }
    }
    onSuccess();
    setShowSuccess(true);
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-cyan-500/30 shadow-2xl">
        <div className="p-6">
          {!showSuccess && (
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                {pixelIds.length} Pixel{pixelIds.length > 1 ? 's' : ''} — £{pixelIds.length}
              </h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold leading-none">×</button>
            </div>
          )}

          {showSuccess ? (
            <SuccessScreen pixelCount={pixelIds.length} pixelIds={pixelIds} onClose={onClose} />
          ) : (
            <>
              <p className="text-gray-500 text-xs mb-6">Your pixel becomes a permanent part of the Pixel Art Grid.</p>

              {!clientSecret && (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                      onClick={() => setMode('sync')}
                      className={`py-3 rounded-lg font-bold transition ${mode === 'sync' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                      🎨 Same Color & Link
                    </button>
                    <button
                      onClick={() => setMode('individual')}
                      className={`py-3 rounded-lg font-bold transition ${mode === 'individual' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                    >
                      🖌️ Individual Settings
                    </button>
                  </div>

                  {mode === 'sync' && (
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">🎨 Pixel Color</label>
                        <input type="color" value={syncColor} onChange={(e) => setSyncColor(e.target.value)}
                          className="w-full h-14 rounded-lg cursor-pointer border-2 border-gray-700" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-300 mb-2">🔗 Link (optional)</label>
                        <input type="url" placeholder="https://yoursite.com" value={syncLink}
                          onChange={(e) => setSyncLink(e.target.value)}
                          className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none" />
                      </div>
                    </div>
                  )}

                  {mode === 'individual' && (
                    <div className="max-h-64 overflow-y-auto mb-6 space-y-3 pr-2">
                      {individualData.map((p, i) => (
                        <div key={p.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                          <div className="font-bold text-sm text-cyan-400 mb-3">Pixel #{p.id}</div>
                          <div className="grid grid-cols-2 gap-3">
                            <input type="color" value={p.color} onChange={(e) => updateIndividual(i, 'color', e.target.value)}
                              className="w-full h-10 rounded cursor-pointer" />
                            <input type="url" placeholder="https://..." value={p.link}
                              onChange={(e) => updateIndividual(i, 'link', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {errorMsg && (
                    <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-lg p-3 mb-4">
                      {errorMsg}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={onClose}
                      className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition">
                      Cancel
                    </button>
                    <button
                      onClick={createOrderAndIntent}
                      disabled={loading}
                      className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? '⏳ Loading...' : `Continue to Payment — £${pixelIds.length}`}
                    </button>
                  </div>

                  <p className="text-center text-xs text-gray-600 mt-4">
                    By contributing you agree to our{' '}
                    <button onClick={onClose} className="text-cyan-600 hover:text-cyan-400 underline">
                      Terms &amp; Conditions
                    </button>
                    . All sales are final. £1 per pixel.
                  </p>
                </>
              )}

              {clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'night',
                      variables: {
                        colorPrimary: '#06b6d4',
                        colorBackground: '#1f2937',
                        colorText: '#ffffff',
                        borderRadius: '8px',
                      },
                    },
                  }}
                >
                  <StripeCheckoutForm
                    pixelCount={pixelIds.length}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => { setClientSecret(null); }}
                  />
                </Elements>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= ADMIN LOGIN COMPONENT =============
function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError('❌ ' + (data.error || 'Invalid password'));
      } else {
        localStorage.setItem('admin_auth', 'true');
        onSuccess();
      }
    } catch {
      setError('❌ Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-gray-900 p-8 rounded-2xl border-2 border-cyan-500/30 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-6">
          🔐 Admin Login
        </h2>
        <input type="password" placeholder="Enter admin password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none mb-4"
          disabled={loading} />
        {error && <div className="text-red-400 text-sm text-center mb-4">{error}</div>}
        <button onClick={handleLogin} disabled={loading || !password}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-bold hover:from-cyan-600 hover:to-blue-700 transition disabled:opacity-50">
          {loading ? 'Checking...' : 'Login'}
        </button>
      </div>
    </div>
  );
}

// ============= ADMIN DASHBOARD COMPONENT =============
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ free: 1000000, reserved: 0, sold: 0 });
  const [cleanupLoading, setCleanupLoading] = useState(false);

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/orders?action=list');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/pixels?action=stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats', err);
    }
  };

  const manualCleanup = async () => {
    if (!confirm('Clean up all expired orders and free reserved pixels?')) return;
    setCleanupLoading(true);
    try {
      const res = await fetch('/api/orders?action=cleanup', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      if (res.ok) { alert('✅ Cleanup completed!'); loadOrders(); loadStats(); }
      else alert('❌ Cleanup failed');
    } catch { alert('❌ Network error'); }
    finally { setCleanupLoading(false); }
  };

  const markPaid = async (id: string) => {
    if (!confirm('Mark this order as paid and assign pixels?')) return;
    try {
      const res = await fetch('/api/orders?action=update', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      });
      if (res.ok) { alert('✅ Order marked as paid!'); loadOrders(); loadStats(); }
      else alert('❌ Failed to update order');
    } catch { alert('❌ Network error'); }
  };

  const deleteOrder = async (id: string, reference: string) => {
    if (!confirm(`Delete order ${reference}? This will free up the reserved pixels.`)) return;
    try {
      const res = await fetch('/api/orders?action=delete', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      });
      if (res.ok) { alert('✅ Order deleted!'); loadOrders(); loadStats(); }
      else alert('❌ Failed to delete order');
    } catch { alert('❌ Network error'); }
  };

  useEffect(() => { loadOrders(); loadStats(); }, []);

  if (loading) return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-xl">Loading...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Admin Dashboard — Pixel Art Grid
          </h1>
          <div className="flex gap-3">
            <button onClick={manualCleanup} disabled={cleanupLoading}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition font-semibold disabled:opacity-50">
              {cleanupLoading ? '🔄 Cleaning...' : '🧹 Cleanup Expired'}
            </button>
            <button onClick={onLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition font-semibold">
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Available Pixels', value: stats.free, color: 'text-green-400' },
            { label: 'Reserved', value: stats.reserved, color: 'text-yellow-400' },
            { label: 'Sold', value: stats.sold, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 p-6 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">{label}</div>
              <div className={`text-3xl font-bold ${color}`}>{value.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold">Orders</h2>
            <button onClick={() => { loadOrders(); loadStats(); }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold">
              🔄 Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  {['Reference', 'Pixels', 'Amount', 'Status', 'Expires', 'Proof', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-sm font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orders.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No orders yet</td></tr>
                ) : orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-mono text-sm">{order.reference}</td>
                    <td className="px-4 py-3">{order.pixel_ids.length}</td>
                    <td className="px-4 py-3">£{order.amount_usd}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        order.status === 'paid' ? 'bg-green-900 text-green-300' :
                        order.status === 'expired' ? 'bg-red-900 text-red-300' :
                        'bg-yellow-900 text-yellow-300'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-400">{new Date(order.expires_at).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      {order.payment_proof_url ? (
                        <span className="text-gray-400 text-xs">{order.payment_proof_url.slice(0, 20)}...</span>
                      ) : <span className="text-gray-500">None</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <>
                            <button onClick={() => markPaid(order.id)}
                              className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-semibold transition">
                              ✓ Mark Paid
                            </button>
                            <button onClick={() => deleteOrder(order.id, order.reference)}
                              className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-semibold transition">
                              × Delete
                            </button>
                          </>
                        )}
                        {order.status === 'paid' && <span className="text-green-400 text-sm">✓ Done</span>}
                        {order.status === 'expired' && (
                          <button onClick={() => deleteOrder(order.id, order.reference)}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-semibold transition">
                            × Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= MAIN APP =============
export default function PixelApp() {
  const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activePixels, setActivePixels] = useState<number[] | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);
  const [hovered, setHovered] = useState<{ pixel: PixelData | null; x: number; y: number } | null>(null);
  const [infoPixel, setInfoPixel] = useState<PixelData | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [claimedCount, setClaimedCount] = useState(0);
  const [showTerms, setShowTerms] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('admin_auth') === 'true') setIsAdmin(true);
  }, []);

  useEffect(() => { loadPixelsFromDatabase(); }, []);

  const loadPixelsFromDatabase = async () => {
    try {
      const res = await fetch('/api/pixels');
      const { pixels: data } = await res.json();
      const pixelMap = new Map<number, PixelData>();
      let soldCount = 0;
      if (data) {
        data.forEach((row: any) => {
          if (row.status === 'sold' || row.status === 'reserved') {
            pixelMap.set(row.pixel_id, {
              id: row.pixel_id,
              color: row.color || '#666666',
              link: row.link || '',
              status: row.status,
            });
            if (row.status === 'sold') soldCount++;
          }
        });
      }
      setPixels(pixelMap);
      setClaimedCount(soldCount);
    } catch (err) {
      console.error('Error loading pixels:', err);
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSearch = () => {
    const id = Number(searchInput);
    if (!isNaN(id) && id >= 0 && id < TOTAL_PIXELS) {
      setSearchedPixel(id);
      const existing = pixels.get(id);
      setInfoPixel(existing || { id, color: '#1a1a1a', link: '', status: 'free' });
    }
  };

  const handlePixelClickInfo = (id: number) => {
    const existing = pixels.get(id);
    setInfoPixel(existing || { id, color: '#1a1a1a', link: '', status: 'free' });
  };

  const buyRandom = () => {
    for (let i = 0; i < TOTAL_PIXELS; i++) {
      if (!pixels.has(i) || pixels.get(i)?.status === 'free') {
        setSelected(new Set([i]));
        setSearchedPixel(i);
        setActivePixels([i]);
        return;
      }
    }
    alert('No free pixels available!');
  };

  const handlePaymentSuccess = () => {
    loadPixelsFromDatabase();
    setSelected(new Set());
  };

  if (showTerms) {
    return <TermsPage onClose={() => setShowTerms(false)} />;
  }

  if (showAdmin && !isAdmin) {
    return <AdminLogin onSuccess={() => { setIsAdmin(true); }} />;
  }

  if (showAdmin && isAdmin) {
    return <AdminDashboard onLogout={() => {
      localStorage.removeItem('admin_auth');
      setIsAdmin(false);
      setShowAdmin(false);
    }} />;
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">

      {/* ── HEADER ── */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <h1 className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent whitespace-nowrap">
          Pixel Art Grid
        </h1>
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Pixel #"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-32 focus:border-cyan-500 focus:outline-none" />
        <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded font-semibold transition">Search</button>
        <button onClick={buyRandom} className="bg-purple-600 hover:bg-purple-500 px-3 py-2 rounded font-semibold transition">🎲 Random</button>
        <div className="ml-auto text-sm text-gray-300 whitespace-nowrap">
          <span className="font-bold text-green-400">{claimedCount.toLocaleString()}</span>
          {' / '}{TOTAL_PIXELS.toLocaleString()} sold
        </div>
        <button onClick={() => setShowAdmin(true)} className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded font-semibold transition">Admin</button>
      </header>

      {/* ── SUBTITLE BANNER ── */}
      <div className="bg-gray-900/60 border-b border-gray-800 px-4 py-2 text-center flex-shrink-0">
        <p className="text-gray-400 text-xs">
          A collaborative digital artwork — 1,000,000 pixels, £1 each. Own a piece of internet history. Click any coloured pixel to see its details, or zoom in with the controls bottom-right.
        </p>
      </div>

      {/* ── CANVAS ── */}
      <div className="flex-1 overflow-hidden">
        <PixelGrid
          pixels={pixels}
          searchedPixel={searchedPixel}
          selected={selected}
          onPixelSelect={toggleSelect}
          onHover={(pixel, x, y) => setHovered(pixel ? { pixel, x, y } : null)}
          onPixelClickInfo={handlePixelClickInfo}
        />
      </div>

      {/* ── HOVER TOOLTIP (desktop only) ── */}
      {hovered?.pixel && (
        <div className="hidden md:block fixed bg-gray-900 border-2 border-cyan-500/50 rounded-lg px-4 py-3 text-sm pointer-events-none shadow-2xl z-40"
          style={{ left: hovered.x + 16, top: hovered.y + 16 }}>
          <div className="font-bold text-cyan-300">Pixel #{hovered.pixel.id}</div>
          <div className={`text-sm ${hovered.pixel.status === 'sold' ? 'text-red-400' : hovered.pixel.status === 'reserved' ? 'text-yellow-400' : 'text-green-400'}`}>
            {hovered.pixel.status === 'sold' ? '🔴 Sold' : hovered.pixel.status === 'reserved' ? '🟡 Reserved' : '🟢 Available'}
          </div>
          {hovered.pixel.link && (
            <div className="text-blue-400 text-xs truncate max-w-[200px]">{hovered.pixel.link}</div>
          )}
        </div>
      )}

      {/* ── PIXEL INFO MODAL ── */}
      {infoPixel && (
        <PixelInfoModal
          pixel={infoPixel}
          onClose={() => setInfoPixel(null)}
          onBuy={(id) => {
            setSelected(new Set([id]));
            setActivePixels([id]);
          }}
        />
      )}

      {/* ── SELECTION BAR ── */}
      {selected.size > 0 && !activePixels && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border-2 border-cyan-500 rounded-xl px-6 py-4 shadow-2xl shadow-cyan-500/20 flex items-center gap-4">
          <span className="font-bold text-lg">{selected.size} pixel{selected.size > 1 ? 's' : ''} selected</span>
          <button onClick={() => setActivePixels([...selected])}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-bold shadow-lg shadow-green-500/50 transition">
            Buy Now — £{selected.size}
          </button>
          <button onClick={() => setSelected(new Set())}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition">
            Clear
          </button>
        </div>
      )}

      {/* ── PAYMENT MODAL ── */}
      {activePixels && (
        <PaymentModal pixelIds={activePixels}
          onClose={() => { setActivePixels(null); setSelected(new Set()); }}
          onSuccess={handlePaymentSuccess} />
      )}

      {/* ── FOOTER ── */}
      <footer className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center justify-between flex-shrink-0 text-xs text-gray-500">
        <span>A collaborative digital art project. <span className="text-gray-400">1,000,000 pixels. £1,000,000.</span></span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowTerms(true)}
            className="hover:text-cyan-400 transition underline"
          >
            Terms &amp; Conditions
          </button>
          <span>© 2026 Pixel Art Grid</span>
        </div>
      </footer>
    </div>
  );
}
