import React, { useRef, useEffect } from 'react';
import { FileText } from 'lucide-react';
import { usePDFContext } from '../contexts/PDFContext';

interface RecentFilesMenuProps {
  onClose: () => void;
}

const RecentFilesMenu: React.FC<RecentFilesMenuProps> = ({ onClose }) => {
  const { recentFiles } = usePDFContext();
  const menuRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  if (recentFiles.length === 0) {
    return (
      <div 
        ref={menuRef}
        className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 p-3 z-50"
      >
        <div className="text-center text-sm text-gray-500 py-2">
          No recent files
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={menuRef}
      className="absolute right-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50"
    >
      <div className="py-1">
        <div className="px-4 py-2 text-sm text-gray-700 font-medium border-b border-gray-100">
          Recent Files
        </div>
        {recentFiles.map((file, index) => (
          <button
            key={index}
            className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
            onClick={() => {
              // In a real app, we would need to have the actual file contents saved
              alert(`In a full implementation, this would reopen ${file.name}`);
              onClose();
            }}
          >
            <FileText className="h-4 w-4 text-gray-400 mr-2" />
            <div className="flex flex-col items-start">
              <span className="truncate w-48">{file.name}</span>
              <span className="text-xs text-gray-500">
                {file.lastModified.toLocaleDateString()}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentFilesMenu;