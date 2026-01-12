import React, { useRef, useEffect, useState } from "react";
import { PixelData } from "../types";

const GRID_SIZE = 1000;

interface Props {
  pixels: Map<number, PixelData>;
  searchedPixel: number | null;
  selected: Set<number>;
  onPixelSelect: (id: number) => void;
  onHover: (pixel: PixelData | null, x: number, y: number) => void;
}

export default function PixelGrid({
  pixels,
  searchedPixel,
  selected,
  onPixelSelect,
  onHover,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [camera, setCamera] = useState({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const drag = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // Grid background
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

    // Draw pixels
    pixels.forEach((p) => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, 1, 1);
    });

    // Selected outline
    selected.forEach((id) => {
      const x = id % GRID_SIZE;
      const y = Math.floor(id / GRID_SIZE);
      ctx.strokeStyle = "#00ffff";
      ctx.lineWidth = 1 / camera.zoom;
      ctx.strokeRect(x - 0.5, y - 0.5, 2, 2);
    });

    // Highlight searched pixel
    if (searchedPixel !== null) {
      const x = searchedPixel % GRID_SIZE;
      const y = Math.floor(searchedPixel / GRID_SIZE);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(x - 1, y - 1, 3, 3);
    }

    ctx.restore();
  };

  useEffect(draw, [pixels, selected, searchedPixel, camera]);

  const screenToId = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    const x = (clientX - rect.left - camera.x) / camera.zoom;
    const y = (clientY - rect.top - camera.y) / camera.zoom;

    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return null;
    return Math.floor(y) * GRID_SIZE + Math.floor(x);
  };

  return (
    <canvas
      ref={canvasRef}
      width={1000}
      height={1000}
      className="w-full h-full"
      onWheel={(e) => {
        e.preventDefault();
        const zoom = camera.zoom * (e.deltaY > 0 ? 0.9 : 1.1);
        setCamera((c) => ({ ...c, zoom }));
      }}
      onMouseDown={(e) => {
        drag.current = true;
        last.current = { x: e.clientX, y: e.clientY };
      }}
      onMouseMove={(e) => {
        if (drag.current) {
          setCamera((c) => ({
            ...c,
            x: c.x + (e.clientX - last.current.x),
            y: c.y + (e.clientY - last.current.y),
          }));
          last.current = { x: e.clientX, y: e.clientY };
        }

        const id = screenToId(e.clientX, e.clientY);
        if (id !== null) {
          const p = pixels.get(id) || { id, color: "#333", link: "", status: "free" };
          onHover(p, e.clientX, e.clientY);
        } else {
          onHover(null, 0, 0);
        }
      }}
      onMouseUp={() => (drag.current = false)}
      onMouseLeave={() => (drag.current = false)}
      onClick={(e) => {
        const id = screenToId(e.clientX, e.clientY);
        if (id !== null) onPixelSelect(id);
      }}
    />
  );
}
