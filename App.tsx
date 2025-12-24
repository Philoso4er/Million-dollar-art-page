import React, { useState, useEffect, useCallback, useRef } from 'react';
import PixelGrid from './components/PixelGrid';
import { PixelData } from './types';
import { loadPixels } from './src/lib/loadPixels';

const TOTAL_PIXELS = 1_000_000;
const GRID_WIDTH = 1000;

export default function App() {
  const pixelsRef = useRef<Map<number, PixelData>>(new Map());
  const [, forceRender] = useState(0);

  const [notification, setNotification] = useState<string | null>(null);
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{ pixel: PixelData; x: number; y: number } | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Zoom
  const [scale, setScale] = useState<number>(1);
  const MIN_SCALE = 1;
  const MAX_SCALE = 8;
  const SCALE_STEP = 0.25;

  // 🔹 LOAD PIXELS FROM SUPABASE
  useEffect(() => {
    loadPixels().then(map => {
      pixelsRef.current = map;
      forceRender(n => n + 1);
    });
  }, []);

  // 🔹 CLICK HANDLER
  const handlePixelSelect = useCallback((pixelId: number) => {
    const pixel = pixelsRef.current.get(pixelId);

    if (pixel) {
      if (pixel.status === 'sold' && pixel.link) {
        window.open(pixel.link, '_blank', 'noopener,noreferrer');
      }
      // reserved → do nothing
      return;
    }

    fetch('/api/create-order', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ pixelIds: [pixelId] })
})
  .then(res => {
    if (!res.ok) throw new Error('Reserve failed');
    return res.json();
  })
  .then(data => {
    pixelsRef.current.set(pixelId, {
      id: pixelId,
      color: '#555555',
      link: '',
      status: 'reserved',
    });
    forceRender(n => n + 1);
    setNotification(`⏳ Pixel reserved. Ref: ${data.reference}`);
  })
  .catch(() => {
    alert('Pixel could not be reserved');
  });


    forceRender(n => n + 1);
    setNotification(`⏳ Pixel #${pixelId} reserved`);
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const handlePixelHover = useCallback(
    (pixelId: number | null, x: number, y: number) => {
      if (pixelId === null) {
        setTooltip(null);
        return;
      }
      const pixel = pixelsRef.current.get(pixelId);
      if (pixel && pixel.status === 'sold') {
        setTooltip({ pixel, x, y });
      } else {
        setTooltip(null);
      }
    },
    []
  );

  const handleSearch = () => {
    const id = Number(searchInput);
    if (!Number.isInteger(id) || id < 0 || id >= TOTAL_PIXELS) {
      alert(`Enter a number between 0 and ${TOTAL_PIXELS - 1}`);
      return;
    }
    setSearchedPixel(id);
    centerPixelInView(id);
  };

  const centerPixelInView = (id: number) => {
    const container = gridContainerRef.current;
    if (!container) return;
    const x = id % GRID_WIDTH;
    const y = Math.floor(id / GRID_WIDTH);
    container.scrollTo({
      left: x * scale - container.clientWidth / 2,
      top: y * scale - container.clientHeight / 2,
      behavior: 'smooth',
    });
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-900 text-white overflow-hidden">
      {/* Header */}
      <header className="p-3 border-b border-gray-700 flex gap-3 items-center">
        <h1 className="font-bold text-lg">Million Pixel Grid</h1>

        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search pixel #"
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1"
        />
        <button onClick={handleSearch} className="bg-blue-600 px-3 py-1 rounded">
          Search
        </button>

        <div className="ml-auto flex gap-2">
          <button onClick={() => setScale(s => Math.max(MIN_SCALE, s - SCALE_STEP))}>−</button>
          <button onClick={() => setScale(1)}>Reset</button>
          <button onClick={() => setScale(s => Math.min(MAX_SCALE, s + SCALE_STEP))}>+</button>
        </div>
      </header>

      {notification && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-purple-600 px-4 py-2 rounded z-50">
          {notification}
        </div>
      )}

      {tooltip && (
        <div
          className="fixed bg-black text-sm p-2 rounded border border-gray-600 z-50"
          style={{ top: tooltip.y + 12, left: tooltip.x + 12 }}
        >
          <div>Pixel #{tooltip.pixel.id}</div>
          <a href={tooltip.pixel.link} target="_blank" className="text-blue-400">
            {tooltip.pixel.link}
          </a>
        </div>
      )}

      <main ref={gridContainerRef} className="flex-1 overflow-auto bg-black">
        <div className="mx-auto my-6">
          <PixelGrid
            pixels={pixelsRef.current}
            onPixelSelect={handlePixelSelect}
            onPixelHover={handlePixelHover}
            searchedPixel={searchedPixel}
            scale={scale}
          />
        </div>
      </main>
    </div>
  );
}
