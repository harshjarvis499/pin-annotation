import React, { useEffect, useRef } from 'react';
import { usePDFContext } from '../contexts/PDFContext';
import { checkStrokeOverlapAndConfirm, svgUrlToPngBytes, simplifyPath } from '../utils/pdfUtils';

interface FreehandCanvasProps {
  pageRef: React.RefObject<HTMLDivElement>;
  pageNumber: number;
  drawActive: boolean;
  eraseActive: boolean;
  width?: number;
}

function getBestSegmentForIcon(points: { x: number | null; y: number | null }[]) {
  if (points.length < 2) return null;

  // Filter out null breaks by splitting stroke into continuous segments
  const segments: { start: { x: number, y: number }, end: { x: number, y: number } }[] = [];
  let segmentStartIndex = 0;

  for (let i = 1; i < points.length; i++) {
    if (points[i].x == null || points[i].y == null) {
      // End of continuous segment
      if (i - 1 > segmentStartIndex) {
        for (let j = segmentStartIndex; j < i - 1; j++) {
          segments.push({ start: points[j] as { x: number, y: number }, end: points[j + 1] as { x: number, y: number } });
        }
      }
      segmentStartIndex = i + 1;
    }
  }
  // Last segment if no trailing null
  if (segmentStartIndex < points.length - 1) {
    for (let j = segmentStartIndex; j < points.length - 1; j++) {
      segments.push({ start: points[j] as { x: number, y: number }, end: points[j + 1] as { x: number, y: number } });
    }
  }

  if (segments.length === 0) return null;

  // Calculate center of all points (stroke centroid)
  const validPoints = points.filter(p => p.x != null && p.y != null) as { x: number, y: number }[];
  const centroid = validPoints.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 }
  );
  centroid.x /= validPoints.length;
  centroid.y /= validPoints.length;

  // Find longest segment length
  let maxLen = 0;
  segments.forEach(seg => {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const len = Math.hypot(dx, dy);
    if (len > maxLen) maxLen = len;
  });

  // Filter segments within 10% of maxLen (allow close contenders)
  const nearMaxSegments = segments.filter(seg => {
    const dx = seg.end.x - seg.start.x;
    const dy = seg.end.y - seg.start.y;
    const len = Math.hypot(dx, dy);
    return len >= 0.9 * maxLen;
  });

  // Pick the nearMax segment whose midpoint is closest to centroid
  let bestSeg = nearMaxSegments[0];
  let bestDist = Infinity;
  for (const seg of nearMaxSegments) {
    const midX = (seg.start.x + seg.end.x) / 2;
    const midY = (seg.start.y + seg.end.y) / 2;
    const dist = Math.hypot(midX - centroid.x, midY - centroid.y);
    if (dist < bestDist) {
      bestDist = dist;
      bestSeg = seg;
    }
  }

  return bestSeg;
}


const FreehandCanvas: React.FC<FreehandCanvasProps> = ({ pageRef, pageNumber, drawActive, eraseActive, width = 12 }) => {
  const PREVIEW_COLOR = '#ffeb3b';
  const FINAL_COLOR = '#555555';
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const iconRef = useRef<HTMLImageElement | null>(null);

  const { addStroke, deleteStroke, updateStroke, strokes, scale } = usePDFContext();

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
      ctx.lineWidth = s.width * scale;
      ctx.globalAlpha = s.isDraft ? 1 : 0.3;
      ctx.beginPath();
      s.points.forEach((pt, idx) => {
        if (pt.x == null || pt.y == null) {
          ctx.stroke();
          ctx.beginPath();
          return;
        }
        const x = (pt.x / 100) * rect.width;
        const y = (pt.y / 100) * rect.height;
        if (idx === 0 || s.points[idx - 1].x == null) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();


      const icon = iconRef.current;
      if (icon && s.points.length >= 2 && !s.isDraft) {
        let maxLen = 0;
        const bestSeg = getBestSegmentForIcon(s.points);
        if (!bestSeg) return;

        const rect = pageRef.current!.getBoundingClientRect();

        const startX = (bestSeg.start.x / 100) * rect.width;
        const startY = (bestSeg.start.y / 100) * rect.height;
        const endX = (bestSeg.end.x / 100) * rect.width;
        const endY = (bestSeg.end.y / 100) * rect.height;

        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        const dx = endX - startX;
        const dy = endY - startY;
        const lenVec = Math.hypot(dx, dy);
        if (lenVec === 0) return;

        let unitPerpX = -dy / lenVec;
        let unitPerpY = dx / lenVec;

        const iconSize = 24;
        const offset = -24;

        const iconX = midX + unitPerpX * offset;
        const iconY = midY + unitPerpY * offset;

        ctx.globalAlpha = 1;
        ctx.drawImage(
          icon,
          iconX - iconSize / 2,
          iconY - iconSize / 2,
          iconSize,
          iconSize
        );
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
    let continuingDraft = false;
    let draftStrokeId: string | null = null;

    const rectProvider = () => pageRef.current!.getBoundingClientRect();

    const pointerDown = (e: PointerEvent) => {
      const rect = rectProvider();
      const x = e.offsetX;
      const y = e.offsetY;
      const normX = (x / rect.width) * 100;
      const normY = (y / rect.height) * 100;

      if (eraseActive) {
        const threshold = 2;
        for (const s of strokes.filter(st => st.pageNumber === pageNumber)) {
          for (const pt of s.points) {
            if (Math.hypot(pt.x - normX, pt.y - normY) < threshold) {
              deleteStroke(s.id);
              redraw();
              return;
            }
          }
        }
        return;
      }

      const pageDraftStroke = strokes.find(
        st => st.pageNumber === pageNumber && st.isDraft
      );

      if (pageDraftStroke) {
        const lastPoint = pageDraftStroke.points[pageDraftStroke.points.length - 1];
        const continueThreshold = 2;
        if (Math.hypot(lastPoint.x - normX, lastPoint.y - normY) <= continueThreshold) {
          drawing = true;
          continuingDraft = true;
          draftStrokeId = pageDraftStroke.id;
          currentPoints = pageDraftStroke.points;
          ctx.strokeStyle = PREVIEW_COLOR;
          ctx.lineWidth = width * scale;
          ctx.globalAlpha = 0.3;
          ctx.lineCap = 'butt';
          ctx.lineJoin = 'miter';
          ctx.beginPath();
          ctx.moveTo(
            (lastPoint.x / 100) * rect.width,
            (lastPoint.y / 100) * rect.height
          );
        } else {
          return;
        }
      } else {
        drawing = true;
        continuingDraft = false;
        draftStrokeId = null;
        currentPoints = [];
        ctx.strokeStyle = PREVIEW_COLOR;
        ctx.lineWidth = width * scale;
        ctx.globalAlpha = 0.3;
        ctx.lineCap = 'butt';
        ctx.lineJoin = 'miter';
        ctx.beginPath();
        ctx.moveTo(x, y);
        currentPoints.push({ x: normX, y: normY });
      }
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

      const overlaps = checkStrokeOverlapAndConfirm(
        { pageNumber, points: currentPoints },
        strokes,
        1
      );

      if (overlaps.length > 0 && overlaps[0].shouldMerge) {
        // Pick first stroke as main
        const mainStroke = overlaps[0].targetStroke;

        // Gather all strokes to merge: other overlaps + current stroke points
        // We'll merge in order: mainStroke, others, currentPoints

        // Collect strokes excluding mainStroke
        const otherStrokes = overlaps
          .map(o => o.targetStroke)
          .filter(s => s.id !== mainStroke.id);

        // Prepare list of point arrays in merge order
        const strokesToMerge: { x: number | null; y: number | null }[][] = [
          mainStroke.points,
          ...otherStrokes.map(s => s.points),
          currentPoints
        ].map(points => simplifyPath(points, 1)); // simplify each path

        const connectThreshold = 1;

        // Merge all points with gap logic
        let mergedPoints: { x: number | null; y: number | null }[] = [];

        for (let i = 0; i < strokesToMerge.length; i++) {
          const pts = strokesToMerge[i];

          if (mergedPoints.length === 0) {
            mergedPoints = [...pts];
          } else {
            // Check distance between last merged point and first new point
            const lastPoint = [...mergedPoints].reverse().find(p => p.x != null && p.y != null);
            const firstPoint = pts.find(p => p.x != null && p.y != null);

            const dist = lastPoint && firstPoint
              ? Math.hypot(lastPoint.x! - firstPoint.x!, lastPoint.y! - firstPoint.y!)
              : Infinity;

            if (dist > connectThreshold) {
              // Insert gap
              mergedPoints = [...mergedPoints, { x: null, y: null }, ...pts];
            } else {
              // Directly connect
              mergedPoints = [...mergedPoints, ...pts];
            }
          }
        }

        // Delete all other strokes (excluding mainStroke)
        for (const stroke of otherStrokes) {
          deleteStroke(stroke.id);
        }

        updateStroke({
          ...mainStroke,
          points: mergedPoints,
          color: FINAL_COLOR,
          isDraft: false,
        });

        if (continuingDraft && draftStrokeId) {
          deleteStroke(draftStrokeId);
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        redraw();
        return;
      }



      if (currentPoints.length > 1) {
        if (continuingDraft && draftStrokeId) {
          redraw();
        } else {
          addStroke({
            pageNumber,
            points: currentPoints,
            color: PREVIEW_COLOR,
            width,
            isDraft: true
          });
        }
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
  }, [drawActive, eraseActive, scale, pageNumber, addStroke, deleteStroke, updateStroke, strokes]);

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
        redraw();
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
