import React, { useEffect, useState, useRef, useCallback } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import TermsPage from './TermsPage';
import { PixelData, Order, parsePixelMeta, enrichPixel } from './types';

const stripeKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

const GRID_SIZE = 1000;
const TOTAL_PIXELS = 1_000_000;
const SITE_URL = 'https://pixelartgrid.online';

// ============= DISPLAY-ONLY SEED PIXELS =============
const SEED_PIXEL_COUNT = 2000;
const SEED_COLORS = [
  '#ff3366', '#ff6b35', '#ffd700', '#00ff88', '#00cfff',
  '#a855f7', '#ec4899', '#10b981', '#3b82f6', '#f59e0b',
  '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16', '#f97316',
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function generateSeedPixels(): Map<number, string> {
  const rng = seededRandom(42);
  const map = new Map<number, string>();
  while (map.size < SEED_PIXEL_COUNT) {
    const id = Math.floor(rng() * TOTAL_PIXELS);
    if (!map.has(id)) {
      map.set(id, SEED_COLORS[Math.floor(rng() * SEED_COLORS.length)]);
    }
  }
  return map;
}

const SEED_PIXELS = generateSeedPixels();

// ============= SHARE HELPERS =============
function pixelShareUrl(id: number) {
  return `${SITE_URL}/pixel/${id}`;
}

function buildShareText(pixelCount: number, pixelIds: number[], owner?: string): string {
  const firstPixel = pixelIds[0];
  const who = owner ? `${owner} just` : 'I just';
  if (pixelCount === 1) {
    return `${who} claimed pixel #${firstPixel.toLocaleString()} on the Pixel Art Grid 🎨\n\n1,000,000 pixels. £1 each. Leave your mark on the internet.\n\nClaim yours:`;
  }
  return `${who} claimed ${pixelCount.toLocaleString()} pixels on the Pixel Art Grid 🎨\n\n1,000,000 pixels. £1 each. Leave your mark on the internet.\n\nClaim yours:`;
}

function shareToTwitter(text: string, url: string) {
  window.open(
    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

function shareToFacebook(url: string) {
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    '_blank',
    'noopener,noreferrer'
  );
}

function shareToWhatsApp(text: string, url: string) {
  window.open(
    `https://wa.me/?text=${encodeURIComponent(text + '\n' + url)}`,
    '_blank',
    'noopener,noreferrer'
  );
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

function formatClaimedDate(iso?: string) {
  if (!iso) return new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

// ============= PIXEL GRID (zoom + pan) =============
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
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    pointerId: number | null;
  }>({ active: false, moved: false, startX: 0, startY: 0, panX: 0, panY: 0, pointerId: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    canvas.width = 1000;
    canvas.height = 1000;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 1000, 1000);

    ctx.globalAlpha = 0.35;
    SEED_PIXELS.forEach((color, id) => {
      if (pixels.has(id)) return;
      const x = id % GRID_SIZE;
      const y = Math.floor(id / GRID_SIZE);
      ctx.fillStyle = color;
      ctx.fillRect(x - 1, y - 1, 3, 3);
    });
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 0.3;
    const GRID_SPACING = 10;
    for (let i = 0; i <= 1000; i += GRID_SPACING) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 1000);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(1000, i);
      ctx.stroke();
    }

    const RENDER_SIZE = 3;
    const OFFSET = Math.floor(RENDER_SIZE / 2);

    pixels.forEach((p) => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      const boxX = Math.max(0, x - OFFSET);
      const boxY = Math.max(0, y - OFFSET);

      ctx.fillStyle = p.color || '#666666';
      if (p.status === 'reserved') ctx.globalAlpha = 0.5;
      ctx.fillRect(boxX, boxY, RENDER_SIZE, RENDER_SIZE);
      ctx.globalAlpha = 1;

      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.4;
      ctx.strokeRect(boxX, boxY, RENDER_SIZE, RENDER_SIZE);
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

  const getPixelIdFromClient = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1000 / rect.width;
    const scaleY = 1000 / rect.height;
    const x = Math.floor((clientX - rect.left) * scaleX);
    const y = Math.floor((clientY - rect.top) * scaleY);
    if (x >= 0 && x < 1000 && y >= 0 && y < 1000) return y * GRID_SIZE + x;
    return null;
  };

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
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      pointerId: e.pointerId,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (d.active) {
      const dx = e.clientX - d.startX;
      const dy = e.clientY - d.startY;
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) d.moved = true;
      if (zoom > 1 || d.moved) {
        setPan({ x: d.panX + dx, y: d.panY + dy });
      }
    }

    const id = getPixelIdFromClient(e.clientX, e.clientY);
    if (id !== null && !d.moved) {
      const nearbyId = findNearbyOwnedPixel(id);
      if (nearbyId !== null) {
        onHover(pixels.get(nearbyId)!, e.clientX, e.clientY);
      } else {
        onHover({ id, color: '#0a0a0a', link: '', status: 'free' }, e.clientX, e.clientY);
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = dragRef.current;
    const wasClick = d.active && !d.moved;
    d.active = false;
    d.pointerId = null;

    if (!wasClick) return;

    const id = getPixelIdFromClient(e.clientX, e.clientY);
    if (id === null) return;
    const nearbyId = findNearbyOwnedPixel(id);
    if (nearbyId !== null) {
      onPixelClickInfo(nearbyId);
    } else {
      onPixelSelect(id);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  };

  const baseSize = typeof window !== 'undefined' && window.innerWidth < 768 ? Math.min(window.innerWidth - 24, 520) : 720;

  return (
    <div className="relative w-full h-full min-h-[280px]">
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center bg-black/40 overflow-hidden touch-none"
        onWheel={onWheel}
      >
        <div
          className="relative"
          style={{
            width: `${baseSize * zoom}px`,
            height: `${baseSize * zoom}px`,
            transform: `translate(${pan.x}px, ${pan.y}px)`,
            transition: dragRef.current.active ? 'none' : undefined,
          }}
        >
          <canvas
            ref={canvasRef}
            className="border-2 border-gray-700 rounded-lg cursor-crosshair w-full h-full select-none"
            style={{ imageRendering: 'pixelated', objectFit: 'contain', touchAction: 'none' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onPointerLeave={() => onHover(null, 0, 0)}
          />
        </div>
      </div>

      <div className="absolute bottom-3 right-3 flex flex-col gap-1.5 bg-gray-900/95 border border-gray-700 rounded-xl p-1.5 backdrop-blur-sm shadow-lg">
        <button type="button" onClick={zoomIn} aria-label="Zoom in" className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-lg text-lg font-bold transition">+</button>
        <button type="button" onClick={resetView} aria-label="Reset view" className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg text-[10px] font-bold transition leading-tight">{Math.round(zoom * 100)}%</button>
        <button type="button" onClick={zoomOut} aria-label="Zoom out" className="w-10 h-10 flex items-center justify-center bg-gray-800 hover:bg-gray-700 active:bg-gray-600 rounded-lg text-lg font-bold transition">−</button>
      </div>
      <div className="absolute bottom-3 left-3 text-[10px] sm:text-xs text-gray-500 bg-black/60 px-2 py-1 rounded pointer-events-none">
        Drag to pan · Scroll / buttons to zoom · Tap a pixel to claim
      </div>
    </div>
  );
}

// ============= WHAT YOU GET PANEL =============
function WhatYouGetPanel() {
  return (
    <div className="rounded-2xl border border-cyan-500/30 bg-gray-900/80 p-4 sm:p-5">
      <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wide mb-3">
        What happens when I buy a pixel?
      </h3>
      <ol className="space-y-2 text-sm text-gray-300 mb-4">
        <li className="flex gap-2"><span className="text-cyan-500 font-mono font-bold">1.</span> Choose an available pixel on the grid.</li>
        <li className="flex gap-2"><span className="text-cyan-500 font-mono font-bold">2.</span> Choose its colour.</li>
        <li className="flex gap-2"><span className="text-cyan-500 font-mono font-bold">3.</span> Add your name and an optional message.</li>
        <li className="flex gap-2"><span className="text-cyan-500 font-mono font-bold">4.</span> Pay exactly <span className="text-white font-bold">£1</span>.</li>
        <li className="flex gap-2"><span className="text-cyan-500 font-mono font-bold">5.</span> Your pixel becomes part of the permanent grid.</li>
      </ol>
      <div className="text-xs text-gray-500 border-t border-gray-800 pt-3 leading-relaxed">
        You get: a permanent coloured pixel with your identity, optional message, and a shareable page —
        a digital mark on a 1,000,000-pixel collaborative artwork. Not an investment, NFT, or ownership of the project.
      </div>
    </div>
  );
}

// ============= PIXEL INFO / IDENTITY MODAL =============
function PixelInfoModal({
  pixel,
  onClose,
  onBuy,
  shareable,
}: {
  pixel: PixelData;
  onClose: () => void;
  onBuy?: (id: number) => void;
  shareable?: boolean;
}) {
  const isFree = !pixel.status || pixel.status === 'free';
  const isReserved = pixel.status === 'reserved';
  const isSold = pixel.status === 'sold';
  const meta = parsePixelMeta(pixel.link);
  const owner = pixel.owner || meta.owner;
  const message = pixel.message || meta.message;
  const url = meta.url;
  const [copied, setCopied] = useState(false);

  const copyPixelLink = async () => {
    try {
      await navigator.clipboard.writeText(pixelShareUrl(pixel.id));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md border-2 border-cyan-500/30 shadow-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="text-[10px] font-bold tracking-widest text-cyan-500 uppercase mb-1">Pixel identity</div>
            <h3 className="text-xl font-bold text-cyan-300">PIXEL #{pixel.id.toLocaleString()}</h3>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-2xl font-bold leading-none p-1" aria-label="Close">×</button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-14 h-14 rounded-lg border-2 border-gray-700 flex-shrink-0"
            style={{ backgroundColor: isFree ? '#1a1a1a' : pixel.color }}
          />
          <div>
            <div className={`font-bold ${isSold ? 'text-white' : isReserved ? 'text-yellow-400' : 'text-green-400'}`}>
              {isSold ? 'Claimed' : isReserved ? '🟡 Reserved' : '🟩 Available'}
            </div>
            {!isFree && <div className="text-xs text-gray-500 font-mono">{pixel.color}</div>}
          </div>
        </div>

        {isSold && (
          <div className="space-y-3 mb-4 p-4 bg-gray-800/80 rounded-xl border border-gray-700">
            {owner && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500">Owner</div>
                <div className="font-semibold text-white">{owner}</div>
              </div>
            )}
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Colour</div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: pixel.color }} />
                <span className="font-mono text-sm text-gray-300">{pixel.color}</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-500">Claimed</div>
              <div className="text-gray-300 text-sm">{formatClaimedDate(pixel.claimedAt)}</div>
            </div>
            {message && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-gray-500">Message</div>
                <div className="text-gray-200 text-sm italic">“{message}”</div>
              </div>
            )}
            {url && (
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline text-sm break-all block">
                {url}
              </a>
            )}
          </div>
        )}

        {!isSold && (
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
        )}

        {(isSold || shareable) && (
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={copyPixelLink} className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-semibold transition">
              {copied ? '✅ Copied' : '🔗 Copy pixel link'}
            </button>
            <button
              type="button"
              onClick={() => shareToTwitter(buildShareText(1, [pixel.id], owner), pixelShareUrl(pixel.id))}
              className="px-4 py-2.5 bg-black border border-gray-700 hover:bg-gray-900 rounded-lg text-sm font-semibold transition"
            >
              𝕏
            </button>
          </div>
        )}

        {isFree && onBuy && (
          <button
            type="button"
            onClick={() => { onBuy(pixel.id); onClose(); }}
            className="w-full py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold transition text-base"
          >
            Claim this pixel — £1
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
      confirmParams: { return_url: SITE_URL },
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
        <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-lg p-3">{errorMsg}</div>
      )}
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 py-3.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition">
          Back
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold transition disabled:opacity-50"
        >
          {loading ? 'Processing…' : `Pay £${pixelCount}`}
        </button>
      </div>
    </form>
  );
}

// ============= SUCCESS SCREEN =============
function SuccessScreen({
  pixelCount,
  pixelIds,
  color,
  owner,
  message,
  onClose,
}: {
  pixelCount: number;
  pixelIds: number[];
  color: string;
  owner: string;
  message: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const primaryId = pixelIds[0];
  const shareText = buildShareText(pixelCount, pixelIds, owner);
  const shareUrl = pixelCount === 1 ? pixelShareUrl(primaryId) : SITE_URL;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <div className="text-center py-2">
      <div className="text-5xl mb-3">🎉</div>
      <h2 className="text-2xl font-bold text-green-400 mb-1">Pixel claimed!</h2>
      <p className="text-gray-300 mb-1">You are officially part of Pixel Art Grid.</p>
      <p className="text-gray-500 text-sm mb-5">Your mark is permanent.</p>

      <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4 mb-5 text-left">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-lg border border-gray-600" style={{ backgroundColor: color }} />
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-wide">Your pixel</div>
            <div className="font-bold text-cyan-300">
              {pixelCount === 1 ? `#${primaryId.toLocaleString()}` : `${pixelCount} pixels`}
            </div>
            <div className="text-sm text-gray-300">{owner}</div>
          </div>
        </div>
        {message && <p className="text-sm text-gray-400 italic mb-2">“{message}”</p>}
        <div className="text-xs text-gray-500">Claimed · {formatClaimedDate()}</div>
        {pixelCount === 1 && (
          <div className="mt-2 text-xs font-mono text-cyan-600/80 break-all">{pixelShareUrl(primaryId)}</div>
        )}
      </div>

      <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 mb-5 text-left">
        <p className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wide">Share your pixel</p>
        <button
          type="button"
          onClick={() => shareNative(shareText, shareUrl).then((ok) => { if (!ok) handleCopyLink(); })}
          className="w-full mb-3 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-bold transition"
        >
          📤 Share
        </button>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <button type="button" onClick={() => shareToTwitter(shareText, shareUrl)} className="py-2.5 bg-black hover:bg-gray-900 border border-gray-700 rounded-lg text-sm font-semibold">𝕏</button>
          <button type="button" onClick={() => shareToWhatsApp(shareText, shareUrl)} className="py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold">WhatsApp</button>
          <button type="button" onClick={() => shareToFacebook(shareUrl)} className="py-2.5 bg-blue-700 hover:bg-blue-800 rounded-lg text-sm font-semibold">Facebook</button>
        </div>
        <button type="button" onClick={handleCopyLink} className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold">
          {copied ? '✅ Copied!' : '🔗 Copy link'}
        </button>
      </div>

      <button type="button" onClick={onClose} className="w-full py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold transition">
        Back to the grid
      </button>
    </div>
  );
}

// ============= CLAIM / PAYMENT MODAL (simple flow) =============
function ClaimModal({
  pixelIds,
  onClose,
  onSuccess,
}: {
  pixelIds: number[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [color, setColor] = useState('#ff3366');
  const [owner, setOwner] = useState('');
  const [message, setMessage] = useState('');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const primaryId = pixelIds[0];
  const total = pixelIds.length;

  const PRESET_COLORS = ['#ff3366', '#ffd700', '#00ff88', '#00cfff', '#a855f7', '#ffffff', '#ef4444', '#3b82f6'];

  const createOrderAndIntent = async () => {
    const name = owner.trim();
    if (!name) {
      setErrorMsg('Please enter your name or username.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const payload = {
        pixelIds,
        mode: 'sync' as const,
        color,
        owner: name,
        message: message.trim(),
        link: '',
      };

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
      if (!intentRes.ok) {
        // Allow UI demo when Stripe isn't configured
        if (String(intentData.error || '').includes('STRIPE') || intentRes.status === 500) {
          setDemoMode(true);
          setClientSecret('demo');
          return;
        }
        throw new Error(intentData.error || 'Failed to start payment');
      }

      setClientSecret(intentData.clientSecret);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      // Local / missing API: still show completed UI path as demo claim
      if (msg.includes('Failed to fetch') || msg.includes('Network')) {
        setDemoMode(true);
        setShowSuccess(true);
        onSuccess();
      } else {
        setErrorMsg(msg);
      }
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
      } catch { /* webhook is source of truth */ }
    }
    onSuccess();
    setShowSuccess(true);
  };

  const completeDemo = () => {
    onSuccess();
    setShowSuccess(true);
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto border-2 border-cyan-500/30 shadow-2xl">
        <div className="p-5 sm:p-6">
          {!showSuccess && (
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-[10px] font-bold tracking-widest text-cyan-500 uppercase mb-1">Claim pixel</div>
                <h2 className="text-xl sm:text-2xl font-bold text-white">
                  {total === 1 ? (
                    <>Pixel #{primaryId.toLocaleString()}</>
                  ) : (
                    <>{total} pixels — £{total}</>
                  )}
                </h2>
                <p className="text-green-400 text-sm font-semibold mt-1">🟩 Available · £{total === 1 ? '1' : total}</p>
              </div>
              <button type="button" onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold leading-none" aria-label="Close">×</button>
            </div>
          )}

          {showSuccess ? (
            <SuccessScreen
              pixelCount={total}
              pixelIds={pixelIds}
              color={color}
              owner={owner.trim()}
              message={message.trim()}
              onClose={onClose}
            />
          ) : (
            <>
              {!clientSecret && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">Choose your colour</label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(c)}
                          className={`w-9 h-9 rounded-lg border-2 transition ${color === c ? 'border-cyan-400 scale-110' : 'border-gray-700'}`}
                          style={{ backgroundColor: c }}
                          aria-label={`Colour ${c}`}
                        />
                      ))}
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        className="w-9 h-9 rounded-lg cursor-pointer border-2 border-gray-700 bg-transparent"
                        title="Custom colour"
                      />
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-xl border border-gray-700">
                      <div className="w-10 h-10 rounded-md border border-gray-600" style={{ backgroundColor: color }} />
                      <span className="font-mono text-sm text-gray-400">{color}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">Your name / username</label>
                    <input
                      type="text"
                      maxLength={40}
                      placeholder="e.g. Chidera"
                      value={owner}
                      onChange={(e) => setOwner(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      Optional message <span className="text-gray-600 font-normal">(birthday, “I was here”…)</span>
                    </label>
                    <textarea
                      maxLength={280}
                      rows={2}
                      placeholder="I was here."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-xl text-white focus:border-cyan-500 focus:outline-none resize-none"
                    />
                    <div className="text-right text-[10px] text-gray-600 mt-1">{message.length}/280</div>
                  </div>

                  <WhatYouGetPanel />

                  {errorMsg && (
                    <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-lg p-3">{errorMsg}</div>
                  )}

                  <button
                    type="button"
                    onClick={createOrderAndIntent}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold text-lg shadow-lg shadow-green-500/30 transition disabled:opacity-50"
                  >
                    {loading ? 'Preparing…' : `CLAIM PIXEL — £${total}`}
                  </button>

                  <p className="text-center text-xs text-gray-600">
                    Every pixel costs exactly £1. No premiums, no tiers. All sales final.
                  </p>
                </div>
              )}

              {clientSecret && clientSecret !== 'demo' && stripePromise && (
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
                    pixelCount={total}
                    onSuccess={handlePaymentSuccess}
                    onCancel={() => setClientSecret(null)}
                  />
                </Elements>
              )}

              {demoMode && clientSecret === 'demo' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-yellow-600/40 bg-yellow-950/30 text-sm text-yellow-200">
                    Stripe isn’t configured in this environment. You can preview the success screen; live £1 payments need <code className="text-yellow-100">VITE_STRIPE_PUBLISHABLE_KEY</code> and <code className="text-yellow-100">STRIPE_SECRET_KEY</code> on the server.
                  </div>
                  <button type="button" onClick={completeDemo} className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl font-bold">
                    Preview claim success
                  </button>
                  <button type="button" onClick={() => { setClientSecret(null); setDemoMode(false); }} className="w-full py-3 bg-gray-800 rounded-xl font-semibold">
                    Back
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= ADMIN (kept compact) =============
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
      if (!res.ok) setError(data.error || 'Invalid password');
      else {
        localStorage.setItem('admin_auth', 'true');
        onSuccess();
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-gray-900 p-8 rounded-2xl border-2 border-cyan-500/30 w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-cyan-300 mb-6">Admin Login</h2>
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg mb-4 focus:border-cyan-500 focus:outline-none"
        />
        {error && <div className="text-red-400 text-sm text-center mb-4">{error}</div>}
        <button type="button" onClick={handleLogin} disabled={loading || !password} className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold disabled:opacity-50">
          {loading ? 'Checking…' : 'Login'}
        </button>
      </div>
    </div>
  );
}

function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ free: 1000000, reserved: 0, sold: 0 });

  const loadOrders = async () => {
    try {
      const res = await fetch('/api/orders?action=list');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const res = await fetch('/api/pixels?action=stats');
      setStats(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadOrders(); loadStats(); }, []);

  if (loading) {
    return <div className="min-h-screen bg-black text-white flex items-center justify-center">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900 border-b border-gray-700 p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-cyan-300">Admin — Pixel Art Grid</h1>
        <button type="button" onClick={onLogout} className="px-4 py-2 bg-red-600 rounded-lg font-semibold">Logout</button>
      </header>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Available', value: stats.free, color: 'text-green-400' },
            { label: 'Reserved', value: stats.reserved, color: 'text-yellow-400' },
            { label: 'Sold', value: stats.sold, color: 'text-blue-400' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-xs">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{Number(value || 0).toLocaleString()}</div>
            </div>
          ))}
        </div>
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                {['Reference', 'Pixels', 'Amount', 'Status'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {orders.length === 0 ? (
                <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-500">No orders yet</td></tr>
              ) : orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-3 py-2 font-mono text-xs">{order.reference}</td>
                  <td className="px-3 py-2">{order.pixel_ids.length}</td>
                  <td className="px-3 py-2">£{order.amount_usd}</td>
                  <td className="px-3 py-2">{order.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============= LIVE COUNTER =============
function LiveCounter({ claimed }: { claimed: number }) {
  const remaining = TOTAL_PIXELS - claimed;
  const pct = Math.min(100, (claimed / TOTAL_PIXELS) * 100);
  return (
    <div className="w-full">
      <div className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 text-center">
        <span className="text-2xl sm:text-3xl font-black text-white tabular-nums">{claimed.toLocaleString()}</span>
        <span className="text-gray-500 text-sm sm:text-base">/ {TOTAL_PIXELS.toLocaleString()} PIXELS CLAIMED</span>
      </div>
      <div className="text-center text-cyan-400/90 text-xs sm:text-sm font-semibold mt-1 tracking-wide">
        {remaining.toLocaleString()} REMAINING
      </div>
      <div className="mt-2 h-1.5 bg-gray-800 rounded-full overflow-hidden max-w-md mx-auto">
        <div className="h-full bg-gradient-to-r from-cyan-500 to-green-400 rounded-full transition-all duration-700" style={{ width: `${Math.max(pct, claimed > 0 ? 0.5 : 0)}%` }} />
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
  const [showWhatYouGet, setShowWhatYouGet] = useState(false);
  const [deepLinkHandled, setDeepLinkHandled] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('admin_auth') === 'true') setIsAdmin(true);
  }, []);

  const loadPixelsFromDatabase = useCallback(async () => {
    try {
      const res = await fetch('/api/pixels');
      const { pixels: data } = await res.json();
      const pixelMap = new Map<number, PixelData>();
      let soldCount = 0;
      if (data) {
        data.forEach((row: { pixel_id: number; color?: string; link?: string; status?: string; updated_at?: string; created_at?: string }) => {
          if (row.status === 'sold' || row.status === 'reserved') {
            const enriched = enrichPixel(row);
            pixelMap.set(row.pixel_id, enriched);
            if (row.status === 'sold') soldCount++;
          }
        });
      }
      setPixels(pixelMap);
      setClaimedCount(soldCount);
      return pixelMap;
    } catch (err) {
      console.error('Error loading pixels:', err);
      return new Map<number, PixelData>();
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentIntentId = params.get('payment_intent');
    const redirectStatus = params.get('redirect_status');
    if (paymentIntentId && redirectStatus === 'succeeded') {
      fetch('/api/orders?action=confirm-redirect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentIntentId }),
      }).then(() => {
        loadPixelsFromDatabase();
        window.history.replaceState({}, '', window.location.pathname);
      }).catch(console.error);
    }
  }, [loadPixelsFromDatabase]);

  useEffect(() => {
    loadPixelsFromDatabase().then((map) => {
      if (deepLinkHandled) return;
      const match = window.location.pathname.match(/^\/pixel\/(\d+)\/?$/);
      if (match) {
        const id = Number(match[1]);
        if (!isNaN(id) && id >= 0 && id < TOTAL_PIXELS) {
          const existing = map.get(id);
          setInfoPixel(existing || { id, color: '#1a1a1a', link: '', status: 'free' });
          setSearchedPixel(id);
          setDeepLinkHandled(true);
        }
      }
    });
  }, [loadPixelsFromDatabase, deepLinkHandled]);

  // Soft-refresh claimed counter periodically
  useEffect(() => {
    const t = setInterval(() => { loadPixelsFromDatabase(); }, 60000);
    return () => clearInterval(t);
  }, [loadPixelsFromDatabase]);

  const openClaim = (ids: number[]) => {
    setSelected(new Set(ids));
    setActivePixels(ids);
  };

  /** Primary UX: tap free pixel → claim immediately */
  const handlePixelSelect = (id: number) => {
    const existing = pixels.get(id);
    if (existing && existing.status && existing.status !== 'free') {
      setInfoPixel(existing);
      return;
    }
    openClaim([id]);
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
    // Prefer a random free id for better UX than scanning from 0
    for (let attempt = 0; attempt < 5000; attempt++) {
      const i = Math.floor(Math.random() * TOTAL_PIXELS);
      if (!pixels.has(i) || pixels.get(i)?.status === 'free') {
        setSearchedPixel(i);
        openClaim([i]);
        return;
      }
    }
    for (let i = 0; i < TOTAL_PIXELS; i++) {
      if (!pixels.has(i) || pixels.get(i)?.status === 'free') {
        setSearchedPixel(i);
        openClaim([i]);
        return;
      }
    }
    alert('No free pixels available!');
  };

  const handlePaymentSuccess = () => {
    loadPixelsFromDatabase();
    setSelected(new Set());
  };

  if (showTerms) return <TermsPage onClose={() => setShowTerms(false)} />;
  if (showAdmin && !isAdmin) return <AdminLogin onSuccess={() => setIsAdmin(true)} />;
  if (showAdmin && isAdmin) {
    return (
      <AdminDashboard
        onLogout={() => {
          localStorage.removeItem('admin_auth');
          setIsAdmin(false);
          setShowAdmin(false);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-black/95 backdrop-blur border-b border-gray-800 px-3 sm:px-4 py-2.5 flex items-center gap-2 flex-shrink-0">
        <div className="min-w-0">
          <div className="font-bold text-sm sm:text-base bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent truncate">
            Pixel Art Grid
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="#"
            inputMode="numeric"
            className="bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5 w-16 sm:w-24 text-sm focus:border-cyan-500 focus:outline-none"
            aria-label="Search pixel number"
          />
          <button type="button" onClick={handleSearch} className="bg-gray-800 hover:bg-gray-700 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold">Find</button>
          <button type="button" onClick={buyRandom} className="bg-purple-700 hover:bg-purple-600 px-2.5 py-1.5 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap">🎲 Random</button>
          <button type="button" onClick={() => setShowAdmin(true)} className="hidden sm:inline-flex bg-gray-900 hover:bg-gray-800 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-gray-400">Admin</button>
        </div>
      </header>

      {/* HERO / POSITIONING */}
      <section className="flex-shrink-0 px-4 pt-5 pb-3 sm:pt-8 sm:pb-4 text-center border-b border-gray-900">
        <p className="text-[10px] sm:text-xs font-bold tracking-[0.2em] text-cyan-500 uppercase mb-2">1,000,000 pixels · £1 each</p>
        <h1 className="text-2xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight mb-2">
          LEAVE YOUR MARK<br className="sm:hidden" /> ON THE INTERNET.
        </h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto mb-4">
          Choose a pixel. Choose its colour. Leave your mark.
        </p>
        <LiveCounter claimed={claimedCount} />
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={buyRandom}
            className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold text-sm shadow-lg shadow-green-500/20"
          >
            CLAIM YOUR PIXEL — £1
          </button>
          <button
            type="button"
            onClick={() => setShowWhatYouGet((v) => !v)}
            className="px-4 py-2.5 bg-gray-900 border border-gray-700 hover:border-cyan-600 rounded-xl font-semibold text-sm text-gray-300"
          >
            What am I getting?
          </button>
        </div>
        {showWhatYouGet && (
          <div className="mt-4 max-w-lg mx-auto text-left">
            <WhatYouGetPanel />
          </div>
        )}
      </section>

      {/* GRID — product centre */}
      <section className="flex-1 min-h-[50vh] sm:min-h-[60vh] relative">
        <div className="absolute inset-0">
          <PixelGrid
            pixels={pixels}
            searchedPixel={searchedPixel}
            selected={selected}
            onPixelSelect={handlePixelSelect}
            onHover={(pixel, x, y) => setHovered(pixel ? { pixel, x, y } : null)}
            onPixelClickInfo={handlePixelClickInfo}
          />
        </div>
      </section>

      {/* Desktop hover tooltip */}
      {hovered?.pixel && (
        <div
          className="hidden md:block fixed bg-gray-900 border border-cyan-500/50 rounded-lg px-3 py-2 text-xs pointer-events-none shadow-2xl z-40"
          style={{ left: hovered.x + 16, top: hovered.y + 16 }}
        >
          <div className="font-bold text-cyan-300">#{hovered.pixel.id.toLocaleString()}</div>
          <div className={hovered.pixel.status === 'sold' ? 'text-gray-300' : hovered.pixel.status === 'reserved' ? 'text-yellow-400' : 'text-green-400'}>
            {hovered.pixel.status === 'sold'
              ? (hovered.pixel.owner || parsePixelMeta(hovered.pixel.link).owner || 'Claimed')
              : hovered.pixel.status === 'reserved'
                ? 'Reserved'
                : 'Available · £1'}
          </div>
        </div>
      )}

      {infoPixel && (
        <PixelInfoModal
          pixel={infoPixel}
          shareable
          onClose={() => {
            setInfoPixel(null);
            if (window.location.pathname.startsWith('/pixel/')) {
              window.history.replaceState({}, '', '/');
            }
          }}
          onBuy={(id) => openClaim([id])}
        />
      )}

      {activePixels && (
        <ClaimModal
          pixelIds={activePixels}
          onClose={() => { setActivePixels(null); setSelected(new Set()); }}
          onSuccess={handlePaymentSuccess}
        />
      )}

      <footer className="flex-shrink-0 bg-black border-t border-gray-900 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-gray-500">
        <span>1,000,000 pixels. £1 each. Leave your mark.</span>
        <div className="flex items-center gap-4">
          <button type="button" onClick={() => setShowWhatYouGet(true)} className="hover:text-cyan-400 underline">What you get</button>
          <button type="button" onClick={() => setShowTerms(true)} className="hover:text-cyan-400 underline">Terms</button>
          <button type="button" onClick={() => setShowAdmin(true)} className="sm:hidden hover:text-gray-300">Admin</button>
          <span>© 2026 Pixel Art Grid</span>
        </div>
      </footer>
    </div>
  );
}
