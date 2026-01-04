import React, { useEffect, useState } from 'react';
import PixelGrid from './components/PixelGrid';
import PaymentModal from './components/PaymentModal';
import { PixelData } from './types';
import { loadPixels } from './lib/loadPixels';

const TOTAL_PIXELS = 1_000_000;

export default function App() {
  const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activePixels, setActivePixels] = useState<number[] | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);

  /* ---------- LOAD PIXELS ---------- */
  useEffect(() => {
    loadPixels().then(setPixels);
  }, []);

  /* ---------- SELECTION ---------- */
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* ---------- SEARCH ---------- */
  const handleSearch = () => {
    const id = Number(searchInput);
    if (!Number.isInteger(id) || id < 0 || id >= TOTAL_PIXELS) {
      alert('Invalid pixel ID');
      return;
    }
    setSearchedPixel(id);
  };

  /* ---------- RANDOM PIXEL ---------- */
  const buyRandomPixel = () => {
    const free: number[] = [];
    for (let i = 0; i < TOTAL_PIXELS; i++) {
      if (!pixels.has(i)) {
        free.push(i);
        if (free.length > 3000) break;
      }
    }

    if (!free.length) {
      alert('No available pixels left');
      return;
    }

    const random = free[Math.floor(Math.random() * free.length)];
    setSelected(new Set([random]));
    setActivePixels([random]);
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden">
      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-700 p-3 flex gap-2 items-center">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search pixel #"
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-40"
        />
        <button
          onClick={handleSearch}
          className="bg-blue-600 px-3 py-1 rounded"
        >
          Search
        </button>

        <button
          onClick={buyRandomPixel}
          className="bg-purple-600 px-3 py-1 rounded font-semibold"
        >
          🎲 Random Pixel ($1)
        </button>
      </header>

      {/* GRID VIEWPORT */}
      <div className="fixed inset-0 pt-14 flex items-center justify-center bg-black">
        <div
          className="relative border border-gray-700 bg-black"
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 px-4 py-2 rounded shadow-lg flex gap-4">
          <span>{selected.size} selected</span>
          <button
            onClick={() => setActivePixels([...selected])}
            className="bg-green-600 px-3 py-1 rounded"
          >
            Buy selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="bg-gray-700 px-3 py-1 rounded"
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
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}
