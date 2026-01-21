import React, { useEffect, useState, useRef } from 'react';

// Load Flutterwave script
const loadFlutterwaveScript = () => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).FlutterwaveCheckout) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.flutterwave.com/v3.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load Flutterwave'));
    document.head.appendChild(script);
  });
};

const GRID_SIZE = 1000;
const TOTAL_PIXELS = 1_000_000;
const CRYPTO_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb';

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

// ============= PIXEL GRID COMPONENT =============
function PixelGrid({ 
  pixels, 
  selected, 
  searchedPixel, 
  onPixelSelect, 
  onHover 
}: {
  pixels: Map<number, PixelData>;
  selected: Set<number>;
  searchedPixel: number | null;
  onPixelSelect: (id: number) => void;
  onHover: (pixel: PixelData | null, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    canvas.width = 1000;
    canvas.height = 1000;
    
    // Draw background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 1000, 1000);

    // Draw sold/reserved pixels
    pixels.forEach((p) => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      ctx.fillStyle = p.color || '#1a1a1a';
      ctx.fillRect(x, y, 1, 1);
    });

    // Highlight searched pixel with yellow border
    if (searchedPixel !== null) {
      const x = searchedPixel % GRID_SIZE;
      const y = Math.floor(searchedPixel / GRID_SIZE);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, 3, 3);
    }

    // Highlight selected pixels with cyan border
    selected.forEach((id) => {
      const x = id % GRID_SIZE;
      const y = Math.floor(id / GRID_SIZE);
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, 3, 3);
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
    
    if (x >= 0 && x < 1000 && y >= 0 && y < 1000) {
      return y * GRID_SIZE + x;
    }
    return null;
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-950 p-4">
      <div className="relative" style={{ maxWidth: '800px', maxHeight: '800px', width: '100%', height: '100%' }}>
        <canvas
          ref={canvasRef}
          className="border-2 border-gray-700 rounded-lg cursor-crosshair w-full h-full"
          style={{ imageRendering: 'pixelated', objectFit: 'contain' }}
          onMouseMove={(e) => {
            const id = getPixelId(e);
            if (id !== null) {
              const pixel = pixels.get(id);
              onHover(
                pixel || { id, color: '#0a0a0a', link: '', status: 'free' }, 
                e.clientX, 
                e.clientY
              );
            }
          }}
          onMouseLeave={() => onHover(null, 0, 0)}
          onClick={(e) => {
            const id = getPixelId(e);
            if (id !== null && (!pixels.has(id) || pixels.get(id)?.status === 'free')) {
              onPixelSelect(id);
            }
          }}
        />
      </div>
    </div>
  );
}

// ============= PAYMENT MODAL COMPONENT =============
function PaymentModal({ 
  pixelIds, 
  onClose,
  onSuccess
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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'crypto'>('card');
  const [loading, setLoading] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);

  useEffect(() => {
    loadFlutterwaveScript();
  }, []);

  const updateIndividual = (index: number, key: 'color' | 'link', value: string) => {
    setIndividualData((prev) => {
      const next = [...prev];
      next[index][key] = value;
      return next;
    });
  };

  const createOrder = async () => {
    const payload = mode === 'sync'
      ? { pixelIds, mode, color: syncColor, link: syncLink }
      : { pixelIds, mode, individual: individualData };

    try {
      const res = await fetch('/api/orders?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response received');
        const text = await res.text();
        console.error('Response text:', text);
        throw new Error('Server error - please check your API configuration');
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create order');
      return data;
    } catch (err: any) {
      console.error('Create order error:', err);
      throw err;
    }
  };

  const handleCardPayment = async () => {
    setLoading(true);
    try {
      const data = await createOrder();
      
      console.log('Order created:', data);
      
      const FLW = (window as any).FlutterwaveCheckout;
      
      if (!FLW) {
        alert('Payment gateway not loaded. Please refresh and try again.');
        setLoading(false);
        return;
      }

      const publicKey = import.meta.env.VITE_FLW_PUBLIC_KEY;
      
      if (!publicKey || publicKey === 'FLWPUBK_TEST-XXXXX') {
        alert('⚠️ Payment gateway not configured. Please add VITE_FLW_PUBLIC_KEY to your environment variables.');
        setLoading(false);
        return;
      }

      console.log('Initializing Flutterwave with reference:', data.reference);

      FLW({
        public_key: publicKey,
        tx_ref: data.reference,
        amount: pixelIds.length,
        currency: 'USD',
        payment_options: 'card,mobilemoney,ussd',
        customer: { 
          email: 'buyer@pixelgrid.com', 
          name: 'Pixel Buyer' 
        },
        customizations: {
          title: 'Million Pixel Grid',
          description: `${pixelIds.length} pixels - ${pixelIds.length}`,
          logo: '',
        },
        callback: (payment: any) => {
          console.log('Payment callback:', payment);
          if (payment.status === 'successful') {
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 1000);
          }
        },
        onclose: () => {
          console.log('Payment modal closed');
          setLoading(false);
        },
      });
    } catch (err: any) {
      console.error('Payment error:', err);
      alert('Error: ' + err.message);
      setLoading(false);
    }
  };

  const handleCryptoPayment = async () => {
    setLoading(true);
    try {
      const data = await createOrder();
      setOrderRef(data.reference);
      setLoading(false);
    } catch (err: any) {
      alert(err.message);
      setLoading(false);
    }
  };

  const uploadProof = async () => {
    if (!proofFile || !orderRef) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('proof', proofFile);
    formData.append('reference', orderRef);

    try {
      const res = await fetch('/api/upload-proof', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        alert('✅ Proof uploaded! Admin will verify your payment within 24 hours.');
        onClose();
      } else {
        alert('❌ Upload failed. Please try again.');
      }
    } catch {
      alert('❌ Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-cyan-500/30 shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? 's' : ''} - ${pixelIds.length} USD
            </h2>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-white text-3xl font-bold leading-none"
            >
              ×
            </button>
          </div>

          {!orderRef && (
            <>
              {/* Mode Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setMode('sync')}
                  className={`py-3 rounded-lg font-bold transition ${
                    mode === 'sync'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🎨 Same Color & Link
                </button>
                <button
                  onClick={() => setMode('individual')}
                  className={`py-3 rounded-lg font-bold transition ${
                    mode === 'individual'
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  🖌️ Individual Settings
                </button>
              </div>

              {/* Sync Mode Inputs */}
              {mode === 'sync' && (
                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      🎨 Pixel Color
                    </label>
                    <input
                      type="color"
                      value={syncColor}
                      onChange={(e) => setSyncColor(e.target.value)}
                      className="w-full h-14 rounded-lg cursor-pointer border-2 border-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-300 mb-2">
                      🔗 Link (optional)
                    </label>
                    <input
                      type="url"
                      placeholder="https://yoursite.com"
                      value={syncLink}
                      onChange={(e) => setSyncLink(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Individual Mode Inputs */}
              {mode === 'individual' && (
                <div className="max-h-64 overflow-y-auto mb-6 space-y-3 pr-2">
                  {individualData.map((p, i) => (
                    <div key={p.id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                      <div className="font-bold text-sm text-cyan-400 mb-3">
                        Pixel #{p.id}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="color"
                          value={p.color}
                          onChange={(e) => updateIndividual(i, 'color', e.target.value)}
                          className="w-full h-10 rounded cursor-pointer"
                        />
                        <input
                          type="url"
                          placeholder="https://..."
                          value={p.link}
                          onChange={(e) => updateIndividual(i, 'link', e.target.value)}
                          className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Payment Method Selection */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`py-4 rounded-lg font-bold transition ${
                    paymentMethod === 'card'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  💳 Card/Mobile Money
                </button>
                <button
                  onClick={() => setPaymentMethod('crypto')}
                  className={`py-4 rounded-lg font-bold transition ${
                    paymentMethod === 'crypto'
                      ? 'bg-gradient-to-r from-orange-500 to-yellow-600 text-white shadow-lg shadow-orange-500/50'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  ₿ Crypto
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition"
                >
                  Cancel
                </button>
                <button
                  onClick={paymentMethod === 'card' ? handleCardPayment : handleCryptoPayment}
                  disabled={loading}
                  className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? '⏳ Processing...' : `💰 Pay $${pixelIds.length}`}
                </button>
              </div>
            </>
          )}

          {/* Crypto Payment Instructions */}
          {orderRef && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500 rounded-xl p-6">
                <h3 className="font-bold text-yellow-300 mb-3 text-lg">📋 Order Reference</h3>
                <p className="text-white font-mono text-xl bg-black/50 p-3 rounded break-all">
                  {orderRef}
                </p>
              </div>

              <div className="bg-gray-800 border-2 border-cyan-500/30 p-6 rounded-xl">
                <h3 className="font-bold text-cyan-300 mb-3 text-lg">
                  💰 Send ${pixelIds.length} USD worth of crypto to:
                </h3>
                <div className="bg-black/70 p-4 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">USDT/USDC (ETH/BSC/Polygon):</p>
                  <p className="text-white font-mono text-sm break-all bg-gray-900 p-3 rounded">
                    {CRYPTO_ADDRESS}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-3">
                  📸 Upload Payment Screenshot/Proof
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
                />
              </div>

              <button
                onClick={uploadProof}
                disabled={!proofFile || loading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '⏳ Uploading...' : '📤 Submit Proof'}
              </button>
            </div>
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

  const handleLogin = () => {
    setLoading(true);
    setError('');

    const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

    if (password === ADMIN_PASS) {
      localStorage.setItem('admin_auth', 'true');
      onSuccess();
    } else {
      setError('❌ Invalid password');
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-gray-900 p-8 rounded-2xl border-2 border-cyan-500/30 w-full max-w-md">
        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-6">
          🔐 Admin Login
        </h2>
        <input
          type="password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white focus:border-cyan-500 focus:outline-none mb-4"
          disabled={loading}
        />
        {error && (
          <div className="text-red-400 text-sm text-center mb-4">{error}</div>
        )}
        <button
          onClick={handleLogin}
          disabled={loading || !password}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-lg font-bold hover:from-cyan-600 hover:to-blue-700 transition disabled:opacity-50"
        >
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
      const res = await fetch('/api/orders?action=cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        alert('✅ Cleanup completed successfully!');
        loadOrders();
        loadStats();
      } else {
        alert('❌ Cleanup failed');
      }
    } catch (err) {
      alert('❌ Network error');
    } finally {
      setCleanupLoading(false);
    }
  };

  const markPaid = async (id: string) => {
    if (!confirm('Mark this order as paid and assign pixels?')) return;

    try {
      const res = await fetch('/api/orders?action=update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      });

      if (res.ok) {
        alert('✅ Order marked as paid and pixels assigned!');
        loadOrders();
        loadStats();
      } else {
        alert('❌ Failed to update order');
      }
    } catch (err) {
      alert('❌ Network error');
    }
  };

  const deleteOrder = async (id: string, reference: string) => {
    if (!confirm(`Delete order ${reference}? This will free up the reserved pixels.`)) return;

    try {
      const res = await fetch('/api/orders?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id }),
      });

      if (res.ok) {
        alert('✅ Order deleted and pixels freed!');
        loadOrders();
        loadStats();
      } else {
        alert('❌ Failed to delete order');
      }
    } catch (err) {
      alert('❌ Network error');
    }
  };

  useEffect(() => {
    loadOrders();
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900 border-b border-gray-700 p-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <div className="flex gap-3">
            <button
              onClick={manualCleanup}
              disabled={cleanupLoading}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition font-semibold disabled:opacity-50"
            >
              {cleanupLoading ? '🔄 Cleaning...' : '🧹 Cleanup Expired'}
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Free Pixels</div>
            <div className="text-3xl font-bold text-green-400">
              {stats.free.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Reserved</div>
            <div className="text-3xl font-bold text-yellow-400">
              {stats.reserved.toLocaleString()}
            </div>
          </div>
          <div className="bg-gray-900 p-6 rounded-lg border border-gray-700">
            <div className="text-gray-400 text-sm mb-1">Sold Pixels</div>
            <div className="text-3xl font-bold text-blue-400">
              {stats.sold.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold">Recent Orders</h2>
            <button
              onClick={() => { loadOrders(); loadStats(); }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm font-semibold"
            >
              🔄 Refresh
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Reference</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Pixels</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Expires</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Proof</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                      No orders yet
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-800/50">
                      <td className="px-4 py-3 font-mono text-sm">{order.reference}</td>
                      <td className="px-4 py-3">{order.pixel_ids.length}</td>
                      <td className="px-4 py-3">${order.amount_usd}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            order.status === 'paid'
                              ? 'bg-green-900 text-green-300'
                              : order.status === 'expired'
                              ? 'bg-red-900 text-red-300'
                              : 'bg-yellow-900 text-yellow-300'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {new Date(order.expires_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        {order.payment_proof_url ? (
                          <a
                            href={order.payment_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-gray-500">None</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => markPaid(order.id)}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-xs font-semibold transition"
                                title="Mark as paid and assign pixels"
                              >
                                ✓ Mark Paid
                              </button>
                              <button
                                onClick={() => deleteOrder(order.id, order.reference)}
                                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-xs font-semibold transition"
                                title="Delete order and free pixels"
                              >
                                × Delete
                              </button>
                            </>
                          )}
                          {order.status === 'paid' && (
                            <span className="text-green-400 text-sm">✓ Completed</span>
                          )}
                          {order.status === 'expired' && (
                            <button
                              onClick={() => deleteOrder(order.id, order.reference)}
                              className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs font-semibold transition"
                            >
                              × Remove
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Debug Info */}
        <div className="mt-6 bg-gray-900 rounded-lg border border-gray-700 p-4">
          <h3 className="text-lg font-bold mb-2">Quick Actions</h3>
          <div className="text-sm text-gray-400 space-y-2">
            <p>• <strong>Cleanup Expired:</strong> Frees pixels from orders that have expired (older than 20 minutes)</p>
            <p>• <strong>Mark Paid:</strong> Manually mark an order as paid and assign pixels (for crypto payments)</p>
            <p>• <strong>Delete:</strong> Remove an order and free its pixels immediately</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============= MAIN APP COMPONENT =============
export default function PixelApp() {
  const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activePixels, setActivePixels] = useState<number[] | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);
  const [hovered, setHovered] = useState<{
    pixel: PixelData | null;
    x: number;
    y: number;
  } | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [claimedCount, setClaimedCount] = useState(0);

  // Check admin auth on mount
  useEffect(() => {
    const auth = localStorage.getItem('admin_auth');
    if (auth === 'true') setIsAdmin(true);
  }, []);

  // Load pixels from database
  useEffect(() => {
    loadPixelsFromDatabase();
  }, []);

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
              status: row.status
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
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSearch = () => {
    const id = Number(searchInput);
    if (!isNaN(id) && id >= 0 && id < TOTAL_PIXELS) {
      setSearchedPixel(id);
      setSelected(new Set([id]));
    }
  };

  const buyRandom = () => {
    // Find first available pixel
    for (let i = 0; i < TOTAL_PIXELS; i++) {
      if (!pixels.has(i) || pixels.get(i)?.status === 'free') {
        setSelected(new Set([i]));
        setSearchedPixel(i);
        setActivePixels([i]);
        return;
      }
    }
    alert('No free pixels available');
  };

  const handlePaymentSuccess = () => {
    // Reload pixels after successful payment
    loadPixelsFromDatabase();
    setSelected(new Set());
    setActivePixels(null);
  };

  // Admin Login Screen
  if (showAdmin && !isAdmin) {
    return (
      <AdminLogin 
        onSuccess={() => {
          setIsAdmin(true);
          setShowAdmin(true);
        }} 
      />
    );
  }

  // Admin Dashboard Screen
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

  // Main Pixel Grid Screen
  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <h1 className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Million Pixel Grid
        </h1>
        
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Pixel #"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-32 focus:border-cyan-500 focus:outline-none"
        />
        
        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded font-semibold transition"
        >
          Search
        </button>
        
        <button
          onClick={buyRandom}
          className="bg-purple-600 hover:bg-purple-500 px-3 py-2 rounded font-semibold transition"
        >
          🎲 Random
        </button>
        
        <div className="ml-auto text-sm text-gray-300">
          <span className="font-bold text-green-400">
            {claimedCount.toLocaleString()}
          </span>
          {' / '}
          {TOTAL_PIXELS.toLocaleString()} claimed
        </div>
        
        <button
          onClick={() => setShowAdmin(true)}
          className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded font-semibold transition"
        >
          Admin
        </button>
      </header>

      {/* Pixel Grid */}
      <div className="flex-1 overflow-hidden">
        <PixelGrid
          pixels={pixels}
          searchedPixel={searchedPixel}
          selected={selected}
          onPixelSelect={toggleSelect}
          onHover={(pixel, x, y) => setHovered(pixel ? { pixel, x, y } : null)}
        />
      </div>

      {/* Hover Tooltip */}
      {hovered && hovered.pixel && (
        <div
          className="fixed bg-gray-900 border-2 border-cyan-500/50 rounded-lg px-4 py-3 text-sm pointer-events-none shadow-2xl z-40"
          style={{ left: hovered.x + 16, top: hovered.y + 16 }}
        >
          <div className="font-bold text-cyan-300">
            Pixel #{hovered.pixel.id}
          </div>
          <div className={`text-sm ${
            hovered.pixel.status === 'sold' ? 'text-red-400' : 
            hovered.pixel.status === 'reserved' ? 'text-yellow-400' : 
            'text-green-400'
          }`}>
            {hovered.pixel.status === 'sold' ? '🔴 Sold' : 
             hovered.pixel.status === 'reserved' ? '🟡 Reserved' :
             '🟢 Available'}
          </div>
          {hovered.pixel.link && (
            <div className="text-blue-400 text-xs truncate max-w-[200px]">
              {hovered.pixel.link}
            </div>
          )}
        </div>
      )}

      {/* Selected Pixels Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border-2 border-cyan-500 rounded-xl px-6 py-4 shadow-2xl shadow-cyan-500/20 flex items-center gap-4">
          <span className="font-bold text-lg">
            {selected.size} pixel{selected.size > 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setActivePixels([...selected])}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-bold shadow-lg shadow-green-500/50 transition"
          >
            💰 Buy Now
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition"
          >
            Clear
          </button>
        </div>
      )}

      {/* Payment Modal */}
      {activePixels && (
        <PaymentModal
          pixelIds={activePixels}
          onClose={() => {
            setActivePixels(null);
            setSelected(new Set());
          }}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
