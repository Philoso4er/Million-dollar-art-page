import React, { useRef, useEffect, useState } from 'react';
import { PixelData } from '../types';

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
  onHover
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera controls the "view" into the fixed grid
  const [camera, setCamera] = useState({
    x: -GRID_SIZE / 2,
    y: -GRID_SIZE / 2,
    zoom: 2
  });

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const clickStart = useRef({ x: 0, y: 0 });

  /* ---------- INITIALIZE CANVAS ---------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    canvas.width = GRID_SIZE;
    canvas.height = GRID_SIZE;
    draw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- DRAW ---------- */
  const draw = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    
    // 🔑 Always reset transform first
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Clear full canvas
    ctx.fillStyle = '#111'; // grid background
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform
    ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);

    // Base grid (slightly darker than page)
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

    // Draw pixels
    pixels.forEach(p => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      ctx.fillStyle = p.color || '#777';
      ctx.fillRect(x, y, 1, 1);
    });

    // Selected pixels outline
    selected.forEach(id => {
      const x = id % GRID_SIZE;
      const y = Math.floor(id / GRID_SIZE);
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 1 / camera.zoom;
      ctx.strokeRect(x - 0.5, y - 0.5, 2, 2);
    });

    // Search highlight
    if (searchedPixel !== null) {
      const x = searchedPixel % GRID_SIZE;
      const y = Math.floor(searchedPixel / GRID_SIZE);
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 1 / camera.zoom;
      ctx.strokeRect(x - 1, y - 1, 3, 3);
    }
  };

  useEffect(draw, [pixels, selected, searchedPixel, camera]);

  /* ---------- HELPERS ---------- */
  const screenToPixel = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left - camera.x) / camera.zoom);
    const y = Math.floor((clientY - rect.top - camera.y) / camera.zoom);
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return null;
    return y * GRID_SIZE + x;
  };

  const clampCamera = (x: number, y: number, zoom: number) => {
    const max = GRID_SIZE * zoom;
    return {
      x: Math.min(100, Math.max(x, -max + 100)),
      y: Math.min(100, Math.max(y, -max + 100)),
      zoom
    };
  };

  /* ---------- MOUSE EVENTS ---------- */
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    clickStart.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragging.current) {
      setCamera(c =>
        clampCamera(
          c.x + e.clientX - last.current.x,
          c.y + e.clientY - last.current.y,
          c.zoom
        )
      );
      last.current = { x: e.clientX, y: e.clientY };
      return;
    }

    const id = screenToPixel(e.clientX, e.clientY);
    if (id === null) {
      onHover(null, 0, 0);
    } else {
      onHover(pixels.get(id) || null, e.clientX, e.clientY);
    }
  };

  const onMouseUp = (e: React.MouseEvent) => {
    dragging.current = false;

    const dx = Math.abs(e.clientX - clickStart.current.x);
    const dy = Math.abs(e.clientY - clickStart.current.y);

    // Treat as click if mouse didn't move much
    if (dx < 5 && dy < 5) {
      const id = screenToPixel(e.clientX, e.clientY);
      if (id !== null) {
        onPixelSelect(id);
      }
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera(c => clampCamera(c.x, c.y, c.zoom * factor));
  };

  return (
    <canvas
      ref={canvasRef}
      className="block cursor-crosshair touch-none"
      style={{
        width: '100%',
        height: '100%',
        imageRendering: 'pixelated'
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    />
  );
}
