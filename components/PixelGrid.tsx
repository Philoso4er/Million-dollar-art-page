import React, { useRef, useEffect } from "react";
import { PixelData } from "../types";

interface Props {
  pixels: Map<number, PixelData>;
  selected: Set<number>;
  searchedPixel: number | null;
  onPixelSelect: (id: number) => void;
  onHover: (pixel: PixelData | null, x: number, y: number) => void;
}

const GRID_WIDTH = 1000;   // 1000 x 1000 = 1,000,000 pixels
const GRID_HEIGHT = 1000;
const PIXEL_SIZE = 1;       // 1px on canvas

export default function PixelGrid({
  pixels,
  selected,
  searchedPixel,
  onPixelSelect,
  onHover,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Pan state
  const offset = useRef({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  /** Draw entire grid */
  const drawGrid = () => {
    const canvas = canvasRef.current;
    if (!canvas || pixels.size === 0) return;

    const ctx = ctxRef.current!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    pixels.forEach((p) => {
      const x = p.id % GRID_WIDTH;
      const y = Math.floor(p.id / GRID_WIDTH);

      ctx.fillStyle =
        p.status === "sold"
          ? p.color
          : p.status === "reserved"
          ? "#333333"
          : "#111111";

      ctx.fillRect(
        x * PIXEL_SIZE + offset.current.x,
        y * PIXEL_SIZE + offset.current.y,
        PIXEL_SIZE,
        PIXEL_SIZE
      );
    });

    // highlight selected pixels
    selected.forEach((id) => {
      const x = id % GRID_WIDTH;
      const y = Math.floor(id / GRID_WIDTH);

      ctx.strokeStyle = "yellow";
      ctx.strokeRect(
        x * PIXEL_SIZE + offset.current.x - 1,
        y * PIXEL_SIZE + offset.current.y - 1,
        PIXEL_SIZE + 2,
        PIXEL_SIZE + 2
      );
    });

    // highlight searched pixel
    if (searchedPixel !== null) {
      const x = searchedPixel % GRID_WIDTH;
      const y = Math.floor(searchedPixel / GRID_WIDTH);

      ctx.strokeStyle = "red";
      ctx.lineWidth = 2;
      ctx.strokeRect(
        x * PIXEL_SIZE + offset.current.x - 2,
        y * PIXEL_SIZE + offset.current.y - 2,
        PIXEL_SIZE + 4,
        PIXEL_SIZE + 4
      );
    }
  };

  /** Resize canvas to window */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    ctxRef.current = canvas.getContext("2d")!;
    drawGrid();
  }, [pixels, selected, searchedPixel]);

  /** Mouse interactions */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    /* DRAG PAN */
    const onMouseDown = (e: MouseEvent) => {
      dragging.current = true;
      lastPos.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      dragging.current = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (dragging.current) {
        offset.current.x += e.clientX - lastPos.current.x;
        offset.current.y += e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        drawGrid();
      } else {
        const gridX = Math.floor((e.clientX - offset.current.x) / PIXEL_SIZE);
        const gridY = Math.floor((e.clientY - offset.current.y) / PIXEL_SIZE);
        const id = gridY * GRID_WIDTH + gridX;

        const pixel = pixels.get(id);
        onHover(pixel || null, e.clientX, e.clientY);
      }
    };

    /* CLICK SELECT */
    const onClick = (e: MouseEvent) => {
      const x = Math.floor((e.clientX - offset.current.x) / PIXEL_SIZE);
      const y = Math.floor((e.clientY - offset.current.y) / PIXEL_SIZE);
      const id = y * GRID_WIDTH + x;

      if (pixels.has(id)) {
        onPixelSelect(id);
      }
    };

    canvas.addEventListener("mousedown", onMouseDown);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mousemove", onMouseMove);
    canvas.addEventListener("click", onClick);

    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mousemove", onMouseMove);
      canvas.removeEventListener("click", onClick);
    };
  }, [pixels]);

  return <canvas ref={canvasRef} className="absolute top-0 left-0" />;
}
