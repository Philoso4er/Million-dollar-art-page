import React, { useEffect, useRef, useState } from "react";
import PixelGrid, { PixelGridHandle } from "./components/PixelGrid";
import PaymentModal from "./components/PaymentModal";
import { PixelData } from "./types";
import { loadPixels } from "./src/lib/loadPixels";

const TOTAL_PIXELS = 1_000_000;

export default function App() {
  const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activePixels, setActivePixels] = useState<number[] | null>(null);

  const [usedCount, setUsedCount] = useState(0);
  const [hoverInfo, setHoverInfo] = useState<{
    pixel: PixelData;
    x: number;
    y: number;
  } | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);

  // PixelGrid reference for smooth scrolling
  const gridRef = useRef<PixelGridHandle>(null);

  // Load pixel data on mount
  useEffect(() => {
    loadPixels().then((map) => {
      setPixels(map);

      // Count claimed pixels
      let used = 0;
      map.forEach((p) => {
        if (p.status === "sold" || p.status === "reserved") used++;
      });

      setUsedCount(used);
    });
  }, []);

  /* Toggle pixel selection */
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* Search for pixel ID */
  const handleSearch = () => {
    const id = Number(searchInput);

    if (!Number.isInteger(id) || id < 0 || id >= TOTAL_PIXELS) {
      alert("Invalid pixel ID");
      return;
    }

    setSearchedPixel(id);

    // Smooth animated pan
    gridRef.current?.scrollToPixel(id);
  };

  /* Random available pixel selector */
  const handleRandomPixel = () => {
    const available = Array.from(pixels.values())
      .filter((p) => p.status === "free")
      .map((p) => p.id);

    if (available.length === 0) {
      alert("No pixels available!");
      return;
    }

    const randomId = available[Math.floor(Math.random() * available.length)];

    setSearchedPixel(randomId);
    gridRef.current?.scrollToPixel(randomId);

    setSelected(new Set([randomId]));
    setActivePixels([randomId]);
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden relative">

      {/* ---------------------------------- HEADER ---------------------------------- */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-700 p-3 flex items-center gap-4">

        {/* SEARCH INPUT */}
        <div className="flex gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search pixel #"
            className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-40"
          />
          <button
            onClick={handleSearch}
            className="bg-blue-600 px-3 py-1 rounded"
          >
            Search
          </button>
        </div>

        {/* RANDOM BUY BUTTON */}
        <button
          onClick={handleRandomPixel}
          className="bg-purple-600 px-3 py-1 rounded"
        >
          Random Pixel
        </button>

        {/* CLAIMED COUNTER */}
        <div className="ml-auto text-sm text-gray-300">
          <span className="text-green-400 font-bold">{usedCount}</span> / 1,000,000 claimed
        </div>
      </header>

      {/* ---------------------------------- PIXEL GRID ---------------------------------- */}
      <PixelGrid
        ref={gridRef}
        pixels={pixels}
        searchedPixel={searchedPixel}
        selected={selected}
        onPixelSelect={toggleSelect}
        onHover={(pixel, x, y) => {
          if (pixel) setHoverInfo({ pixel, x, y });
          else setHoverInfo(null);
        }}
      />

      {/* ---------------------------------- HOVER TOOLTIP ---------------------------------- */}
      {hoverInfo && (
        <div
          className="fixed bg-gray-900 border border-gray-700 p-2 rounded shadow-lg text-sm z-50 pointer-events-none"
          style={{
            top: hoverInfo.y + 15,
            left: hoverInfo.x + 15,
            maxWidth: "200px",
          }}
        >
          <div className="font-bold mb-1">Pixel #{hoverInfo.pixel.id}</div>
          <div className="text-gray-400 text-xs">
            Status: {hoverInfo.pixel.status}
          </div>

          {hoverInfo.pixel.status === "sold" && (
            <>
              <div className="mt-1 text-xs">Color: {hoverInfo.pixel.color}</div>
              <a
                href={hoverInfo.pixel.link}
                className="text-blue-400 underline text-xs break-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                {hoverInfo.pixel.link}
              </a>
            </>
          )}
        </div>
      )}

      {/* ---------------------------------- SELECTION BAR ---------------------------------- */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-gray-700 px-4 py-2 rounded flex gap-4 items-center">
          <span>{selected.size} selected</span>

          <button
            onClick={() => setActivePixels([...selected])}
            className="bg-green-600 px-3 py-1 rounded"
          >
            Buy Selected
          </button>

          <button
            onClick={() => setSelected(new Set())}
            className="bg-gray-700 px-3 py-1 rounded"
          >
            Clear
          </button>
        </div>
      )}

      {/* ---------------------------------- PAYMENT MODAL ---------------------------------- */}
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
