import React, { useState, useEffect, useRef } from 'react';
import { usePDFContext } from '../contexts/PDFContext';
import { Pin } from '../contexts/PDFContext';
import { Pin as PinIcon } from 'lucide-react';

import PinImg from "../../public/pin.svg"

interface PinMarkerProps {
  pin: Pin;
  pdfDimensions: { width: number; height: number };
}

const PinMarker: React.FC<PinMarkerProps> = ({ pin, pdfDimensions }) => {
  const { selectedPin, setSelectedPin, updatePin } = usePDFContext();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const pinRef = useRef<HTMLDivElement>(null);

  // Position based on percentages, accounting for pin marker dimensions
  const style = {
    position: 'absolute' as const,
    left: `${pin.x}%`,
    top: `${pin.y}%`,
    transform: 'translate(-50%, -50%)',
    zIndex: selectedPin === pin.id ? 2 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'all 0.15s ease-out' // Faster transition when not dragging
  };

  useEffect(() => {
    // Check if this pin was just created (within the last second)
    const now = new Date();
    const pinAge = now.getTime() - pin.createdAt.getTime();
    if (pinAge < 1000) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [pin.createdAt]);

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    setShowTooltip(false);

    // Create a completely transparent drag image
    const emptyDiv = document.createElement('div');
    emptyDiv.style.width = '0';
    emptyDiv.style.height = '0';
    document.body.appendChild(emptyDiv);
    e.dataTransfer.setDragImage(emptyDiv, 0, 0);

    // Clean up the temporary div after drag starts
    requestAnimationFrame(() => {
      document.body.removeChild(emptyDiv);
    });

    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrag = (e: React.DragEvent) => {
    if (!e.clientX || !e.clientY) return; // Ignore invalid drag events

    const pdfElement = pinRef.current?.parentElement;
    if (!pdfElement) return;

    const rect = pdfElement.getBoundingClientRect();

    // Calculate new position as percentage with requestAnimationFrame for smoother updates
    requestAnimationFrame(() => {
      let newX = ((e.clientX - rect.left) / rect.width) * 100;
      let newY = ((e.clientY - rect.top) / rect.height) * 100;

      // Clamp values between 0 and 100
      newX = Math.max(0, Math.min(100, newX));
      newY = Math.max(0, Math.min(100, newY));

      // Update pin position
      updatePin(pin.id, { x: newX, y: newY });
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const isSelected = selectedPin === pin.id;

  return (
    <div
      ref={pinRef}
      className={`pin ${isNew ? 'pin-new' : ''} ${isDragging ? 'pin-dragging' : ''} relative`}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedPin(pin.id);
      }}
      onMouseEnter={() => !isDragging && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      draggable="true"
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
    >
      <span
        className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-white/90 text-gray-800 text-xs font-semibold shadow border border-gray-200 select-none pointer-events-none"
        style={{
          whiteSpace: 'nowrap',
          zIndex: 10,
          minWidth: '32px',
          textAlign: 'center',
        }}
      >
        {pin.title}
      </span>
      <img
        src={PinImg}
        style={{
          transform: isDragging ? 'scale(1.1)' : 'scale(1)',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
        draggable="false"
      />

      {showTooltip && !isDragging && (
        <div
          className="pin-tooltip"
          style={{
            position: 'absolute',
            left: '50%',
            bottom: '100%',
            transform: 'translateX(-50%)',
            marginBottom: '8px'
          }}
        >
          <div className="font-medium">{pin.title}</div>
          {pin.description && (
            <div className="text-gray-600 mt-1 truncate" style={{ maxWidth: '200px' }}>
              {pin.description.length > 50
                ? `${pin.description.substring(0, 50)}...`
                : pin.description}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PinMarker;