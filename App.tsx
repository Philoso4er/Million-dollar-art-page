import React, { useState, useEffect, useRef } from 'react';
import PixelGrid from './components/PixelGrid';
import PaymentModal from './src/components/PaymentModal';
import RecentPurchases from './src/components/RecentPurchases';
import { PixelData } from './types';
import { loadPixels } from './src/lib/loadPixels';

const GRID_SIZE = 1000;

export default function App() {
  const pixelsRef = useRef<Map<number, PixelData>>(new Map());

  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);
  const [hovered, setHovered] = useState<{
    pixel: PixelData;
    x: number;
    y: number;
  } | null>(null);

  const [activePixel, setActivePixel] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

  useEffect(() => {
    loadPixels().then(map => {
      pixelsRef.current = map;
    });
  }, []);

  const handleSearch = () => {
    const id = Number(searchInput);
    if (id < 0 || id >= GRID_SIZE * GRID_SIZE) return;
    setSearchedPixel(id);

    const x = id % GRID_SIZE;
    const y = Math.floor(id / GRID_SIZE);

    // 🧠 smart zoom + center
    setCamera({
      zoom: 8,
      x: window.innerWidth / 2 - x * 8,
      y: window.innerHeight / 2 - y * 8
    });
  };

  return (
    <div className="h-screen bg-gray-900 text-white overflow-hidden">
      <header className="p-3 flex gap-2 bg-black/80">
        <input
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search pixel #"
          className="bg-gray-800 px-2 py-1 rounded"
        />
        <button onClick={handleSearch} className="bg-blue-600 px-3 rounded">
          Search
        </button>
      </header>

      <PixelGrid
        pixels={pixelsRef.current}
        searchedPixel={searchedPixel}
        onPixelSelect={id => setActivePixel(id)}
        onHover={(pixel, x, y) =>
          pixel ? setHovered({ pixel, x, y }) : setHovered(null)
        }
        onCameraChange={setCamera}
      />

      {hovered && (
        <div
          className="fixed bg-black text-sm p-2 rounded border border-gray-600 z-50"
          style={{ top: hovered.y + 12, left: hovered.x + 12 }}
        >
          <div>Pixel #{hovered.pixel.id}</div>
          <div>Status: {hovered.pixel.status || 'free'}</div>
          {hovered.pixel.color && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ background: hovered.pixel.color }}
              />
              {hovered.pixel.color}
            </div>
          )}
          {hovered.pixel.link && (
            <a
              href={hovered.pixel.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 underline"
            >
              Visit
            </a>
          )}
        </div>
      )}

      {activePixel !== null && (
        <PaymentModal
          pixelId={activePixel}
          onClose={() => setActivePixel(null)}
          onReservedUI={() => {}}
        />
      )}

      <RecentPurchases />
    </div>
  );
}
