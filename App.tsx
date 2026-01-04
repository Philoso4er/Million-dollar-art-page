import React, { useEffect, useState } from 'react';
import PixelGrid from './components/PixelGrid';        // if PixelGrid is in /components
import PaymentModal from './src/components/PaymentModal';
import { loadPixels } from './src/lib/loadPixels';
import { PixelData } from './types';

const TOTAL_PIXELS = 1_000_000;

export default function App() {
  const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activePixels, setActivePixels] = useState<number[] | null>(null);

  const [hovered, setHovered] = useState<{ pixel: PixelData | null; x: number; y: number } | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);

  useEffect(() => {
    loadPixels().then(setPixels);
  }, []);

  const toggleSelect = (id: number) => {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const buyRandomPixel = () => {
    for (let i = 0; i < TOTAL_PIXELS; i++) {
      if (!pixels.has(i)) {
        setSelected(new Set([i]));
        setActivePixels([i]);
        return;
      }
    }
    alert('No free pixels');
  };

  return (
    <div className="h-screen bg-black text-white overflow-hidden">
      <header className="fixed top-0 w-full z-50 bg-gray-900 p-3 flex gap-2">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          className="bg-gray-800 px-2 py-1"
          placeholder="Pixel #"
        />
        <button onClick={() => setSearchedPixel(Number(searchInput))}>Search</button>
        <button onClick={buyRandomPixel}>🎲 Random</button>
      </header>

      <div className="fixed inset-0 pt-14 flex items-center justify-center">
        <div style={{ width: '80vmin', height: '80vmin' }}>
          <PixelGrid
            pixels={pixels}
            searchedPixel={searchedPixel}
            selected={selected}
            onPixelSelect={toggleSelect}
            onHover={(pixel, x, y) => setHovered({ pixel, x, y })}
          />
        </div>
      </div>

      {hovered?.pixel && (
        <div className="fixed bg-black p-2 text-sm border" style={{ top: hovered.y + 10, left: hovered.x + 10 }}>
          Pixel #{hovered.pixel.id}
        </div>
      )}

      {selected.size > 0 && (
        <button
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-600 px-4 py-2"
          onClick={() => setActivePixels([...selected])}
        >
          Buy {selected.size} selected
        </button>
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
