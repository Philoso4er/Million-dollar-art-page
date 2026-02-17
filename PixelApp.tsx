import React, { useEffect, useState, useRef } from 'react';
import TermsPage from './TermsPage';

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

// Load PayPal script
const loadPayPalScript = (clientId: string) => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).paypal) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${clientId}&currency=GBP`;
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Failed to load PayPal'));
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
  onHover,
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

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, 1000, 1000);

    pixels.forEach((p) => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      ctx.fillStyle = p.color || '#1a1a1a';
      ctx.fillRect(x, y, 1, 1);
    });

    if (searchedPixel !== null) {
      const x = searchedPixel % GRID_SIZE;
      const y = Math.floor(searchedPixel / GRID_SIZE);
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 1, y - 1, 3, 3);
    }

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
    if (x >= 0 && x < 1000 && y >= 0 && y < 1000) return y * GRID_SIZE + x;
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
              onHover(pixel || { id, color: '#0a0a0a', link: '', status: 'free' }, e.clientX, e.clientY);
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

// ============= PAYPAL BUTTON COMPONENT =============
function PayPalButton({
  amount,
  onSuccess,
  onError,
}: {
  amount: number;
  onSuccess: (orderId: string) => void;
  onError: (err: any) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [rendered, setRendered] = useState(false);

  const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  useEffect(() => {
    if (!PAYPAL_CLIENT_ID) return;
    loadPayPalScript(PAYPAL_CLIENT_ID)
      .then(() => setReady(true))
      .catch(onError);
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || rendered) return;
    const paypal = (window as any).paypal;
    if (!paypal) return;

    setRendered(true);
    paypal.Buttons({
      style: {
        layout: 'vertical',
        color: 'gold',
        shape: 'rect',
        label: 'pay',
      },
      createOrder: (_data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: {
              value: amount.toFixed(2),
              currency_code: 'GBP',
            },
            description: `The Million Pixel Grid - ${amount} pixel${amount > 1 ? 's' : ''}`,
          }],
        });
      },
      onApprove: async (_data: any, actions: any) => {
        const order = await actions.order.capture();
        onSuccess(order.id);
      },
      onError: (err: any) => {
        console.error('PayPal error:', err);
        onError(err);
      },
      onCancel: () => {
        console.log('PayPal cancelled');
      },
    }).render(containerRef.current);
  }, [ready, rendered, amount]);

  if (!PAYPAL_CLIENT_ID) {
    return (
      <div className="text-yellow-400 text-sm text-center p-3 bg-yellow-900/20 rounded-lg border border-yellow-700">
        ⚠️ PayPal not configured. Add VITE_PAYPAL_CLIENT_ID to your environment.
      </div>
    );
  }

  return (
    <div>
      {!ready && (
        <div className="text-gray-400 text-sm text-center p-3">Loading PayPal...</div>
      )}
      <div ref={containerRef} />
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
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal' | 'crypto'>('card');
  const [loading, setLoading] = useState(false);
  const [orderRef, setOrderRef] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUploading, setProofUploading] = useState(false);

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
    const payload =
      mode === 'sync'
        ? { pixelIds, mode, color: syncColor, link: syncLink }
        : { pixelIds, mode, individual: individualData };

    const res = await fetch('/api/orders?action=create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const contentType = res.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      const text = await res.text();
      throw new Error('Server error: ' + text.slice(0, 100));
    }

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create order');
    return data;
  };

  // Mark order paid after PayPal success
  const confirmPayPalPayment = async (orderId: string, reference: string) => {
    const res = await fetch('/api/orders?action=confirm-paypal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paypalOrderId: orderId, reference }),
    });
    if (res.ok) {
      onSuccess();
      onClose();
    } else {
      alert('Payment captured but confirmation failed. Please contact support with reference: ' + reference);
    }
  };

  const handleCardPayment = async () => {
    setLoading(true);
    try {
      const data = await createOrder();
      const FLW = (window as any).FlutterwaveCheckout;
      if (!FLW) {
        alert('Payment gateway not loaded. Please refresh and try again.');
        setLoading(false);
        return;
      }
      const publicKey = import.meta.env.VITE_FLW_PUBLIC_KEY;
      if (!publicKey) {
        alert('⚠️ Card payment not configured.');
        setLoading(false);
        return;
      }
      FLW({
        public_key: publicKey,
        tx_ref: data.reference,
        amount: pixelIds.length,
        currency: 'GBP',
        payment_options: 'card,mobilemoney,ussd',
        customer: { email: 'buyer@pixelgrid.com', name: 'Pixel Buyer' },
        customizations: {
          title: 'The Million Pixel Grid',
          description: `${pixelIds.length} pixel${pixelIds.length > 1 ? 's' : ''} — The Million Pixel Grid`,
          logo: '',
        },
        callback: (payment: any) => {
          if (payment.status === 'successful') {
            setTimeout(() => {
              onSuccess();
              onClose();
            }, 1000);
          }
        },
        onclose: () => setLoading(false),
      });
    } catch (err: any) {
      alert('Error: ' + err.message);
      setLoading(false);
    }
  };

  const handlePayPalOrder = async (paypalOrderId: string) => {
    // We need the pixel reference to link PayPal payment to an order
    // Create the order first if not done, then confirm
    try {
      const data = await createOrder();
      await confirmPayPalPayment(paypalOrderId, data.reference);
    } catch (err: any) {
      alert('PayPal payment received but order linking failed: ' + err.message);
    }
  };

  const handleCryptoPayment = async () => {
    setLoading(true);
    try {
      const data = await createOrder();
      setOrderRef(data.reference);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadProof = async () => {
    if (!proofFile || !orderRef) return;
    setProofUploading(true);

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
        const data = await res.json().catch(() => ({}));
        alert('❌ Upload failed: ' + (data.error || 'Please try again.'));
      }
    } catch {
      alert('❌ Network error. Please try again.');
    } finally {
      setProofUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border-2 border-cyan-500/30 shadow-2xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? 's' : ''} — £{pixelIds.length} GBP
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl font-bold leading-none">×</button>
          </div>

          {!orderRef && (
            <>
              {/* Color/Link Mode */}
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

              {/* Payment Method Selection */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`py-4 rounded-lg font-bold transition ${paymentMethod === 'card' ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/50' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  💳 Card / Mobile
                </button>
                <button
                  onClick={() => setPaymentMethod('paypal')}
                  className={`py-4 rounded-lg font-bold transition ${paymentMethod === 'paypal' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/50' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  🅿 PayPal
                </button>
                <button
                  onClick={() => setPaymentMethod('crypto')}
                  className={`py-4 rounded-lg font-bold transition ${paymentMethod === 'crypto' ? 'bg-gradient-to-r from-orange-500 to-yellow-600 text-white shadow-lg shadow-orange-500/50' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  ₿ Crypto
                </button>
              </div>

              {/* PayPal inline buttons */}
              {paymentMethod === 'paypal' && (
                <div className="mb-4">
                  <p className="text-sm text-gray-400 mb-3 text-center">
                    Complete your ${pixelIds.length} payment via PayPal below:
                  </p>
                  <PayPalButton
                    amount={pixelIds.length}
                    onSuccess={(paypalOrderId) => handlePayPalOrder(paypalOrderId)}
                    onError={(err) => alert('PayPal error: ' + err.message)}
                  />
                </div>
              )}

              {/* Card / Crypto action buttons */}
              {paymentMethod !== 'paypal' && (
                <div className="flex gap-3">
                  <button onClick={onClose}
                    className="flex-1 py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-bold transition">
                    Cancel
                  </button>
                  <button
                    onClick={paymentMethod === 'card' ? handleCardPayment : handleCryptoPayment}
                    disabled={loading}
                    className="flex-1 py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg font-bold shadow-lg shadow-green-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? '⏳ Processing...' : `💰 Pay £${pixelIds.length}`}
                  </button>
                </div>
              )}

              <p className="text-center text-xs text-gray-600 mt-4">
                By purchasing you agree to our{' '}
                <button onClick={onClose} className="text-cyan-600 hover:text-cyan-400 underline">
                  Terms &amp; Conditions
                </button>
                . All sales are final. £1 per pixel.
              </p>
            </>
          )}

          {/* Crypto Payment Instructions */}
          {orderRef && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-yellow-900/40 to-orange-900/40 border-2 border-yellow-500 rounded-xl p-6">
                <h3 className="font-bold text-yellow-300 mb-3 text-lg">📋 Order Reference</h3>
                <p className="text-white font-mono text-xl bg-black/50 p-3 rounded break-all">{orderRef}</p>
              </div>

              <div className="bg-gray-800 border-2 border-cyan-500/30 p-6 rounded-xl">
                <h3 className="font-bold text-cyan-300 mb-3 text-lg">
                  💰 Send £{pixelIds.length} GBP worth of crypto to:
                </h3>
                <div className="bg-black/70 p-4 rounded-lg">
                  <p className="text-xs text-gray-400 mb-2">USDT/USDC (ETH/BSC/Polygon) — use GBP equivalent:</p>
                  <p className="text-white font-mono text-sm break-all bg-gray-900 p-3 rounded">
                    {CRYPTO_ADDRESS}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-300 mb-3">
                  📸 Upload Payment Screenshot/Proof
                </label>
                <input type="file" accept="image/*"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-700 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-cyan-600 file:text-white hover:file:bg-cyan-700" />
              </div>

              <button onClick={uploadProof} disabled={!proofFile || proofUploading}
                className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white rounded-lg font-bold shadow-lg shadow-blue-500/50 transition disabled:opacity-50 disabled:cursor-not-allowed">
                {proofUploading ? '⏳ Uploading...' : '📤 Submit Proof'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============= ADMIN LOGIN COMPONENT =============
// Password is checked SERVER-SIDE only — never exposed in the browser bundle
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
            Admin Dashboard
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
            { label: 'Free Pixels', value: stats.free, color: 'text-green-400' },
            { label: 'Reserved', value: stats.reserved, color: 'text-yellow-400' },
            { label: 'Sold Pixels', value: stats.sold, color: 'text-blue-400' },
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
                    <td className="px-4 py-3">${order.amount_usd}</td>
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
                        <a href={order.payment_proof_url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 underline">View</a>
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
      setSelected(new Set([id]));
    }
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
    setActivePixels(null);
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
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <h1 className="font-bold text-lg bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Million Pixel Grid
        </h1>
        <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Pixel #"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 w-32 focus:border-cyan-500 focus:outline-none" />
        <button onClick={handleSearch} className="bg-blue-600 hover:bg-blue-500 px-3 py-2 rounded font-semibold transition">Search</button>
        <button onClick={buyRandom} className="bg-purple-600 hover:bg-purple-500 px-3 py-2 rounded font-semibold transition">🎲 Random</button>
        <div className="ml-auto text-sm text-gray-300">
          <span className="font-bold text-green-400">{claimedCount.toLocaleString()}</span>
          {' / '}{TOTAL_PIXELS.toLocaleString()} claimed
        </div>
        <button onClick={() => setShowAdmin(true)} className="bg-gray-800 hover:bg-gray-700 px-3 py-2 rounded font-semibold transition">Admin</button>
      </header>

      <div className="flex-1 overflow-hidden">
        <PixelGrid pixels={pixels} searchedPixel={searchedPixel} selected={selected}
          onPixelSelect={toggleSelect}
          onHover={(pixel, x, y) => setHovered(pixel ? { pixel, x, y } : null)} />
      </div>

      {hovered?.pixel && (
        <div className="fixed bg-gray-900 border-2 border-cyan-500/50 rounded-lg px-4 py-3 text-sm pointer-events-none shadow-2xl z-40"
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

      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border-2 border-cyan-500 rounded-xl px-6 py-4 shadow-2xl shadow-cyan-500/20 flex items-center gap-4">
          <span className="font-bold text-lg">{selected.size} pixel{selected.size > 1 ? 's' : ''} selected</span>
          <button onClick={() => setActivePixels([...selected])}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-lg font-bold shadow-lg shadow-green-500/50 transition">
            💰 Buy Now
          </button>
          <button onClick={() => setSelected(new Set())}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition">
            Clear
          </button>
        </div>
      )}

      {activePixels && (
        <PaymentModal pixelIds={activePixels}
          onClose={() => { setActivePixels(null); setSelected(new Set()); }}
          onSuccess={handlePaymentSuccess} />
      )}

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center justify-between flex-shrink-0 text-xs text-gray-500">
        <span>A collaborative digital art project. <span className="text-gray-400">1,000,000 pixels. £1,000,000.</span></span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowTerms(true)}
            className="hover:text-cyan-400 transition underline"
          >
            Terms &amp; Conditions
          </button>
          <span>© 2026 The Million Pixel Grid</span>
        </div>
      </footer>
    </div>
  );
}
