// src/components/PixelGrid.tsx
import React, { useRef, useEffect, useCallback } from 'react';
import { PixelData } from '../types';

const GRID_WIDTH = 1000;
const GRID_HEIGHT = 1000;

interface PixelGridProps {
  pixels: Map<number, PixelData>;
  onPixelSelect: (pixelId: number) => void;
  searchedPixel: number | null;
  onPixelHover: (pixelId: number | null, mouseX: number, mouseY: number) => void;
  scale?: number; // 1 = 100%, 2 = 200% etc.
}

const TOUCH_LONGPRESS_MS = 500;
const TOUCH_MOVE_THRESHOLD = 10;

const PixelGrid: React.FC<PixelGridProps> = ({ pixels, onPixelSelect, searchedPixel, onPixelHover, scale = 1 }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelsRef = useRef<Map<number, PixelData>>(pixels);
  const rafRef = useRef<number | null>(null);

  // touch state
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchMoved = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  useEffect(() => { pixelsRef.current = pixels; }, [pixels]);

  // Resize canvas so that CSS size = GRID_WIDTH * scale (in CSS pixels)
  const resizeCanvasForScale = useCallback((canvas: HTMLCanvasElement, desiredCssWidth?: number, desiredCssHeight?: number) => {
    // if desiredCssWidth/Height not provided, use measured bounding rect
    const rect = canvas.getBoundingClientRect();
    const cssWidth = desiredCssWidth ?? rect.width;
    const cssHeight = desiredCssHeight ?? rect.height;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // set canvas drawing buffer size in device pixels
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    canvas.width = Math.round(cssWidth * dpr);
    canvas.height = Math.round(cssHeight * dpr);

    const ctx = canvas.getContext('2d');
    if (ctx) {
      // transform so that 1 canvas unit == 1 CSS pixel (accounting for dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, []);

  // Draw function receives pulse for searched highlight
  const draw = useCallback((ctx: CanvasRenderingContext2D, pulse = 0) => {
    // clear in CSS pixel space
    ctx.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);

    ctx.imageSmoothingEnabled = false;

    // Draw purchased pixels
    for (const p of pixelsRef.current.values()) {
      const x = p.id % GRID_WIDTH;
      const y = Math.floor(p.id / GRID_WIDTH);
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, 1, 1);
    }

    // Grid lines every 10px (CSS pixel units)
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i < GRID_WIDTH; i += 10) {
      ctx.beginPath();
      ctx.moveTo(i + 0.5, 0);
      ctx.lineTo(i + 0.5, GRID_HEIGHT);
      ctx.stroke();
    }
    for (let j = 0; j < GRID_HEIGHT; j += 10) {
      ctx.beginPath();
      ctx.moveTo(0, j + 0.5);
      ctx.lineTo(GRID_WIDTH, j + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    // Pulsing highlight for searchedPixel
    if (searchedPixel !== null && searchedPixel >= 0 && searchedPixel < GRID_WIDTH * GRID_HEIGHT) {
      const x = searchedPixel % GRID_WIDTH;
      const y = Math.floor(searchedPixel / GRID_WIDTH);
      const sizeOffset = 2 * pulse;
      const alpha = 1 - Math.min(0.85, 0.75 * pulse);
      ctx.save();
      ctx.strokeStyle = `rgba(255,220,0,${alpha})`;
      ctx.lineWidth = 0.8 + pulse * 0.8;
      ctx.strokeRect(x - 1 - sizeOffset, y - 1 - sizeOffset, 3 + sizeOffset * 2, 3 + sizeOffset * 2);
      ctx.restore();
    }
  }, [searchedPixel]);

  // Initialize canvas and watch window resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set CSS size to grid size * scale
    const cssW = GRID_WIDTH * scale;
    const cssH = GRID_HEIGHT * scale;
    resizeCanvasForScale(canvas, cssW, cssH);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // draw one-to-one grid units (we draw scaled by changing CSS size; logical drawing uses 0..GRID_WIDTH)
    draw(ctx, 0);

    const handleResize = () => {
      // keep CSS sizing at GRID * scale (responsive)
      resizeCanvasForScale(canvas, GRID_WIDTH * scale, GRID_HEIGHT * scale);
      const ctx2 = canvas.getContext('2d');
      if (ctx2) draw(ctx2, 0);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw, resizeCanvasForScale, scale]);

  // Animate pulse when searchedPixel exists
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (searchedPixel === null) {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      draw(ctx, 0);
      return;
    }

    let mounted = true;
    const animate = () => {
      if (!mounted) return;
      const pulse = Math.abs(Math.sin(Date.now() / 400));
      draw(ctx, pulse);
      rafRef.current = requestAnimationFrame(animate);
    };
    if (!rafRef.current) rafRef.current = requestAnimationFrame(animate);

    return () => {
      mounted = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [searchedPixel, draw]);

  // Map client coords to grid pixel coordinates (works at any CSS size)
  const clientToCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect(); // reflects CSS size = GRID * scale
    const scaleX = GRID_WIDTH / rect.width;
    const scaleY = GRID_HEIGHT / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    const x = Math.floor(canvasX);
    const y = Math.floor(canvasY);
    return { x, y, clientX, clientY };
  }, []);

  // Helpers for long-press
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressTriggered.current = false;
  }, []);

  // Mouse handlers
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = clientToCanvasCoords(e.clientX, e.clientY);
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      onPixelSelect(y * GRID_WIDTH + x);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y, clientX, clientY } = clientToCanvasCoords(e.clientX, e.clientY);
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      onPixelHover(y * GRID_WIDTH + x, clientX, clientY);
    } else {
      onPixelHover(null, 0, 0);
    }
  };

  // Touch handlers (same behavior as previous turn)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    touchMoved.current = false;
    longPressTriggered.current = false;

    // long press triggered
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true;
      const { x, y } = clientToCanvasCoords(t.clientX, t.clientY);
      if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
        onPixelHover(y * GRID_WIDTH + x, t.clientX, t.clientY);
      }
    }, TOUCH_LONGPRESS_MS);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStartX.current);
    const dy = Math.abs(t.clientY - touchStartY.current);
    if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
      touchMoved.current = true;
      clearLongPress();
      onPixelHover(null, 0, 0);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (longPressTriggered.current) {
      clearLongPress();
      return;
    }
    clearLongPress();
    if (touchMoved.current) {
      touchMoved.current = false;
      return;
    }
    const touch = (e.changedTouches && e.changedTouches[0]) || (e.touches && e.touches[0]);
    if (!touch) return;
    const { x, y } = clientToCanvasCoords(touch.clientX, touch.clientY);
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      const pixelId = y * GRID_WIDTH + x;
      onPixelSelect(pixelId);
      onPixelHover(null, 0, 0);
    }
  };

  const handleTouchCancel = () => {
    clearLongPress();
    onPixelHover(null, 0, 0);
  };

  const handleMouseLeave = () => {
    onPixelHover(null, 0, 0);
  };

  return (
    <canvas
      ref={canvasRef}
      width={GRID_WIDTH} // initial (will be resized by effect to GRID*scale CSS)
      height={GRID_HEIGHT}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className="cursor-crosshair image-rendering-pixelated"
      role="img"
      aria-label="Million pixel grid"
      style={{
        // We don't set CSS width/height here; resize effect sets precise CSS px sizing.
        display: 'block',
        margin: 0,
      }}
    />
  );
};

export default PixelGrid;
