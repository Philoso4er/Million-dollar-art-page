import React, { useRef, useEffect, useState } from 'react';
import { PixelData } from '../types';

const GRID_SIZE = 1000;

interface Props {
  pixels: Map<number, PixelData>;
  onPixelSelect: (id: number) => void;
  searchedPixel: number | null;
}

export default function PixelGrid({
  pixels,
  onPixelSelect,
  searchedPixel
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Camera state
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

  // Mouse drag
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });

  // Touch handling
  const lastTouch = useRef<{ x: number; y: number } | null>(null);
  const lastPinchDist = useRef<number | null>(null);

  /* =========================
     CANVAS RESIZE
  ========================== */
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

  /* =========================
     DRAW
  ========================== */
  const draw = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(camera.zoom, 0, 0, camera.zoom, camera.x, camera.y);

    // Clear visible area
    ctx.clearRect(
      -camera.x / camera.zoom,
      -camera.y / camera.zoom,
      canvas.width / camera.zoom,
      canvas.height / camera.zoom
    );

    // Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

    // Pixels
    pixels.forEach(p => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      ctx.fillStyle = p.color || '#333';
      ctx.fillRect(x, y, 1, 1);
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

  useEffect(draw, [camera, pixels, searchedPixel]);

  /* =========================
     MOUSE CONTROLS
  ========================== */
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
    if (!dragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
  };

  const onMouseUp = () => {
    dragging.current = false;
  };

  /* =========================
     TOUCH CONTROLS
  ========================== */
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

    // One finger = pan
    if (e.touches.length === 1 && lastTouch.current) {
      const dx = e.touches[0].clientX - lastTouch.current.x;
      const dy = e.touches[0].clientY - lastTouch.current.y;
      lastTouch.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
      setCamera(c => ({ ...c, x: c.x + dx, y: c.y + dy }));
    }

    // Two fingers = pinch zoom
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
  };

  /* =========================
     CLICK / TAP SELECT
  ========================== */
  const onClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left - camera.x) / camera.zoom);
    const y = Math.floor((e.clientY - rect.top - camera.y) / camera.zoom);

    if (x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE) {
      onPixelSelect(y * GRID_SIZE + x);
    }
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
