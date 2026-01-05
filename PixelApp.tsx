import React, { useEffect, useState } from 'react';
import PixelGrid from './components/PixelGrid';
import PaymentModal from './components/PaymentModal';
import { PixelData } from './types';
import { loadPixels } from './src/lib/loadPixels';

const TOTAL_PIXELS = 1_000_000;

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

  useEffect(() => {
    loadPixels().then(map => setPixels(map));
  }, []);

  const claimedCount = Array.from(pixels.values()).filter(
    p => p.status === 'sold'
  ).length;

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSearch = () => {
    const id = Number(searchInput);
    if (!Number.isInteger(id) || id < 0 || id >= TOTAL_PIXELS) return;
    setSearchedPixel(id);
    setSelected(new Set([id]));
  };

  const buyRandomPixel = () => {
    for (let i = 0; i < TOTAL_PIXELS; i++) {
      if (!pixels.has(i)) {
        setSelected(new Set([i]));
        setSearchedPixel(i);
        setActivePixels([i]);
        return;
      }
    }
    alert('No free pixels available');
  };

  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">

      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-700 px-4 py-3 flex items-center gap-3">
        <h1 className="font-bold text-lg">Million Pixel Grid</h1>

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
          🎲 Random
        </button>

        <div className="ml-auto text-sm text-gray-300">
          <span className="font-semibold text-white">
            {claimedCount.toLocaleString()}
          </span>
          {' / '}
          {TOTAL_PIXELS.toLocaleString()} claimed
        </div>
      </header>

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

      {hovered && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm pointer-events-none"
          style={{ left: hovered.x + 12, top: hovered.y + 12 }}
        >
          <div className="font-semibold">
            Pixel #{hovered.pixel?.id}
          </div>
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

      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 px-4 py-2 rounded shadow-lg flex gap-4">
          <span>{selected.size} selected</span>
          <button
            onClick={() => setActivePixels([...selected])}
            className="bg-green-600 hover:bg-green-500 px-3 py-1 rounded"
          >
            Buy
          </button>
        </div>
      )}

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
