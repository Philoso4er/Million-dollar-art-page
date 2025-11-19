// App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { PixelData } from './types';
import PixelGrid from './components/PixelGrid';

const TOTAL_PIXELS = 1_000_000;
const GRID_WIDTH = 1000;
const PIXEL_PRICE = 1; // $1 per pixel

// WHOP: replace these with your real Whop checkout info
const WHOP_CHECKOUT_BASE = 'https://buy.whop.com/checkout'; // placeholder
const WHOP_PRODUCT_ID = 'YOUR_WHO P_PRODUCT_ID'; // placeholder

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

// Receipt Modal Component (unchanged)
const ReceiptModal: React.FC<{ receipt: Receipt | null; onClose: () => void; onDownload: () => void }> = ({ receipt, onClose, onDownload }) => {
  if (!receipt) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose} aria-hidden>
      <div role="dialog" aria-modal="true" aria-label="Purchase receipt" className="bg-white text-gray-900 rounded-lg shadow-xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-6">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold mb-2">Purchase Successful!</h2>
          <p className="text-gray-600">Your pixel is now immortalized on the grid</p>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-6 mb-6 border-2 border-dashed border-gray-300">
          <h3 className="font-bold text-lg mb-4 text-center">Receipt</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pixel ID:</span>
              <span className="font-mono font-bold">#{receipt.pixelId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Color:</span>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded border-2 border-gray-300" style={{ backgroundColor: receipt.color }}></div>
                <span className="font-mono">{receipt.color}</span>
              </div>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Link:</span>
              <span className="font-mono text-xs truncate max-w-[200px]">{receipt.link}</span>
            </div>
            <div className="border-t border-gray-300 pt-3 mt-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-bold text-green-600">${receipt.price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-600">Date:</span>
                <span className="text-xs">{receipt.purchaseDate}</span>
              </div>
              <div className="flex justify-between mt-2">
                <span className="text-gray-600">Transaction ID:</span>
                <span className="font-mono text-xs">{receipt.transactionId}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onDownload} className="flex-1 px-6 py-3 rounded-md bg-blue-600 text-white hover:bg-blue-500 font-semibold transition-colors">
            Download Receipt
          </button>
          <button onClick={onClose} className="flex-1 px-6 py-3 rounded-md bg-gray-200 hover:bg-gray-300 font-semibold transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Payment Modal Component (Whop + demo fallback)
const PaymentModal: React.FC<{ 
  pixelId: number | null; 
  onClose: () => void; 
  onPaymentSuccess: (pixelId: number, color: string, link: string, email: string, receipt: Receipt) => void;
}> = ({ pixelId, onClose, onPaymentSuccess }) => {
  const [color, setColor] = useState('#3B82F6');
  const [link, setLink] = useState('https://');
  const [email, setEmail] = useState('');
  const [processing, setProcessing] = useState(false);

  const openWhopCheckout = () => {
    if (pixelId === null) return;
    try {
      new URL(link);
    } catch {
      alert('Please enter a valid URL.');
      return;
    }
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email.');
      return;
    }
    const params = new URLSearchParams({
      product: WHOP_PRODUCT_ID,
      pixelId: String(pixelId),
      color,
      link,
      email
    });
    const checkoutUrl = `${WHOP_CHECKOUT_BASE}?${params.toString()}`;
    window.open(checkoutUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const handleDemoPay = () => {
    if (pixelId === null) return;
    try {
      new URL(link);
    } catch {
      alert('Please enter a valid URL.');
      return;
    }
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email.');
      return;
    }
    setProcessing(true);
    setTimeout(() => {
      const receipt: Receipt = {
        pixelId: pixelId!,
        color,
        link,
        price: PIXEL_PRICE,
        purchaseDate: new Date().toLocaleString(),
        transactionId: `TXN-${Date.now()}-${Math.random().toString(36).slice(2,11).toUpperCase()}`
      };
      onPaymentSuccess(pixelId!, color, link, email, receipt);
      setProcessing(false);
    }, 900);
  };

  if (pixelId === null) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`Purchase pixel ${pixelId}`} className="bg-gray-900 text-white rounded-lg shadow-xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-2">Purchase Pixel #{pixelId}</h2>
        <p className="text-gray-400 mb-6">Price: <span className="text-green-400 font-bold text-xl">${PIXEL_PRICE.toFixed(2)}</span></p>
        
        <div className="space-y-5">
          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Pixel Color</label>
            <div className="flex items-center gap-4">
              <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-16 h-16 p-1 bg-gray-700 border border-gray-600 rounded-md cursor-pointer" />
              <input type="text" value={color} onChange={e => setColor(e.target.value)} className="flex-1 bg-gray-800 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2 font-semibold">Your Link (URL)</label>
            <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://example.com" className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="border-t border-gray-700 pt-5">
            <h3 className="font-bold text-lg mb-4">Checkout</h3>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" className="w-full bg-gray-800 border border-gray-600 rounded-md px-3 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <p className="text-sm text-gray-400 mb-3">Click "Checkout with Whop" to complete your purchase securely through Whop. After payment, use your receipt or our webhook to finalize ownership on the grid.</p>

            <div className="flex gap-3">
              <button onClick={openWhopCheckout} className="flex-1 px-6 py-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors">
                Checkout with Whop
              </button>

              <button onClick={handleDemoPay} disabled={processing} className="px-4 py-3 rounded-md bg-gray-700 hover:bg-gray-600 text-white transition-colors">
                {processing ? 'Processing...' : 'Demo Pay'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-700 hover:bg-gray-600">Cancel</button>
        </div>
      </div>
    </div>
  );
};

// Main App Component
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

  // mobile hint session state (persist in sessionStorage)
  const [hideMobileHint, setHideMobileHint] = useState(() => {
    try {
      return sessionStorage.getItem('mpg:hideMobileHint') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem('mpg:hideMobileHint', hideMobileHint ? '1' : '0');
    } catch {}
  }, [hideMobileHint]);

  // initialize sample pixels once
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

    // Simulate live purchases from other users
    const interval = setInterval(() => {
      const prev = pixelsRef.current;
      let randomId;
      let attempts = 0;
      do {
        randomId = Math.floor(Math.random() * TOTAL_PIXELS);
        attempts++;
        if (attempts > 500) return; // give up if grid nearly full
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

  // Stable handlers that use pixelsRef directly
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

  // Centers pixel in the scroll container using actual canvas CSS size & bounding rects
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

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-900 text-white">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-gray-900/95 backdrop-blur-sm z-30 border-b border-gray-700">
        <div className="flex items-center justify-between p-4 gap-4">
          <div className="flex flex-col flex-shrink-0">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Million Pixel Grid</h1>
            <p className="text-sm text-gray-400">Own your pixel for $1</p>
          </div>
          
          <div className="flex gap-2 flex-1 max-w-md">
            <input
              type="number"
              min="0"
              max={TOTAL_PIXELS-1}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search pixel #"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button onClick={handleSearch} className="px-4 py-2 bg-blue-600 rounded-md font-semibold hover:bg-blue-500">
              Search
            </button>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-center bg-gray-800 px-4 py-2 rounded-lg">
              <div className="text-lg font-bold">{pixelsRef.current.size.toLocaleString()} / {TOTAL_PIXELS.toLocaleString()}</div>
              <div className="text-xs text-gray-400">Pixels Sold</div>
            </div>
          </div>
        </div>
      </header>

      {/* Notification */}
      {notification && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-full shadow-lg animate-pulse">
          {notification}
        </div>
      )}

      {/* Mobile hint pill (visible only on small screens) */}
      {!hideMobileHint && (
        <div className="md:hidden fixed top-[72px] left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-md px-4">
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-full py-2 px-4 flex items-center justify-between gap-3 shadow-lg border border-gray-700">
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <strong className="block text-white">Tap to select</strong>
                <span className="text-xs text-gray-300">Long-press to preview • Use two-finger drag to pan</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setHideMobileHint(true)}
                className="text-xs px-3 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-white"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search Result Display */}
      {searchResult && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <div className="bg-gray-800/95 backdrop-blur-sm rounded-lg shadow-2xl border border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">Pixel #{searchResult.id}</h3>
              <button 
                onClick={() => {
                  setSearchResult(null);
                  setSearchedPixel(null);
                }}
                className="p-1 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {searchResult.data ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <div className="text-2xl">🔒</div>
                  <div>
                    <p className="font-semibold text-red-400">Unavailable</p>
                    <p className="text-sm text-gray-400">This pixel has been purchased</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Color</label>
                    <div className="flex items-center gap-3 mt-1">
                      <div className="w-12 h-12 rounded-lg border-2 border-gray-600 shadow-lg" style={{ backgroundColor: searchResult.data.color }}></div>
                      <span className="font-mono text-gray-300">{searchResult.data.color}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Redirect Link</label>
                    <div className="mt-1 p-3 bg-gray-900/50 rounded-lg border border-gray-700">
                      <a href={searchResult.data.link} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 hover:underline break-all text-sm">
                        {searchResult.data.link}
                      </a>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => window.open(searchResult.data!.link, '_blank', 'noopener,noreferrer')}
                  className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Visit Link →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-green-500/20 border border-green-500/50 rounded-lg">
                  <div className="text-2xl">✨</div>
                  <div>
                    <p className="font-semibold text-green-400">Available</p>
                    <p className="text-sm text-gray-400">This pixel is ready to claim!</p>
                  </div>
                </div>

                <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-gray-400">Price:</span>
                    <span className="text-2xl font-bold text-green-400">${PIXEL_PRICE}</span>
                  </div>
                  <p className="text-xs text-gray-500">One-time payment • Instant ownership • Forever yours</p>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-400">When you purchase, you can:</p>
                  <ul className="text-sm text-gray-300 space-y-1 ml-4">
                    <li>• Set a redirect link to any website</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    setSearchResult(null);
                    setSelectedPixelForPurchase(searchResult.id);
                  }}
                  className="w-full px-4 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  Purchase This Pixel
                </button>

                <button
                  onClick={() => {
                    centerPixelInView(searchResult.id);
                  }}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors text-sm"
                >
                  View on Grid
                </button>
              </div>
            )}
          </div>
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

      {/* Grid */}
      <main ref={gridContainerRef} className="flex-1 pt-[88px] overflow-auto bg-gray-950">
        <div className="w-[1000px] h-[1000px] mx-auto my-8 bg-gray-900 border-4 border-gray-600 shadow-2xl">
          <PixelGrid
            pixels={pixelsRef.current}
            onPixelSelect={handlePixelSelect}
            searchedPixel={searchedPixel}
            onPixelHover={handlePixelHover}
          />
        </div>
      </main>

      {/* Modals */}
      <PaymentModal
        pixelId={selectedPixelForPurchase}
        onClose={() => setSelectedPixelForPurchase(null)}
        onPaymentSuccess={handlePaymentSuccess}
      />

      <ReceiptModal
        receipt={currentReceipt}
        onClose={() => setCurrentReceipt(null)}
        onDownload={handleDownloadReceipt}
      />
    </div>
  );
}
