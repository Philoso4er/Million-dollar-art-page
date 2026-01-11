import React, { useEffect, useState } from "react";
import PixelGrid from "./components/PixelGrid";
import PaymentModal from "./components/PaymentModal";
import AdminPanel from "./components/AdminPanel";
import { PixelData } from "./types";
import { loadPixels } from "./src/lib/loadPixels";

const TOTAL_PIXELS = 1_000_000;

export default function App() {
  const [pixels, setPixels] = useState<Map<number, PixelData>>(new Map());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [activePixels, setActivePixels] = useState<number[] | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchedPixel, setSearchedPixel] = useState<number | null>(null);
  const [hoverPixel, setHoverPixel] = useState<PixelData | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    loadPixels().then((map) => setPixels(map));
  }, []);

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSearch = () => {
    const id = Number(searchInput);
    if (!Number.isInteger(id) || id < 0 || id >= TOTAL_PIXELS) {
      alert("Invalid pixel ID");
      return;
    }
    setSearchedPixel(id);
  };

  const claimedCount = Array.from(pixels.values()).filter(
    (p) => p.status === "sold"
  ).length;

  return (
    <div className="h-screen w-screen bg-black text-white overflow-hidden relative">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 bg-gray-900 border-b border-gray-700 p-3 z-50 flex gap-3 items-center">
        <h1 className="font-bold text-lg">Million Pixel Grid</h1>

        <span className="text-sm bg-gray-800 px-3 py-1 rounded">
          {claimedCount.toLocaleString()} / 1,000,000 claimed
        </span>

        {/* Search */}
        <input
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search pixel #"
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 w-40"
        />

        <button onClick={handleSearch} className="bg-blue-600 px-3 py-1 rounded">
          Search
        </button>

        <div className="ml-auto">
          <button
            onClick={() => setShowAdmin(true)}
            className="bg-purple-600 px-3 py-1 rounded"
          >
            Admin
          </button>
        </div>
      </header>

      {/* PIXEL GRID */}
      <PixelGrid
        pixels={pixels}
        searchedPixel={searchedPixel}
        selected={selected}
        onPixelSelect={toggleSelect}
        onHover={(p, x, y) => setHoverPixel(p)}
      />

      {/* HOVER INFO */}
      {hoverPixel && hoverPixel.status === "sold" && (
        <div className="fixed bottom-4 right-4 bg-gray-900 border border-gray-600 p-3 rounded shadow-xl text-sm z-50">
          <b>Pixel #{hoverPixel.id}</b>
          <div>
            <span className="inline-block w-4 h-4 border mr-2" style={{ background: hoverPixel.color }}></span>
            <a href={hoverPixel.link} target="_blank" className="text-blue-400">
              {hoverPixel.link}
            </a>
          </div>
        </div>
      )}

      {/* SELECTED BAR */}
      {selected.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 px-4 py-2 rounded shadow-xl flex gap-4 z-50">
          <span>{selected.size} selected</span>
          <button
            onClick={() => setActivePixels([...selected])}
            className="bg-green-600 px-3 py-1 rounded"
          >
            Buy Selected
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="bg-red-600 px-3 py-1 rounded"
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

      {/* ADMIN PANEL */}
      {showAdmin && (
        <AdminPanel
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}
