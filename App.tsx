import React, { useEffect, useState } from "react";
import PixelGrid from "./components/PixelGrid";
import PaymentModal from "./components/PaymentModal";
import { PixelData } from "./types";
import { loadPixels } from "./src/lib/loadPixels";

const TOTAL_PIXELS = 1_000_000;

export default function App() {
  const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activePixels, setActivePixels] = useState<number[] | null>(null);
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);
  const [hover, setHover] = useState<any>(null);

  useEffect(() => {
    loadPixels().then(setPixels);
  }, []);

  return (
    <div className="h-screen bg-black text-white overflow-hidden">
      <header className="fixed top-0 left-0 right-0 bg-gray-900 p-3 flex gap-2">
        <input
          placeholder="Pixel ID"
          className="bg-gray-800 p-1"
          onKeyDown={(e) => setSearchedPixel(Number((e.target as any).value))}
        />
        <button
          onClick={() => setActivePixels([Math.floor(Math.random() * TOTAL_PIXELS)])}
          className="bg-green-600 px-3"
        >
          Buy Random Pixel
        </button>
      </header>

      <PixelGrid
        pixels={pixels}
        selected={selected}
        searchedPixel={searchedPixel}
        onPixelSelect={(id) =>
          setSelected((s) => new Set(s.has(id) ? [...s].filter((x) => x !== id) : [...s, id]))
        }
        onHover={(p, x, y) => setHover(p ? { p, x, y } : null)}
      />

      {selected.size > 0 && (
        <button
          className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-green-600 p-2"
          onClick={() => setActivePixels([...selected])}
        >
          Buy Selected
        </button>
      )}

      {activePixels && <PaymentModal pixelIds={activePixels} onClose={() => setActivePixels(null)} />}
    </div>
  );
}
