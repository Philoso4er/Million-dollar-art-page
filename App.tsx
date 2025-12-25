import React, { useState, useEffect, useCallback, useRef } from 'react';
import PixelGrid from './components/PixelGrid';
import PaymentModal from './src/components/PaymentModal';
import RecentPurchases from './src/components/RecentPurchases';
import { PixelData } from './types';
import { loadPixels } from './src/lib/loadPixels';

const TOTAL_PIXELS = 1_000_000;

export default function App() {
  const pixelsRef = useRef<Map<number, PixelData>>(new Map());
  const [, forceRender] = useState(0);

  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);
  const [searchData, setSearchData] = useState<PixelData | null>(null);
  const [activePixel, setActivePixel] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    loadPixels().then(map => {
      pixelsRef.current = map;
      forceRender(n => n + 1);
    });
  }, []);

  const handlePixelSelect = (id: number) => {
    const pixel = pixelsRef.current.get(id);
    if (!pixel) {
      setActivePixel(id);
      return;
    }
    if (pixel.status === 'sold' && pixel.link) {
      window.open(pixel.link, '_blank');
    }
  };

  const handleSearch = () => {
    const id = Number(searchInput);
    if (id < 0 || id >= TOTAL_PIXELS) return;
    setSearchedPixel(id);
    setSearchData(pixelsRef.current.get(id) || null);
  };

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      <header className="p-3 flex gap-2 border-b border-gray-700">
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

      {searchedPixel !== null && (
        <div className="p-3 bg-gray-800 text-sm flex justify-between items-center">
          <div>
            Pixel #{searchedPixel} —{' '}
            {searchData ? searchData.status : 'FREE'}
          </div>
          {!searchData && (
            <button
              onClick={() => setActivePixel(searchedPixel)}
              className="bg-green-600 px-3 py-1 rounded"
            >
              Buy
            </button>
          )}
        </div>
      )}

      <main className="flex-1 overflow-hidden">
        <PixelGrid
          pixels={pixelsRef.current}
          onPixelSelect={handlePixelSelect}
          searchedPixel={searchedPixel}
          onPixelHover={() => {}}
        />
      </main>

      {activePixel !== null && (
        <PaymentModal
          pixelId={activePixel}
          onClose={() => setActivePixel(null)}
          onReservedUI={(id) => {
            pixelsRef.current.set(id, {
              id,
              status: 'reserved',
              color: '#555',
              link: ''
            });
            forceRender(n => n + 1);
          }}
        />
      )}

      <RecentPurchases />
    </div>
  );
}
