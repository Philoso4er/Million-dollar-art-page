import React, { useRef, useEffect, useState } from "react";
import { PixelData } from "../types";

const GRID_SIZE = 1000;
const CANVAS_SIZE = 800; // fixed pixel grid box

interface Props {
  pixels: Map<number, PixelData>;
  selected: Set<number>;
  searchedPixel: number | null;
  onPixelSelect: (id: number) => void;
  onHover: (pixel: PixelData | null, x: number, y: number) => void;
}

export default function PixelGrid({
  pixels,
  selected,
  searchedPixel,
  onPixelSelect,
  onHover
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [camera, setCamera] = useState({
    x: 0,
    y: 0,
    zoom: 1
  });

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const clickStart = useRef({ x: 0, y: 0 });

  const draw = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);

    // grid background
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

    // pixels
    pixels.forEach((p) => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      ctx.fillStyle = p.color || "#444";
      ctx.fillRect(x, y, 1, 1);
    });

    // selected outline
    selected.forEach((id) => {
      const x = id % GRID_SIZE;
      const y = Math.floor(id / GRID_SIZE);
      ctx.strokeStyle = "#00FFCC";
      ctx.lineWidth = 1 / camera.zoom;
      ctx.strokeRect(x - 0.5, y - 0.5, 2, 2);
    });

    // search highlight
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

  const screenToPixel = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    const x = (clientX - rect.left - camera.x) / camera.zoom;
    const y = (clientY - rect.top - camera.y) / camera.zoom;

    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return null;
    return Math.floor(y) * GRID_SIZE + Math.floor(x);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragging.current) {
      setCamera(c => ({
        ...c,
        x: c.x + (e.clientX - last.current.x),
        y: c.y + (e.clientY - last.current.y)
      }));
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const id = screenToPixel(e.clientX, e.clientY);
    if (id !== null) {
      onHover(pixels.get(id) || null, e.clientX, e.clientY);
    } else {
      onHover(null, 0, 0);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      className="block mx-auto mt-10 border border-gray-700"
      style={{ imageRendering: "pixelated" }}
      onMouseDown={(e) => {
        dragging.current = true;
        last.current = { x: e.clientX, y: e.clientY };
        clickStart.current = { x: e.clientX, y: e.clientY };
      }}
      onMouseUp={(e) => {
        dragging.current = false;
        if (Math.abs(e.clientX - clickStart.current.x) < 5) {
          const id = screenToPixel(e.clientX, e.clientY);
          if (id !== null) onPixelSelect(id);
        }
      }}
      onMouseLeave={() => (dragging.current = false)}
      onMouseMove={onMouseMove}
      onWheel={(e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        setCamera(c => ({
          ...c,
          zoom: Math.min(10, Math.max(0.5, c.zoom * zoomFactor))
        }));
      }}
    />
  );
}
