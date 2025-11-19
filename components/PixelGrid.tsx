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
}

const PixelGrid: React.FC<PixelGridProps> = ({ pixels, onPixelSelect, searchedPixel, onPixelHover }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pixelsRef = useRef<Map<number, PixelData>>(pixels); // keep latest map available to animation loop
  const rafRef = useRef<number | null>(null);

  // keep pixelsRef in sync with incoming prop without forcing re-render
  useEffect(() => {
    pixelsRef.current = pixels;
  }, [pixels]);

  // Resize canvas to physical pixels (handles devicePixelRatio and CSS scale)
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
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // scale drawing operations so 1 canvas unit == 1 CSS pixel
      }
    } else {
      // ensure transform still set correctly
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
  }, []);

  // Draw function: accepts pulse (0..1) for searched highlight
  const draw = useCallback((ctx: CanvasRenderingContext2D, pulse = 0) => {
    // clear entire canvas (in CSS pixels)
    ctx.clearRect(0, 0, GRID_WIDTH, GRID_HEIGHT);

    // Speed: disable smoothing for crisp 1x1 pixel rendering
    ctx.imageSmoothingEnabled = false;

    // Draw purchased pixels (iterate sparse Map)
    for (const pixel of pixelsRef.current.values()) {
      const x = pixel.id % GRID_WIDTH;
      const y = Math.floor(pixel.id / GRID_WIDTH);
      ctx.fillStyle = pixel.color;
      // draw a 1x1 rect (units are CSS pixels because of setTransform)
      ctx.fillRect(x, y, 1, 1);
    }

    // Draw grid lines for better visibility - vertical lines every 10 pixels
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 0.5;
    for (let i = 0; i < GRID_WIDTH; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, GRID_HEIGHT);
        ctx.stroke();
    }
    // Draw horizontal lines every 10 pixels
    for (let i = 0; i < GRID_HEIGHT; i += 10) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(GRID_WIDTH, i);
        ctx.stroke();
    }

    // Draw pulsing highlight for searchedPixel (if present)
    if (searchedPixel !== null && searchedPixel >= 0 && searchedPixel < GRID_WIDTH * GRID_HEIGHT) {
      const x = searchedPixel % GRID_WIDTH;
      const y = Math.floor(searchedPixel / GRID_WIDTH);

      // pulse is between 0 and 1; compute size and alpha
      const sizeOffset = 2 * pulse; // grows a bit
      const alpha = 1 - Math.min(0.85, 0.75 * pulse);

      ctx.save();
      ctx.strokeStyle = `rgba(255, 220, 0, ${alpha})`;
      ctx.lineWidth = 0.8 + pulse * 0.8;
      // draw a rectangle centered on the pixel (a few px larger for visibility)
      ctx.strokeRect(x - 1 - sizeOffset, y - 1 - sizeOffset, 3 + sizeOffset * 2, 3 + sizeOffset * 2);
      ctx.restore();
    }
  }, [searchedPixel]);

  // Initial static draw and on resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    resizeCanvasToDisplaySize(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // initial draw (no pulse)
    draw(ctx, 0);
    // Re-draw on window resize to adjust dpr scaling
    const handleResize = () => {
      if (!canvas) return;
      resizeCanvasToDisplaySize(canvas);
      const ctx2 = canvas.getContext('2d');
      if (ctx2) draw(ctx2, 0);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [draw, resizeCanvasToDisplaySize]);

  // Animation loop for pulse when searchedPixel exists
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If there's no searched pixel, ensure a static draw and cancel animation
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
      // Oscillate pulse smoothly between 0 and 1
      const pulse = Math.abs(Math.sin(Date.now() / 400));
      draw(ctx, pulse);
      rafRef.current = requestAnimationFrame(animate);
    };
    // Start the loop
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      mounted = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [searchedPixel, draw]);

  // Helpers for mapping client coords -> canvas coords (in CSS pixels)
  const clientToCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = GRID_WIDTH / rect.width;
    const scaleY = GRID_HEIGHT / rect.height;
    // canvasX/Y in CSS coordinate space matching 0..GRID_WIDTH-1
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    const x = Math.floor(canvasX);
    const y = Math.floor(canvasY);
    return { x, y, clientX, clientY };
  }, []);

  // Click / touch handlers
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return;
    }

    const { x, y } = clientToCanvasCoords(clientX, clientY);
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      const pixelId = y * GRID_WIDTH + x;
      onPixelSelect(pixelId);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    let clientX: number, clientY: number;
    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return;
    }

    const { x, y } = clientToCanvasCoords(clientX, clientY);
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      const pixelId = y * GRID_WIDTH + x;
      onPixelHover(pixelId, clientX, clientY);
    } else {
      onPixelHover(null, 0, 0);
    }
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
      onTouchStart={handleClick}
      onTouchMove={handleMouseMove}
      className="cursor-crosshair w-[1000px] h-[1000px] image-rendering-pixelated"
      role="img"
      aria-label="Million pixel grid"
    />
  );
};

export default PixelGrid;
