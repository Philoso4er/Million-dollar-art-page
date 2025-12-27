import React, { useRef, useEffect, useState } from 'react';
import { PixelData } from '../types';

const GRID_SIZE = 1000;

interface HoverInfo {
  id: number;
  x: number;
  y: number;
}

interface Props {
  pixels: Map<number, PixelData>;
  onPixelSelect: (id: number) => void;
  searchedPixel: number | null;
  onHover: (pixel: PixelData | null, screenX: number, screenY: number) => void;
  onCameraChange?: (camera: { x: number; y: number; zoom: number }) => void;
}

export default function PixelGrid({
  pixels,
  onPixelSelect,
  searchedPixel,
  onHover,
  onCameraChange
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

  // Mouse drag
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Touch
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDist = useRef<number | null>(null);

  /* ================= CANVAS ================= */
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

  /* ================= DRAW ================= */
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

    if (searchedPixel !== null) {
      const x = searchedPixel % GRID_SIZE;
      const y = Math.floor(searchedPixel / GRID_SIZE);
      ctx.strokeStyle = 'yellow';
      ctx.lineWidth = 1 / camera.zoom;
      ctx.strokeRect(x - 1, y - 1, 3, 3);
    }
  };

  useEffect(() => {
    draw();
    onCameraChange?.(camera);
  }, [camera, pixels, searchedPixel]);

  /* ================= HELPERS ================= */
  const screenToPixel = (clientX: number, clientY: number) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left - camera.x) / camera.zoom);
    const y = Math.floor((clientY - rect.top - camera.y) / camera.zoom);
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return null;
    return y * GRID_SIZE + x;
  };

  /* ================= MOUSE ================= */
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setCamera(c => ({
      ...c,
      zoom: Math.min(20, Math.max(0.5, c.zoom * factor))
    }));
  };

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragging.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
      onHover(null, 0, 0);
      return;
    }

    const id = screenToPixel(e.clientX, e.clientY);
    if (id === null) {
      onHover(null, 0, 0);
      return;
    }

    const pixel = pixels.get(id) || {
      id,
      status: 'free'
    };

    onHover(pixel as PixelData, e.clientX, e.clientY);
  };

  const onMouseUp = () => (dragging.current = false);

  const onClick = (e: React.MouseEvent) => {
    const id = screenToPixel(e.clientX, e.clientY);
    if (id !== null) onPixelSelect(id);
  };

  /* ================= TOUCH ================= */
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      lastTouch.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastPinchDist.current = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    if (e.touches.length === 1 && lastTouch.current) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      lastTouch.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
      setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
    }

    if (e.touches.length === 2 && lastPinchDist.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / lastPinchDist.current;
      lastPinchDist.current = dist;
      setCamera(c => ({
        ...c,
        zoom: Math.min(20, Math.max(0.5, c.zoom * scale))
      }));
    }
  };

  const onTouchEnd = () => {
    lastTouch.current = null;
    lastPinchDist.current = null;
    onHover(null, 0, 0);
  };

  return (
    <canvas
      ref={canvasRef}
      className="block cursor-grab touch-none"
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onClick={onClick}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    />
  );
}
