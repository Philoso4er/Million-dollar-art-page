import React, { useState } from "react";

interface Props {
  pixelIds: number[];
  onClose: () => void;
}

type Mode = "sync" | "individual";

export default function PaymentModal({ pixelIds, onClose }: Props) {
  const [mode, setMode] = useState<Mode>("sync");

  const [syncColor, setSyncColor] = useState("#ff0000");
  const [syncLink, setSyncLink] = useState("");

  const [individualData, setIndividualData] = useState(
    pixelIds.map((id) => ({
      id,
      color: "#ff0000",
      link: "",
    }))
  );

  const [reference, setReference] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const updateIndividual = (index: number, key: "color" | "link", value: string) => {
    setIndividualData((prev) => {
      const next = [...prev];
      next[index][key] = value;
      return next;
    });
  };

  const reserve = async () => {
    setLoading(true);

    const payload =
      mode === "sync"
        ? {
            pixelIds,
            color: syncColor,
            link: syncLink,
            individual: null,
          }
        : {
            pixelIds,
            color: null,
            link: null,
            individual: individualData,
          };

    const res = await fetch("/api/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      alert("Reservation failed. Please try again.");
      setLoading(false);
      return;
    }

    const data = await res.json();
    setReference(data.reference);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-xl w-full max-w-lg text-white border border-gray-700">

        {!reference ? (
          <>
            <h2 className="text-xl font-bold mb-4">
              Buy {pixelIds.length} Pixel{pixelIds.length > 1 ? "s" : ""}
            </h2>

            {/* MODE SWITCH */}
            <div className="flex gap-3 mb-4">
              <button
                onClick={() => setMode("sync")}
                className={`flex-1 py-2 rounded ${mode === "sync" ? "bg-blue-600" : "bg-gray-700"}`}
              >
                Same Color & Link
              </button>

              <button
                onClick={() => setMode("individual")}
                className={`flex-1 py-2 rounded ${
                  mode === "individual" ? "bg-blue-600" : "bg-gray-700"
                }`}
              >
                Individual Per Pixel
              </button>
            </div>

            {/* SYNC MODE UI */}
            {mode === "sync" && (
              <>
                <label className="block text-sm mb-1">Color</label>
                <input
                  type="color"
                  value={syncColor}
                  onChange={(e) => setSyncColor(e.target.value)}
                  className="w-full h-10 rounded mb-4"
                />

                <label className="block text-sm mb-1">Link</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={syncLink}
                  onChange={(e) => setSyncLink(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded mb-4"
                />
              </>
            )}

            {/* INDIVIDUAL MODE UI */}
            {mode === "individual" && (
              <div className="max-h-64 overflow-y-auto pr-2">
                {individualData.map((p, i) => (
                  <div key={p.id} className="mb-4 border-b border-gray-700 pb-2">
                    <div className="text-sm font-bold mb-1">Pixel #{p.id}</div>

                    <input
                      type="color"
                      value={p.color}
                      onChange={(e) => updateIndividual(i, "color", e.target.value)}
                      className="w-full h-10 rounded mb-2"
                    />

                    <input
                      type="url"
                      placeholder="https://example.com"
                      value={p.link}
                      onChange={(e) => updateIndividual(i, "link", e.target.value)}
                      className="w-full px-3 py-1 bg-gray-800 border border-gray-700 rounded"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ACTION BUTTONS */}
            <div className="flex gap-3 mt-4">
              <button onClick={onClose} className="flex-1 py-2 bg-gray-700 rounded">
                Cancel
              </button>

              <button
                onClick={reserve}
                disabled={loading}
                className="flex-1 py-2 bg-green-600 rounded font-bold"
              >
                {loading ? "Processing…" : `Reserve ($${pixelIds.length})`}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* PAYMENT SCREEN */}
            <h2 className="text-xl font-bold mb-4">Payment Instructions</h2>

            <div className="bg-black p-3 rounded border border-gray-700 mb-4">
              <p className="text-sm text-gray-300">Reference</p>
              <p className="text-green
