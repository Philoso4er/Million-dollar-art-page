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
  enableLongPress?: boolean; // new prop to control long-press behavior
}

const TOUCH_LONGPRESS_MS = 500; // hold duration to trigger tooltip
const TOUCH_MOVE_THRESHOLD = 10; // px movement tolerated for tap

const PixelGrid: React.FC<PixelGridProps> = ({ pixels, onPixelSelect, searchedPixel, onPixelHover, enableLongPress = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelsRef = useRef<Map<number, PixelData>>(pixels);
  const rafRef = useRef<number | null>(null);

  // touch state refs
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchMoved = useRef(false);
  const longPressTimer = useRef<number | null>(null);
  const longPressTriggered = useRef(false);

  // keep pixelsRef in sync
  useEffect(() => {
    pixelsRef.current = pixels;
  }, [pixels]);

  // Resize canvas handle DPR
  const resizeCanvasToDisplaySize = useCallback((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const displayWidth = Math.round(rect.width);
    const displayHeight = Math.round(rect.height);
    const needResize = canvas.width !== Math.round(displayWidth * dpr) || canvas.height !== Math.round(displayHeight * dpr);

    if (needResize) {
      canvas.width = Math.round(displayWidth * dpr);
      canvas.height = Math.round(displayHeight * dpr);
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    } else {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }, []);

  // draw function
  const draw = useCallback((ctx: CanvasRenderingContext2D, pulse = 0) => {
    ctx.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);
    ctx.imageSmoothingEnabled = false;

    for (const pixel of pixelsRef.current.values()) {
      const x = pixel.id % GRID_WIDTH;
      const y = Math.floor(pixel.id / GRID_WIDTH);
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, 1, 1);
    }

    // 10px grid lines
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

  // initial draw + resize listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeCanvasToDisplaySize(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    draw(ctx, 0);

    const handleResize = () => {
      if (!canvas) return;
      resizeCanvasToDisplaySize(canvas);
      const ctx2 = canvas.getContext('2d');
      if (ctx2) draw(ctx2, 0);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw, resizeCanvasToDisplaySize]);

  // pulse animation when searchedPixel present
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

  // convert client coords -> canvas pixel coords (CSS pixels)
  const clientToCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = GRID_WIDTH / rect.width;
    const scaleY = GRID_HEIGHT / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    const x = Math.floor(canvasX);
    const y = Math.floor(canvasY);
    return { x, y, clientX, clientY };
  }, []);

  // Helpers to clear any pending long-press
  const clearLongPress = useCallback(() => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    longPressTriggered.current = false;
  }, []);

  // Mouse handlers (desktop)
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

  // Touch handlers (mobile)
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    touchStartX.current = t.clientX;
    touchStartY.current = t.clientY;
    touchMoved.current = false;
    longPressTriggered.current = false;

    // start long-press timer only if enabled
    if (enableLongPress) {
      longPressTimer.current = window.setTimeout(() => {
        longPressTriggered.current = true;
        const { x, y } = clientToCanvasCoords(t.clientX, t.clientY);
        if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
          onPixelHover(y * GRID_WIDTH + x, t.clientX, t.clientY);
        }
      }, TOUCH_LONGPRESS_MS);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!e.touches || e.touches.length === 0) return;
    const t = e.touches[0];
    const dx = Math.abs(t.clientX - touchStartX.current);
    const dy = Math.abs(t.clientY - touchStartY.current);
    if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
      touchMoved.current = true;
      // If the user is moving (scrolling/panning), cancel long-press
      clearLongPress();
      onPixelHover(null, 0, 0);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // If longPress already triggered, keep tooltip visible and do not select
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
      width={GRID_WIDTH}
      height={GRID_HEIGHT}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      className="cursor-crosshair w-[1000px] h-[1000px] image-rendering-pixelated"
      role="img"
      aria-label="Million pixel grid"
    />
  );
};

export default PixelGrid;
