import React, { useEffect, useRef } from 'react';
import { usePDFContext } from '../contexts/PDFContext';

interface FreehandCanvasProps {
  pageRef: React.RefObject<HTMLDivElement>;
  pageNumber: number;
  drawActive: boolean;
  eraseActive: boolean;
  width?: number;
}

// Simple free-hand drawing overlay. Converts absolute pixel points to percentage coords
// before saving the stroke to context.
const FreehandCanvas: React.FC<FreehandCanvasProps> = ({ pageRef, pageNumber, drawActive, eraseActive, width = 12 }) => {
  const PREVIEW_COLOR = '#ffeb3b';
  const FINAL_COLOR = '#555555';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { addStroke, deleteStroke, strokes, scale } = usePDFContext();

  // Resize canvas to match page size whenever PDF resizes
  useEffect(() => {
    const pageEl = pageRef.current;
    const canvas = canvasRef.current;
    if (!pageEl || !canvas) return;

    const resize = () => {
      const rect = pageEl.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw();
    };

    const observer = new ResizeObserver(resize);
    observer.observe(pageEl);
    resize();
    return () => observer.disconnect();
  }, [pageRef, strokes]);

  // Draw existing strokes for this page
  const redraw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    const rect = pageRef.current!.getBoundingClientRect();
    const pageStrokes = strokes.filter(s => s.pageNumber === pageNumber);
    pageStrokes.forEach(s => {
      ctx.strokeStyle = s.color;
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = s.width * scale;
      ctx.beginPath();
      s.points.forEach((pt, idx) => {
        const x = (pt.x / 100) * rect.width;
        const y = (pt.y / 100) * rect.height;
        if (idx === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });
    ctx.globalAlpha = 1;
  };

  // Pointer handlers for draw / erase
  useEffect(() => {
    if (!drawActive && !eraseActive) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let drawing = false;
    let currentPoints: { x: number; y: number }[] = [];

    const rectProvider = () => pageRef.current!.getBoundingClientRect();

    const pointerDown = (e: PointerEvent) => {
      if (eraseActive) {
        // detect stroke near pointer and delete
        const rect = rectProvider();
        const x = e.offsetX;
        const y = e.offsetY;
        const normX = (x / rect.width) * 100;
        const normY = (y / rect.height) * 100;
        const threshold = 2; // percentage distance
        for (const s of strokes.filter(st => st.pageNumber === pageNumber)) {
          for (const pt of s.points) {
            const dx = pt.x - normX;
            const dy = pt.y - normY;
            if (Math.hypot(dx, dy) < threshold) {
              deleteStroke(s.id);
              redraw();
              return;
            }
          }
        }
        return; // no draw when erasing
      }

      drawing = true;
      currentPoints = [];
      ctx.strokeStyle = PREVIEW_COLOR;
      ctx.lineWidth = width * scale;
      ctx.globalAlpha = 0.3;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      const rect = rectProvider();
      const x = e.offsetX;
      const y = e.offsetY;
      ctx.moveTo(x, y);
      currentPoints.push({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
    };

    const pointerMove = (e: PointerEvent) => {
      if (!drawing) return;
      const x = e.offsetX;
      const y = e.offsetY;
      ctx.lineTo(x, y);
      ctx.stroke();
      const rect = rectProvider();
      currentPoints.push({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
    };

    const pointerUp = () => {
      if (!drawing) return;
      drawing = false;
      ctx.globalAlpha = 1;
      if (currentPoints.length > 1) {
        addStroke({ pageNumber, points: currentPoints, color: FINAL_COLOR, width });
      }
    };

    canvas.addEventListener('pointerdown', pointerDown);
    canvas.addEventListener('pointermove', pointerMove);
    window.addEventListener('pointerup', pointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', pointerDown);
      canvas.removeEventListener('pointermove', pointerMove);
      window.removeEventListener('pointerup', pointerUp);
    };
  }, [drawActive, eraseActive, scale, pageNumber, addStroke, deleteStroke, strokes]);

  // Redraw when strokes change
  useEffect(() => redraw(), [strokes, scale]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: drawActive || eraseActive ? 'auto' : 'none' }}
    />
  );
};

export default FreehandCanvas;
