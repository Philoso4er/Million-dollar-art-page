import React, { useRef, useEffect, useState } from 'react';
import { PixelData } from '../types';

const GRID_SIZE = 1000;

interface Props {
  pixels: Map<number, PixelData>;
  searchedPixel: number | null;
  selected: Set<number>;
  onHover: (pixel: PixelData | null, x: number, y: number) => void;
}

export default function PixelGrid({
  pixels,
  searchedPixel,
  selected,
  onHover
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  /* Resize */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      draw();
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  /* Draw */
  const draw = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);
    ctx.clearRect(
      -camera.x / camera.zoom,
      -camera.y / camera.zoom,
      canvas.width / camera.zoom,
      canvas.height / camera.zoom
    );

    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

    pixels.forEach(p => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      ctx.fillStyle = p.color || '#333';
      ctx.fillRect(x, y, 1, 1);
    });

    // Selected outline
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

  useEffect(draw, [camera, pixels, selected, searchedPixel]);

  const screenToPixel = (x: number, y: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const gx = Math.floor((x - rect.left - camera.x) / camera.zoom);
    const gy = Math.floor((y - rect.top - camera.y) / camera.zoom);
    if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return null;
    return gy * GRID_SIZE + gx;
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragging.current) {
      setCamera(c => ({
        ...c,
        x: c.x + e.clientX - last.current.x,
        y: c.y + e.clientY - last.current.y
      }));
      last.current = { x: e.clientX, y: e.clientY };
      onHover(null, 0, 0);
      return;
    }

    const id = screenToPixel(e.clientX, e.clientY);
    if (id === null) return onHover(null, 0, 0);

    onHover(pixels.get(id) || { id, status: 'free' } as PixelData, e.clientX, e.clientY);
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseUp = () => {
    dragging.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera(c => ({
      ...c,
      zoom: Math.min(20, Math.max(0.5, c.zoom * factor))
    }));
  };

  return (
    <canvas
      ref={canvasRef}
      className="block cursor-crosshair touch-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
    />
  );
}
