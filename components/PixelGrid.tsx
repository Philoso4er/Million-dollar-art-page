import React, { useEffect, useRef } from "react";
import { PixelData } from "../types";

const GRID_SIZE = 1000;

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
  onHover,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    canvas.width = 1000;
    canvas.height = 1000;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, 1000, 1000);

    pixels.forEach((p) => {
      const x = p.id % GRID_SIZE;
      const y = Math.floor(p.id / GRID_SIZE);
      ctx.fillStyle = p.color || "#333";
      ctx.fillRect(x, y, 1, 1);
    });

    if (searchedPixel !== null) {
      const x = searchedPixel % GRID_SIZE;
      const y = Math.floor(searchedPixel / GRID_SIZE);
      ctx.strokeStyle = "yellow";
      ctx.strokeRect(x, y, 1, 1);
    }

    selected.forEach((id) => {
      const x = id % GRID_SIZE;
      const y = Math.floor(id / GRID_SIZE);
      ctx.strokeStyle = "#00ffcc";
      ctx.strokeRect(x, y, 1, 1);
    });
  }, [pixels, selected, searchedPixel]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (1000 / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (1000 / rect.height));
    const id = y * GRID_SIZE + x;
    if (pixels.has(id)) onHover(pixels.get(id)!, e.clientX, e.clientY);
    else onHover(null, 0, 0);
  };

  const handleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (1000 / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (1000 / rect.height));
    onPixelSelect(y * GRID_SIZE + x);
  };

  return (
    <div className="flex justify-center items-center h-full pt-14">
      <canvas
        ref={canvasRef}
        className="border border-gray-700"
        style={{ width: 600, height: 600 }}
        onMouseMove={handleMouseMove}
        onClick={handleClick}
      />
    </div>
  );
}
