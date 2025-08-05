import React, { useEffect, useRef } from 'react';
import { usePDFContext } from '../contexts/PDFContext';
import { getStrokeIconPosition, svgUrlToPngBytes } from '../utils/pdfUtils';

interface FreehandCanvasProps {
  pageRef: React.RefObject<HTMLDivElement>;
  pageNumber: number;
  drawActive: boolean;
  eraseActive: boolean;
  width?: number;
}

// Helper function to calculate perpendicular distance from a point to a line segment
const perpendicularDistance = (point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }): number => {
  const A = point.x - start.x;
  const B = point.y - start.y;
  const C = end.x - start.x;
  const D = end.y - start.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) return Math.sqrt(A * A + B * B);

  const param = dot / lenSq;
  let xx, yy;

  if (param < 0) {
    xx = start.x;
    yy = start.y;
  } else if (param > 1) {
    xx = end.x;
    yy = end.y;
  } else {
    xx = start.x + param * C;
    yy = start.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

// Douglas-Peucker algorithm to simplify a path
const simplifyPath = (points: { x: number; y: number }[], tolerance: number = 5): { x: number; y: number }[] => {
  if (points.length <= 2) return points;

  const douglasPeucker = (points: { x: number; y: number }[], epsilon: number): { x: number; y: number }[] => {
    if (points.length <= 2) return points;

    let maxDistance = 0;
    let maxIndex = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const distance = perpendicularDistance(points[i], start, end);
      if (distance > maxDistance) {
        maxDistance = distance;
        maxIndex = i;
      }
    }

    if (maxDistance > epsilon) {
      const leftSegment = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
      const rightSegment = douglasPeucker(points.slice(maxIndex), epsilon);
      return [...leftSegment.slice(0, -1), ...rightSegment];
    } else {
      return [start, end];
    }
  };

  return douglasPeucker(points, tolerance);
};

// Dynamic icon position based on stroke shape






const FreehandCanvas: React.FC<FreehandCanvasProps> = ({ pageRef, pageNumber, drawActive, eraseActive, width = 12 }) => {
  const PREVIEW_COLOR = '#ffeb3b';
  const FINAL_COLOR = '#555555';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iconRef = useRef<HTMLImageElement | null>(null);

  const { addStroke, deleteStroke, strokes, scale } = usePDFContext();

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

      // Dynamic icon position
      const center = getStrokeIconPosition(s.points, rect);

      if (center) {
        const iconSize = 20 * scale;
        if (iconRef.current) {
          ctx.globalAlpha = 1;
          ctx.drawImage(
            iconRef.current,
            center.x - iconSize / 2,
            (center.y - iconSize / 2),
            iconSize,
            iconSize
          );
        }
      }
    });

    ctx.globalAlpha = 1;
  };

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
        const rect = rectProvider();
        const x = e.offsetX;
        const y = e.offsetY;
        const normX = (x / rect.width) * 100;
        const normY = (y / rect.height) * 100;
        const threshold = 2;
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
        return;
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
        const simplifiedPoints = simplifyPath(currentPoints, 2);
        addStroke({ pageNumber, points: simplifiedPoints, color: FINAL_COLOR, width });
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


  useEffect(() => redraw(), [strokes, scale]);

  useEffect(() => {
    async function fetchIcon() {
      const svgIconUrl = "https://jb-glass-uat-apis.jarvistechnolabs.com/pdf-pin-design/shape-icon.svg";
      const iconPngBytes = await svgUrlToPngBytes(svgIconUrl, "#000000", 60, 60);

      const blob = new Blob([iconPngBytes], { type: "image/png" });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.src = url;
      img.onload = () => {
        iconRef.current = img;
        redraw(); // Redraw once image is loaded
      };
    }
    fetchIcon();

  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: drawActive || eraseActive ? 'auto' : 'none' }}
    />
  );
};

export default FreehandCanvas;
