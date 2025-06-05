import React, { useState, useEffect } from 'react';
import { usePDFContext } from '../contexts/PDFContext';
import { Pin } from '../contexts/PDFContext';
import { Pin as PinIcon } from 'lucide-react';

import PinImg from "../../public/pin.svg"

interface PinMarkerProps {
  pin: Pin;
  pdfDimensions: { width: number; height: number };
}

const PinMarker: React.FC<PinMarkerProps> = ({ pin, pdfDimensions }) => {
  const { selectedPin, setSelectedPin } = usePDFContext();
  const [showTooltip, setShowTooltip] = useState(false);
  const [isNew, setIsNew] = useState(false);

  // Position based on percentages, accounting for pin marker dimensions
  const style = {
    position: 'absolute' as const,
    left: `${pin.x}%`,
    top: `${pin.y}%`,
    transform: 'translate(-50%, -50%)',
    zIndex: selectedPin === pin.id ? 2 : 1,
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

  const isSelected = selectedPin === pin.id;

  return (
    <div
      className={`pin ${isNew ? 'pin-new' : ''} `}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        setSelectedPin(pin.id);
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <img src={PinImg} />

      {showTooltip && (
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