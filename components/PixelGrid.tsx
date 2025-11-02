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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // FIX: Initialize useRef with a null value and correct type to avoid an error where an argument is expected but not provided.
  const animationFrameRef = useRef<number | null>(null);

  const draw = useCallback((pulse = 0) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw purchased pixels
    for (const pixel of pixels.values()) {
      const x = pixel.id % GRID_WIDTH;
      const y = Math.floor(pixel.id / GRID_WIDTH);
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x, y, 1, 1);
    }
    
    // Draw grid lines for better visibility on empty areas
    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 0.05;
    for (let i = 0; i < GRID_WIDTH; i += 50) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, GRID_HEIGHT);
        ctx.stroke();
    }
    for (let i = 0; i < GRID_HEIGHT; i += 50) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(GRID_WIDTH, i);
        ctx.stroke();
    }

    // Draw pulsing highlight for searched pixel
    if (searchedPixel !== null) {
      const x = searchedPixel % GRID_WIDTH;
      const y = Math.floor(searchedPixel / GRID_WIDTH);
      
      const sizeOffset = 2 * pulse; // pulse is 0 to 1
      const alpha = 1 - (0.75 * pulse);

      ctx.strokeStyle = `rgba(255, 255, 0, ${alpha})`; // Pulsing yellow
      ctx.lineWidth = 0.5 + pulse;
      ctx.strokeRect(x - 1 - sizeOffset, y - 1 - sizeOffset, 3 + sizeOffset * 2, 3 + sizeOffset * 2);
    }
  }, [pixels, searchedPixel]);

  // Effect for static draws (when pixel data changes)
  useEffect(() => {
    draw();
  }, [pixels, draw]);
  
  // Effect for animation loop
  useEffect(() => {
    if (searchedPixel === null) {
      draw(); // Redraw once to clear the highlight
      return;
    }

    const animate = () => {
        // Creates a smooth oscillating value between 0 and 1
        const pulse = Math.abs(Math.sin(Date.now() / 400)); 
        draw(pulse);
        animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
    };
}, [searchedPixel, draw]);


  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const x = Math.floor(canvasX);
    const y = Math.floor(canvasY);

    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      const pixelId = y * GRID_WIDTH + x;
      onPixelSelect(pixelId);
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const canvasX = (e.clientX - rect.left) * scaleX;
    const canvasY = (e.clientY - rect.top) * scaleY;

    const x = Math.floor(canvasX);
    const y = Math.floor(canvasY);
    
    if (x >= 0 && x < GRID_WIDTH && y >= 0 && y < GRID_HEIGHT) {
      const pixelId = y * GRID_WIDTH + x;
      onPixelHover(pixelId, e.clientX, e.clientY);
    } else {
      handleMouseLeave();
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
      className="cursor-crosshair w-[1000px] h-[1000px] image-rendering-pixelated"
    />
  );
};

export default PixelGrid;