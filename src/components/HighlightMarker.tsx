import React, { useState, useRef } from 'react';
import { usePDFContext } from '../contexts/PDFContext';
import { Highlight } from '../contexts/PDFContext';

interface HighlightMarkerProps {
  highlight: Highlight;
  pdfDimensions: { width: number; height: number };
}

const HighlightMarker: React.FC<HighlightMarkerProps> = ({ highlight, pdfDimensions }) => {
  const { selectedHighlight, updateHighlight } = usePDFContext();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Position and size based on percentages
  const style = {
    position: 'absolute' as const,
    left: `${highlight.x}%`,
    top: `${highlight.y}%`,
    width: `${highlight.width}%`,
    height: `${highlight.height}%`,
    backgroundColor: highlight.color,
    opacity: selectedHighlight === highlight.id ? 0.6 : 0.4,
    border: selectedHighlight === highlight.id ? '2px solid #3b82f6' : '1px solid transparent',
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging || isResizing ? 'none' : 'all 0.15s ease-out',
    zIndex: selectedHighlight === highlight.id ? 2 : 1,
    minWidth: '20px',
    minHeight: '10px'
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (selectedHighlight !== highlight.id) return;

    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startLeft = highlight.x;
    const startTop = highlight.y;

    setIsDragging(true);
    setShowTooltip(false);

    const handleMouseMove = (e: MouseEvent) => {
      const pdfElement = highlightRef.current?.parentElement;
      if (!pdfElement) return;

      const deltaX = ((e.clientX - startX) / pdfDimensions.width) * 100;
      const deltaY = ((e.clientY - startY) / pdfDimensions.height) * 100;

      let newX = startLeft + deltaX;
      let newY = startTop + deltaY;

      // Clamp values to keep highlight within bounds
      newX = Math.max(0, Math.min(100 - highlight.width, newX));
      newY = Math.max(0, Math.min(100 - highlight.height, newY));

      updateHighlight(highlight.id, { x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    if (selectedHighlight !== highlight.id) return;

    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = highlight.width;
    const startHeight = highlight.height;
    const startLeft = highlight.x;
    const startTop = highlight.y;

    const handleMouseMove = (e: MouseEvent) => {
      const pdfElement = highlightRef.current?.parentElement;
      if (!pdfElement) return;

      const deltaX = ((e.clientX - startX) / pdfDimensions.width) * 100;
      const deltaY = ((e.clientY - startY) / pdfDimensions.height) * 100;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startLeft;
      let newY = startTop;

      if (direction.includes('right')) {
        newWidth = Math.max(5, Math.min(100 - startLeft, startWidth + deltaX));
      }
      if (direction.includes('left')) {
        const widthChange = -deltaX;
        newWidth = Math.max(5, startWidth + widthChange);
        newX = Math.max(0, startLeft - widthChange);
      }
      if (direction.includes('bottom')) {
        newHeight = Math.max(3, Math.min(100 - startTop, startHeight + deltaY));
      }
      if (direction.includes('top')) {
        const heightChange = -deltaY;
        newHeight = Math.max(3, startHeight + heightChange);
        newY = Math.max(0, startTop - heightChange);
      }

      updateHighlight(highlight.id, {
        x: newX,
        y: newY,
        width: newWidth,
        height: newHeight
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const isSelected = selectedHighlight === highlight.id;

  return (
    <div
      ref={highlightRef}
      className="highlight-marker"
      style={style}
      onMouseDown={handleMouseDown}
      onMouseEnter={() => !isDragging && !isResizing && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      title={highlight.note || 'Highlight'}
    >
      {/* Resize handles - only show when selected */}
      {isSelected && (
        <>
          {/* Corner handles */}
          <div
            className="absolute -top-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-nw-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'top-left')}
          />
          <div
            className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-ne-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'top-right')}
          />
          <div
            className="absolute -bottom-1 -left-1 w-2 h-2 bg-blue-500 border border-white cursor-sw-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-left')}
          />
          <div
            className="absolute -bottom-1 -right-1 w-2 h-2 bg-blue-500 border border-white cursor-se-resize"
            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom-right')}
          />

          {/* Edge handles */}
          <div
            className="absolute -top-1 left-1/2 w-2 h-2 bg-blue-500 border border-white cursor-n-resize transform -translate-x-1/2"
            onMouseDown={(e) => handleResizeMouseDown(e, 'top')}
          />
          <div
            className="absolute -bottom-1 left-1/2 w-2 h-2 bg-blue-500 border border-white cursor-s-resize transform -translate-x-1/2"
            onMouseDown={(e) => handleResizeMouseDown(e, 'bottom')}
          />
          <div
            className="absolute -left-1 top-1/2 w-2 h-2 bg-blue-500 border border-white cursor-w-resize transform -translate-y-1/2"
            onMouseDown={(e) => handleResizeMouseDown(e, 'left')}
          />
          <div
            className="absolute -right-1 top-1/2 w-2 h-2 bg-blue-500 border border-white cursor-e-resize transform -translate-y-1/2"
            onMouseDown={(e) => handleResizeMouseDown(e, 'right')}
          />
        </>
      )}

      {/* Tooltip */}
      {showTooltip && !isDragging && !isResizing && highlight.note && (
        <div
          className="absolute bg-black text-white text-xs px-2 py-1 rounded shadow-lg pointer-events-none z-10"
          style={{
            left: '50%',
            bottom: '100%',
            transform: 'translateX(-50%)',
            marginBottom: '4px',
            maxWidth: '200px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {highlight.note}
        </div>
      )}
    </div>
  );
};

export default HighlightMarker;
