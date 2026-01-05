import React, { useEffect, useState } from 'react';
import PixelGrid from './components/PixelGrid';
import PaymentModal from './components/PaymentModal';
import { PixelData } from './types';
import { loadPixels } from './src/lib/loadPixels';

const TOTAL_PIXELS = 1_000_000;

export default function PixelApp() {
  /* ---------------- STATE ---------------- */
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

  /* ---------------- LOAD PIXELS ---------------- */
  useEffect(() => {
    loadPixels().then(map => setPixels(map));
  }, []);

  /* ---------------- SELECTION ---------------- */
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const clearSelection = () => {
    setSelected(new Set());
    setSearchedPixel(null);
  };

  /* ---------------- SEARCH ---------------- */
  const handleSearch = () => {
    const id = Number(searchInput);
    if (!Number.isInteger(id) || id < 0 || id >= TOTAL_PIXELS) {
      alert('Invalid pixel ID');
      return;
    }
    setSearchedPixel(id);
    setSelected(new Set([id]));
  };

  /* ---------------- RANDOM BUY ---------------- */
  const buyRandomPixel = () => {
    const freePixels: number[] = [];

    for (let i = 0; i < TOTAL_PIXELS; i++) {
      if (!pixels.has(i)) freePixels.push(i);
      if (freePixels.length >= 5000) break; // safety cap
    }

    if (freePixels.length === 0) {
      alert('No free pixels available');
      return;
    }

    const randomId =
      freePixels[Math.floor(Math.random() * freePixels.length)];

    setSelected(new Set([randomId]));
    setSearchedPixel(randomId);
    setActivePixels([randomId]);
  };

  /* ---------------- UI ---------------- */
  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center gap-3">
        <h1 className="font-bold text-lg whitespace-nowrap">
          Million Pixel Grid
        </h1>

        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Pixel #"
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-32"
        />

        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-500 px-3 py-1 rounded"
        >
          Search
        </button>

        <button
          onClick={buyRandomPixel}
          className="bg-purple-600 hover:bg-purple-500 px-3 py-1 rounded"
        >
          🎲 Random Pixel
        </button>

        {selected.size > 0 && (
          <button
            onClick={clearSelection}
            className="ml-auto bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded"
          >
            Clear
          </button>
        )}
      </header>

      {/* GRID */}
      <div className="absolute inset-0 pt-[60px]">
        <PixelGrid
          pixels={pixels}
          searchedPixel={searchedPixel}
          selected={selected}
          onPixelSelect={toggleSelect}
          onHover={(pixel, x, y) =>
            setHovered(pixel ? { pixel, x, y } : null)
          }
        />
      </div>

      {/* HOVER INFO */}
      {hovered && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm pointer-events-none"
          style={{ left: hovered.x + 12, top: hovered.y + 12 }}
        >
          <div className="font-semibold">Pixel #{hovered.pixel?.id}</div>
          <div className="text-gray-400">
            {hovered.pixel?.status || 'free'}
          </div>
          {hovered.pixel?.link && (
            <div className="text-blue-400 truncate max-w-[200px]">
              {hovered.pixel.link}
            </div>
          )}
        </div>
      )}

      {/* SELECTION BAR */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 px-4 py-2 rounded shadow-lg flex gap-4 items-center">
          <span>{selected.size} selected</span>

          <button
            onClick={() => setActivePixels([...selected])}
            className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
          >
            Buy
          </button>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {activePixels && (
        <PaymentModal
          pixelIds={activePixels}
          onClose={() => {
            setActivePixels(null);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}
