import React from 'react';
import { Check } from 'lucide-react';

interface ColorPickerProps {
  selectedColor: string;
  onChange: (color: string) => void;
}

const ColorPicker: React.FC<ColorPickerProps> = ({ selectedColor, onChange }) => {
  const colors = [
    '#FF3B30', // Red (accent)
    '#FF9500', // Orange
    '#FFCC00', // Yellow
    '#34C759', // Green
    '#5AC8FA', // Light Blue
    '#007AFF', // Blue (primary)
    '#5856D6', // Purple
    '#AF52DE', // Pink
  ];
  
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map(color => (
        <button
          key={color}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
            selectedColor === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
          }`}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
        >
          {selectedColor === color && (
            <Check size={16} className="text-white" />
          )}
        </button>
      ))}
    </div>
  );
};

export default ColorPicker;