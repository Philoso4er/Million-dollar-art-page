import React, { useEffect, useState } from "react";
import PixelGrid from "./components/PixelGrid";
import PaymentModal from "./components/PaymentModal"; // ✔ correct path
import { PixelData } from "./types";
import { loadPixels } from "./src/lib/loadPixels"; // ✔ correct path because loadPixels IS in src

const TOTAL_PIXELS = 1_000_000;

export default function App() {
  const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activePixels, setActivePixels] = useState<number[] | null>(null);

  const [usedCount, setUsedCount] = useState(0);

  const [searchInput, setSearchInput] = useState("");
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);

  const [hoverInfo, setHoverInfo] = useState<{
    pixel: PixelData;
    x: number;
    y: number;
  } | null>(null);

  /* Load pixels + count sold/reserved */
  useEffect(() => {
    loadPixels().then((map) => {
      setPixels(map);

      let used = 0;
      map.forEach((p) => {
        if (p.status === "sold" || p.status === "reserved") used++;
      });
      setUsedCount(used);
    });
  }, []);

  /* Select or unselect pixels */
  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  /* Search by pixel ID */
  const handleSearch = () => {
    const id = Number(searchInput);

    if (!Number.isInteger(id) || id < 0 || id >= TOTAL_PIXELS) {
      alert("Invalid pixel ID");
      return;
    }

    setSearchedPixel(id);
  };

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden relative">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-700 p-3 flex items-center gap-4">

        {/* Search */}
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

        {/* Claimed counter */}
        <div className="text-sm ml-auto text-gray-300">
          <span className="font-bold text-green-400">{usedCount}</span>
          / 1,000,000 claimed
        </div>
      </header>

      {/* GRID */}
      <PixelGrid
        pixels={pixels}
        searchedPixel={searchedPixel}
        selected={selected}
        onPixelSelect={toggleSelect}
        onHover={(pixel, x, y) => {
          if (pixel) {
            setHoverInfo({ pixel, x, y });
          } else {
            setHoverInfo(null);
          }
        }}
      />

      {/* Hover tooltip */}
      {hoverInfo && (
        <div
          className="fixed bg-gray-900 border border-gray-700 p-2 rounded shadow-lg z-50 pointer-events-none"
          style={{
            top: hoverInfo.y + 15,
            left: hoverInfo.x + 15,
            maxWidth: "200px",
          }}
        >
          <div className="font-bold mb-1">Pixel #{hoverInfo.pixel.id}</div>
          <div className="text-xs text-gray-400">Status: {hoverInfo.pixel.status}</div>

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

      {/* Selection Bar */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 border border-gray-700 px-4 py-2 rounded flex gap-4">
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

      {/* PAYMENT MODAL */}
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
