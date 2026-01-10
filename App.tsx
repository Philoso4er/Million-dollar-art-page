import React, { useEffect, useState, useCallback } from "react";
import PixelGrid from "./components/PixelGrid";
import PaymentModal from "./components/PaymentModal";
import { PixelData } from "./types";
import { loadPixels } from "./src/lib/loadPixels";

const TOTAL_PIXELS = 1_000_000;

export default function App() {
  const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ pixel: PixelData | null; x: number; y: number } | null>(null);
  const [activePixels, setActivePixels] = useState<number[] | null>(null);

  const [searchInput, setSearchInput] = useState("");

  const claimedCount = Array.from(pixels.values()).filter(p => p.status === "sold").length;

  // Load pixels from Supabase
  useEffect(() => {
    loadPixels().then(setPixels);
  }, []);

  // Toggle selection
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Search pixel
  const handleSearch = () => {
    const id = Number(searchInput);
    if (id < 0 || id >= TOTAL_PIXELS) {
      alert("Invalid pixel");
      return;
    }
    setSearchedPixel(id);
  };

  // Random pixel
  const handleRandomPixel = () => {
    const freePixels = [...pixels.values()].filter(p => p.status === "free");
    if (freePixels.length === 0) return alert("All pixels sold!");
    const random = freePixels[Math.floor(Math.random() * freePixels.length)];
    setActivePixels([random.id]);
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden select-none">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-700 p-3 flex gap-3 items-center">
        <h1 className="font-bold text-lg">Million Pixel Grid</h1>

        <span className="ml-4 text-sm text-gray-300">
          {claimedCount.toLocaleString()} / {TOTAL_PIXELS.toLocaleString()} claimed
        </span>

        {/* Search */}
        <div className="flex gap-2 ml-4">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search pixel #"
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-36"
          />
          <button onClick={handleSearch} className="bg-blue-600 px-3 py-1 rounded">
            Search
          </button>
        </div>

        {/* Random */}
        <button onClick={handleRandomPixel} className="bg-purple-600 px-3 py-1 rounded">
          Random Pixel
        </button>
      </header>

      {/* HOVER INFO */}
      {hoverInfo && hoverInfo.pixel && (
        <div
          className="fixed bg-gray-900 border border-gray-700 px-3 py-2 rounded text-sm"
          style={{ left: hoverInfo.x + 12, top: hoverInfo.y + 12 }}
        >
          <div>Pixel #{hoverInfo.pixel.id}</div>
          {hoverInfo.pixel.status === "sold" ? (
            <>
              <div>Color: {hoverInfo.pixel.color}</div>
              <a href={hoverInfo.pixel.link} className="text-blue-400 underline" target="_blank">
                {hoverInfo.pixel.link}
              </a>
            </>
          ) : (
            <div className="text-green-400">Available</div>
          )}
        </div>
      )}

      {/* PIXEL GRID */}
      <div className="h-full w-full pt-14 overflow-hidden">
        <PixelGrid
          pixels={pixels}
          selected={selected}
          searchedPixel={searchedPixel}
          onPixelSelect={toggleSelect}
          onHover={(pixel, x, y) => setHoverInfo({ pixel, x, y })}
        />
      </div>

      {/* SELECTION BAR */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 px-4 py-2 rounded flex gap-4 border border-gray-700">
          <span>{selected.size} selected</span>
          <button
            onClick={() => setActivePixels([...selected])}
            className="bg-green-600 px-3 py-1 rounded"
          >
            Buy Selected
          </button>
          <button onClick={() => setSelected(new Set())} className="bg-gray-700 px-3 py-1 rounded">
            Clear
          </button>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {activePixels && (
        <PaymentModal
          pixelIds={activePixels}
          onClose={() => setActivePixels(null)}
          onSuccess={() => {
            // refresh pixel map
            loadPixels().then(setPixels);
            setActivePixels(null);
            setSelected(new Set());
          }}
        />
      )}
    </div>
  );
}
