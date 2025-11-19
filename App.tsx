// App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PixelData } from './types';
import PixelGrid from './components/PixelGrid';

const TOTAL_PIXELS = 1_000_000;
const GRID_WIDTH = 1000;
const PIXEL_PRICE = 1; // $1 per pixel

// WHOP placeholders
const WHOP_CHECKOUT_BASE = 'https://buy.whop.com/checkout';
const WHOP_PRODUCT_ID = 'YOUR_WHO P_PRODUCT_ID';

interface Receipt {
  pixelId: number;
  color: string;
  link: string;
  price: number;
  purchaseDate: string;
  transactionId: string;
}

interface SearchResult {
  id: number;
  data: PixelData | null;
}

export default function App() {
  // Use a ref for the Map to avoid re-creating identity frequently
  const pixelsRef = useRef<Map<number, PixelData>>(new Map());
  const [, forceRender] = useState(0);

  const [notification, setNotification] = useState<string | null>(null);
  const [selectedPixelForPurchase, setSelectedPixelForPurchase] = useState<number | null>(null);
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ pixel: PixelData; x: number; y: number } | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [currentReceipt, setCurrentReceipt] = useState<Receipt | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // zoom state (scale). persistent for session.
  const [scale, setScale] = useState<number>(() => {
    try {
      const s = sessionStorage.getItem('mpg:scale');
      return s ? Number(s) : 1;
    } catch {
      return 1;
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem('mpg:scale', String(scale));
    } catch {}
  }, [scale]);

  const MIN_SCALE = 1;
  const MAX_SCALE = 8;
  const SCALE_STEP = 0.25;

  // init sample pixels (same as before)
  useEffect(() => {
    const initial = pixelsRef.current;
    let created = 0;
    while (created < 500) {
      const randomId = Math.floor(Math.random() * TOTAL_PIXELS);
      if (!initial.has(randomId)) {
        initial.set(randomId, {
          id: randomId,
          color: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
          link: 'https://example.com'
        });
        created++;
      }
    }
    forceRender(n => n + 1);

    const interval = setInterval(() => {
      const prev = pixelsRef.current;
      let randomId;
      let attempts = 0;
      do {
        randomId = Math.floor(Math.random() * TOTAL_PIXELS);
        attempts++;
        if (attempts > 500) return;
      } while (prev.has(randomId));

      const newPixel: PixelData = {
        id: randomId,
        color: `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`,
        link: 'https://example.com'
      };

      prev.set(randomId, newPixel);
      forceRender(n => n + 1);

      setNotification(`🔥 Pixel #${randomId} was just purchased by another user!`);
      setTimeout(() => setNotification(null), 4000);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handlePixelSelect = useCallback((pixelId: number) => {
    const existingPixel = pixelsRef.current.get(pixelId);
    if (existingPixel) {
      window.open(existingPixel.link, '_blank', 'noopener,noreferrer');
    } else {
      setSelectedPixelForPurchase(pixelId);
    }
  }, []);

  const handlePixelHover = useCallback((pixelId: number | null, mouseX: number, mouseY: number) => {
    if (pixelId === null) {
      setTooltip(null);
      return;
    }
    const pixelData = pixelsRef.current.get(pixelId);
    if (pixelData) {
      setTooltip({ pixel: pixelData, x: mouseX, y: mouseY });
    } else {
      setTooltip(null);
    }
  }, []);

  const handlePaymentSuccess = (pixelId: number, color: string, link: string, email: string, receipt: Receipt) => {
    const newPixel: PixelData = {
      id: pixelId,
      color,
      link
    };
    pixelsRef.current.set(pixelId, newPixel);
    forceRender(n => n + 1);

    setNotification(`✨ You purchased Pixel #${pixelId}!`);
    setSelectedPixelForPurchase(null);
    setCurrentReceipt(receipt);
    
    setTimeout(() => setNotification(null), 4000);
  };

  // receipt download
  const handleDownloadReceipt = () => {
    if (!currentReceipt) return;
    const receiptText = `
═══════════════════════════════════════
    MILLION PIXEL GRID - RECEIPT
═══════════════════════════════════════

Pixel ID: #${currentReceipt.pixelId}
Color: ${currentReceipt.color}
Link: ${currentReceipt.link}

Price: $${currentReceipt.price.toFixed(2)}
Purchase Date: ${currentReceipt.purchaseDate}
Transaction ID: ${currentReceipt.transactionId}

═══════════════════════════════════════
Thank you for your purchase!
Your pixel is now part of internet history.
═══════════════════════════════════════
    `.trim();

    const blob = new Blob([receiptText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pixel-${currentReceipt.pixelId}-receipt.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Centers pixel in view — accounts for canvas CSS size at current scale
  const centerPixelInView = (id: number) => {
    const container = gridContainerRef.current;
    if (!container) return;
    const canvas = container.querySelector('canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const xIndex = id % GRID_WIDTH;
    const yIndex = Math.floor(id / GRID_WIDTH);

    const pixelCssX = (xIndex / GRID_WIDTH) * canvasRect.width;
    const pixelCssY = (yIndex / GRID_HEIGHT) * canvasRect.height;

    const pixelClientX = canvasRect.left + pixelCssX;
    const pixelClientY = canvasRect.top + pixelCssY;

    const desiredScrollLeft = container.scrollLeft + (pixelClientX - containerRect.left) - container.clientWidth / 2;
    const desiredScrollTop = container.scrollTop + (pixelClientY - containerRect.top) - container.clientHeight / 2;

    container.scrollTo({
      left: Math.max(0, Math.round(desiredScrollLeft)),
      top: Math.max(0, Math.round(desiredScrollTop)),
      behavior: 'smooth'
    });
  };

  const handleSearch = () => {
    const id = parseInt(searchInput, 10);
    if (!isNaN(id) && id >= 0 && id < TOTAL_PIXELS) {
      setSearchedPixel(id);
      const pixelData = pixelsRef.current.get(id);
      setSearchResult({
        id,
        data: pixelData || null
      });
      centerPixelInView(id);
    } else {
      alert(`Please enter a number between 0 and ${TOTAL_PIXELS - 1}.`);
    }
  };

  // Zoom helpers
  const zoomIn = () => setScale(s => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(3)));
  const zoomOut = () => setScale(s => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(3)));
  const resetZoom = () => setScale(1);
  const onSliderChange = (v: number) => {
    const clamped = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v));
    setScale(clamped);
  };

  // UI: header controls include zoom buttons and slider
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm z-40 border-b border-gray-700">
        <div className="flex items-center justify-between p-3 gap-4">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <h1 className="text-lg md:text-2xl font-bold tracking-tight">Million Pixel Grid</h1>
              <p className="text-xs md:text-sm text-gray-400">Own your pixel for $1</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-center max-w-2xl px-4">
            <input
              type="number"
              min="0"
              max={TOTAL_PIXELS - 1}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search pixel #"
              className="flex-1 max-w-lg bg-gray-800 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleSearch} className="px-3 py-2 bg-blue-600 rounded-md font-semibold hover:bg-blue-500">
              Search
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
              <button onClick={zoomOut} className="px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600">−</button>
              <div className="text-sm px-2">Zoom {Math.round(scale * 100)}%</div>
              <button onClick={zoomIn} className="px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600">+</button>
              <button onClick={resetZoom} className="ml-3 px-2 py-1 rounded-md bg-gray-700 hover:bg-gray-600">Reset</button>
            </div>

            <div className="text-center bg-gray-800 px-3 py-2 rounded-lg">
              <div className="text-sm font-semibold">{pixelsRef.current.size.toLocaleString()} / {TOTAL_PIXELS.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Pixels Sold</div>
            </div>
          </div>
        </div>

        {/* Mobile friendly zoom controls under header (visible on small screens) */}
        <div className="md:hidden px-3 pb-2 pt-0">
          <div className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <button onClick={zoomOut} className="px-3 py-1 rounded-md bg-gray-800">−</button>
              <button onClick={resetZoom} className="px-3 py-1 rounded-md bg-gray-800">Reset</button>
              <button onClick={zoomIn} className="px-3 py-1 rounded-md bg-gray-800">+</button>
            </div>
            <div className="text-xs text-gray-300">Zoom {Math.round(scale * 100)}%</div>
          </div>
          <input
            type="range"
            min={MIN_SCALE}
            max={MAX_SCALE}
            step={SCALE_STEP}
            value={scale}
            onChange={e => onSliderChange(Number(e.target.value))}
            className="w-full mt-2 accent-blue-500"
          />
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="fixed top-28 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full shadow-lg animate-pulse">
          {notification}
        </div>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: 'fixed',
            top: tooltip.y + 20,
            left: tooltip.x,
            transform: 'translateX(-50%)',
            pointerEvents: 'none'
          }}
          className="z-50 p-3 bg-gray-900 rounded-md shadow-lg border border-gray-600 max-w-xs text-sm"
        >
          <p className="font-bold">Pixel #{tooltip.pixel.id}</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="w-4 h-4 rounded border" style={{ backgroundColor: tooltip.pixel.color }}></div>
            <a href={tooltip.pixel.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate">
              {tooltip.pixel.link}
            </a>
          </div>
        </div>
      )}

      {/* Grid container */}
      <main ref={gridContainerRef} className="flex-1 pt-[112px] overflow-auto bg-gray-950">
        <div className="w-[1000px] h-[1000px] mx-auto my-8 bg-gray-900 border-4 border-gray-600 shadow-2xl">
          <PixelGrid
            pixels={pixelsRef.current}
            onPixelSelect={handlePixelSelect}
            searchedPixel={searchedPixel}
            onPixelHover={handlePixelHover}
            scale={scale}
          />
        </div>
      </main>

      {/* Payment & Receipt modals (kept simple here) */}
      {/* PaymentModal and ReceiptModal - you can reuse your existing modal implementations. */}
      {/* For brevity I omitted their JSX here since earlier turns provided ready versions. */}
      {/* Put your PaymentModal and ReceiptModal components here as before */}
    </div>
  );
}
