import React, { useEffect, useRef, useState } from 'react';
import PixelGrid from './components/PixelGrid';
import PaymentModal from './src/components/PaymentModal';
import { PixelData } from './types';
import { loadPixels } from './src/lib/loadPixels';

const TOTAL_PIXELS = 1_000_000;

export default function App() {
  const pixelsRef = useRef<Map<number, PixelData>>(new Map());

  const [hovered, setHovered] = useState<{ pixel: PixelData; x: number; y: number } | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activePixels, setActivePixels] = useState<number[] | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);

  useEffect(() => {
    loadPixels().then(map => {
      pixelsRef.current = map;

      // 🌐 Shareable pixel link support
      const url = new URL(window.location.href);
      const p = url.searchParams.get('pixel');
      if (p) {
        const id = Number(p);
        if (!isNaN(id)) setSearchedPixel(id);
      }
    });
  }, []);

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const isFree = (id: number) => !pixelsRef.current.get(id);

  const handleSearch = () => {
    const id = Number(searchInput);
    if (!Number.isInteger(id) || id < 0 || id >= TOTAL_PIXELS) {
      alert('Invalid pixel ID');
      return;
    }
    setSearchedPixel(id);

    // Update URL (shareable)
    const url = new URL(window.location.href);
    url.searchParams.set('pixel', String(id));
    window.history.replaceState({}, '', url.toString());
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-700 p-3 flex gap-2">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search pixel #"
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-40"
        />
        <button onClick={handleSearch} className="bg-blue-600 px-3 py-1 rounded">
          Search
        </button>
      </header>

      {/* Search result actions */}
      {searchedPixel !== null && (
        <div className="fixed top-14 left-0 right-0 z-30 bg-gray-800 px-4 py-2 flex justify-between items-center text-sm">
          <div>
            Pixel #{searchedPixel} {isFree(searchedPixel) ? '(Free)' : '(Sold)'}
          </div>
          {isFree(searchedPixel) && (
            <div className="flex gap-2">
              <button
                onClick={() => setActivePixels([searchedPixel])}
                className="bg-green-600 px-3 py-1 rounded"
              >
                Buy now
              </button>
              <button
                onClick={() => toggleSelect(searchedPixel)}
                className="bg-blue-600 px-3 py-1 rounded"
              >
                {selected.has(searchedPixel) ? 'Remove' : 'Add'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <PixelGrid
        pixels={pixelsRef.current}
        searchedPixel={searchedPixel}
        selected={selected}
        onHover={(pixel, x, y) =>
          pixel ? setHovered({ pixel, x, y }) : setHovered(null)
        }
      />

      {/* Hover info */}
      {hovered && (
        <div
          className="fixed z-50 bg-black text-sm p-3 rounded border border-gray-600 w-56"
          style={{ top: hovered.y + 12, left: hovered.x + 12 }}
        >
          <div className="font-semibold mb-1">Pixel #{hovered.pixel.id}</div>
          <div>Status: {hovered.pixel.status || 'free'}</div>

          {!hovered.pixel.status && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => setActivePixels([hovered.pixel.id])}
                className="flex-1 bg-green-600 px-2 py-1 rounded"
              >
                Buy
              </button>
              <button
                onClick={() => toggleSelect(hovered.pixel.id)}
                className="flex-1 bg-blue-600 px-2 py-1 rounded"
              >
                {selected.has(hovered.pixel.id) ? 'Remove' : 'Add'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Multi-buy bar */}
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

      {/* Payment */}
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
