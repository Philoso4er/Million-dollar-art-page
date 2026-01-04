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

  const [focusedPixel, setFocusedPixel] = useState<number | null>(null);

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

  const clearAll = () => {
    setSelected(new Set());
    setFocusedPixel(null);
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
    setFocusedPixel(id);
  };

  /* ---------- Random ---------- */
  const buyRandom = () => {
    for (let i = 0; i < TOTAL_PIXELS; i++) {
      if (!pixels.has(i)) {
        setSelected(new Set([i]));
        setActivePixels([i]);
        return;
      }
    }
    alert('No available pixels');
  };

  const focusedData = focusedPixel !== null
    ? pixels.get(focusedPixel) || { id: focusedPixel, status: 'free' }
    : null;

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
          onClick={buyRandom}
          className="bg-purple-600 hover:bg-purple-500 px-4 py-2 rounded text-sm font-semibold"
        >
          🎲 Random Pixel
        </button>

        {(focusedPixel !== null || selected.size > 0) && (
          <button
            onClick={clearAll}
            className="ml-auto bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded text-sm"
          >
            Cancel
          </button>
        )}
      </header>

      {/* GRID */}
      <div className="fixed inset-0 pt-[64px] bg-black overflow-hidden">
        <PixelGrid
          pixels={pixels}
          searchedPixel={searchedPixel}
          selected={selected}
          onPixelSelect={(id) => {
            setFocusedPixel(id);
            toggleSelect(id);
          }}
          onHover={() => {}}
        />
      </div>

      {/* INFO PANEL */}
      {focusedData && (
        <div className="fixed right-4 top-20 z-50 bg-gray-900 border border-gray-700 rounded-xl p-4 w-64 shadow-lg">
          <h3 className="font-bold mb-2">Pixel #{focusedData.id}</h3>

          <div className="text-sm mb-2">
            Status:{' '}
            <span className={focusedData.status === 'sold' ? 'text-red-400' : 'text-green-400'}>
              {focusedData.status || 'free'}
            </span>
          </div>

          {focusedData.color && (
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-4 h-4 rounded border"
                style={{ backgroundColor: focusedData.color }}
              />
              <span className="text-sm">{focusedData.color}</span>
            </div>
          )}

          {focusedData.link && (
            <a
              href={focusedData.link}
              target="_blank"
              rel="noreferrer"
              className="text-blue-400 text-sm break-all mb-2 block"
            >
              {focusedData.link}
            </a>
          )}

          {focusedData.status !== 'sold' && (
            <button
              onClick={() => setActivePixels([focusedData.id])}
              className="mt-3 w-full bg-green-600 hover:bg-green-500 px-3 py-2 rounded text-sm font-semibold"
            >
              Buy this pixel
            </button>
          )}
        </div>
      )}

      {/* MULTI-SELECTION BAR */}
      {selected.size > 1 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 px-4 py-2 rounded shadow-lg flex gap-4">
          <span>{selected.size} selected</span>
          <button
            onClick={() => setActivePixels([...selected])}
            className="bg-green-600 px-3 py-1 rounded"
          >
            Buy selected
          </button>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {activePixels && (
        <PaymentModal
          pixelIds={activePixels}
          onClose={() => setActivePixels(null)}
        />
      )}
    </div>
  );
}
