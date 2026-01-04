import React, { useRef, useEffect, useState } from 'react';
import { PixelData } from '../types';

const GRID_SIZE = 1000;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 20;

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

  // Camera: world → screen mapping
  const [camera, setCamera] = useState({
    offsetX: 0,
    offsetY: 0,
    zoom: 1
  });

  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const clickStart = useRef({ x: 0, y: 0 });

  /* ───────────────────────────────
     CANVAS INITIALIZATION (CRITICAL)
     Canvas internal size == CSS size
     No resizing after mount
  ─────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    canvas.width = rect.width;
    canvas.height = rect.height;

    // Center grid on load
    setCamera({
      offsetX: rect.width / 2 - GRID_SIZE / 2,
      offsetY: rect.height / 2 - GRID_SIZE / 2,
      zoom: 1
    });
  }, []);

  /* ───────────────────────────────
     DRAW
  ─────────────────────────────── */
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // Clear background
    ctx.fillStyle = '#0b0b0b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Apply camera transform
    ctx.translate(camera.offsetX, camera.offsetY);
    ctx.scale(camera.zoom, camera.zoom);

    // Grid background
    ctx.fillStyle = '#151515';
    ctx.fillRect(0, 0, GRID_SIZE, GRID_SIZE);

    // Pixels
    pixels.forEach(p => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      ctx.fillStyle = p.color || '#777';
      ctx.fillRect(x, y, 1, 1);
    });

    // Selected outline
    ctx.strokeStyle = '#00ffd0';
    ctx.lineWidth = 1 / camera.zoom;
    selected.forEach(id => {
      const x = id % GRID_SIZE;
      const y = Math.floor(id / GRID_SIZE);
      ctx.strokeRect(x - 0.5, y - 0.5, 2, 2);
    });

    // Search highlight
    if (searchedPixel !== null) {
      const x = searchedPixel % GRID_SIZE;
      const y = Math.floor(searchedPixel / GRID_SIZE);
      ctx.strokeStyle = '#ffeb3b';
      ctx.lineWidth = 2 / camera.zoom;
      ctx.strokeRect(x - 1, y - 1, 3, 3);
    }
  };

  useEffect(draw, [pixels, selected, searchedPixel, camera]);

  /* ───────────────────────────────
     COORDINATE CONVERSION
     (screen → world → pixel)
  ─────────────────────────────── */
  const screenToPixel = (clientX: number, clientY: number): number | null => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;

    const worldX = (screenX - camera.offsetX) / camera.zoom;
    const worldY = (screenY - camera.offsetY) / camera.zoom;

    if (
      worldX < 0 ||
      worldY < 0 ||
      worldX >= GRID_SIZE ||
      worldY >= GRID_SIZE
    ) {
      return null;
    }

    return Math.floor(worldY) * GRID_SIZE + Math.floor(worldX);
  };

  /* ───────────────────────────────
     MOUSE INTERACTION
  ─────────────────────────────── */
  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    clickStart.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (dragging.current) {
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;

      setCamera(c => ({
        ...c,
        offsetX: c.offsetX + dx,
        offsetY: c.offsetY + dy
      }));

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

    if (dx < 5 && dy < 5) {
      const id = screenToPixel(e.clientX, e.clientY);
      if (id !== null) onPixelSelect(id);
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;

    setCamera(c => {
      const newZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, c.zoom * zoomFactor)
      );

      const worldX = (mouseX - c.offsetX) / c.zoom;
      const worldY = (mouseY - c.offsetY) / c.zoom;

      return {
        zoom: newZoom,
        offsetX: mouseX - worldX * newZoom,
        offsetY: mouseY - worldY * newZoom
      };
    });
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
      onMouseLeave={() => (dragging.current = false)}
      onWheel={onWheel}
    />
  );
}
