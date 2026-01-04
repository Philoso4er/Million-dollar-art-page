import React, { useEffect, useState } from 'react';
import PixelGrid from './components/PixelGrid';
import PaymentModal from './src/components/PaymentModal';
import { PixelData } from './types';
import { loadPixels } from './src/lib/loadPixels';

const TOTAL_PIXELS = 1_000_000;

export default function App() {
  const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activePixels, setActivePixels] = useState<number[] | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);

  useEffect(() => {
    loadPixels().then(setPixels);
  }, []);

  /* ---------- Selection ---------- */
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

  /* ---------- Search ---------- */
  const handleSearch = () => {
    const id = Number(searchInput);
    if (!Number.isInteger(id) || id < 0 || id >= TOTAL_PIXELS) {
      alert('Invalid pixel ID');
      return;
    }
    setSearchedPixel(id);
  };

  /* ---------- Random ---------- */
  const buyRandomPixel = () => {
    const free: number[] = [];
    for (let i = 0; i < TOTAL_PIXELS; i++) {
      if (!pixels.has(i)) {
        free.push(i);
        if (free.length > 3000) break;
      }
    }

    if (!free.length) {
      alert('No available pixels');
      return;
    }

    const random = free[Math.floor(Math.random() * free.length)];
    setSelected(new Set([random]));
    setActivePixels([random]);
  };

  return (
    <div className="h-screen w-screen bg-gray-950 text-white overflow-hidden">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700 px-4 py-3 flex gap-3 items-center">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search pixel #"
          className="bg-gray-800 border border-gray-600 rounded px-3 py-2 w-40 text-sm"
        />

        <button
          onClick={handleSearch}
          className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm font-semibold"
        >
          Search
        </button>

        <button
          onClick={buyRandomPixel}
          className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-sm font-semibold"
        >
          🎲 Random Pixel
        </button>

        {(selected.size > 0 || searchedPixel !== null) && (
          <button
            onClick={clearSelection}
            className="ml-auto bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
          >
            Cancel
          </button>
        )}
      </header>

      {/* GRID VIEWPORT */}
      <div className="fixed inset-0 pt-[64px] flex items-center justify-center bg-gray-950">
        <div
          className="relative border-2 border-gray-700 bg-gray-900 shadow-xl"
          style={{ width: '80vmin', height: '80vmin' }}
        >
          <PixelGrid
            pixels={pixels}
            searchedPixel={searchedPixel}
            selected={selected}
            onPixelSelect={toggleSelect}
            onHover={() => {}}
          />
        </div>
      </div>

      {/* SELECTION BAR */}
      {selected.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-gray-700 px-5 py-3 rounded-xl shadow-lg flex items-center gap-4">
          <span className="text-sm">
            {selected.size} pixel{selected.size > 1 ? 's' : ''} selected
          </span>

          <button
            onClick={() => setActivePixels([...selected])}
            className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded text-sm font-semibold"
          >
            Buy selected
          </button>

          <button
            onClick={clearSelection}
            className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
          >
            Clear
          </button>
        </div>
      )}

      {/* CHECKOUT */}
      {activePixels && (
        <PaymentModal
          pixelIds={activePixels}
          onClose={() => {
            setActivePixels(null);
            clearSelection();
          }}
        />
      )}
    </div>
  );
}
