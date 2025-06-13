import React, { useEffect, useState } from 'react';
import { X, Trash2, ChevronLeft, ChevronRight, PinIcon } from 'lucide-react';
import { usePDFContext, Pin } from '../contexts/PDFContext';
import ColorPicker from './ColorPicker';
import DialogModel from './DialogModel';
import { nanoid } from 'nanoid';
import { downloadKeyPointPDF } from '../utils/keyPointPdf';

interface AnnotationPanelProps {
  width: number;
  setWidth: (width: number) => void;
  pageRef: React.RefObject<HTMLDivElement>;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ width, setWidth, pageRef }) => {
  const {
    pins, updatePin, deletePin, selectedPin, setSelectedPin,
    currentPage, totalPages
  } = usePDFContext();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#FF3B30');

  const selectedPinData = pins.find(pin => pin.id === selectedPin);
  const pagePins = pins.filter(pin => pin.pageNumber === currentPage);


  const [isDialog, setIsDialog] = useState(false);

  const handleClose = () => setIsDialog(false)


  useEffect(() => {
    if (selectedPinData) {
      setTitle(selectedPinData.title);
      setDescription(selectedPinData.description);
      setColor(selectedPinData.color);
    } else {
      setTitle('');
      setDescription('');
      setColor('#FF3B30');
    }
  }, [selectedPinData]);

  const handleSave = () => {
    if (selectedPin) {
      updatePin(selectedPin, {
        title,
        description,
        color
      });
    }
  };

  const handleDelete = (id: string) => {
    // if (selectedPin && confirm('Are you sure you want to delete this pin?')) {

    deletePin(id);
    // }
  };

  useEffect(() => {
    // Auto-save when changing fields
    if (selectedPin) {
      const timeoutId = setTimeout(() => {
        handleSave();
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [title, description, color]);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div
      className="annotator-sidebar"
      style={{ width: isCollapsed ? '40px' : `${width}px` }}
    >
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className={`font-medium ${isCollapsed ? 'hidden' : 'block'}`}>
          {selectedPin ? 'Edit Annotation' : 'Annotations'}
        </h2>
        <div className="flex items-center">
          <button
            className="p-1 rounded hover:bg-gray-100"
            onClick={toggleCollapse}
          >
            {isCollapsed ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>

          <div className="flex-1 overflow-auto">
            {pagePins.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No pins on this page</p>
                <p className="text-sm mt-1">Click the pin button to add annotations</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {pagePins.map(pin => (
                  <div
                    key={pin.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center ">
                      <div className='flex items-center gap-2 flex-grow' onClick={() => { setSelectedPin(pin.id); setIsDialog(true) }}>
                        <div className='flex items-end'>
                          <PinIcon size={20} color={pin.color} className='-rotate-45 ' />
                        </div>
                        <div className="font-medium flex-grow ">{pin.title}</div>
                      </div>
                      <button onClick={() => handleDelete(pin.id)}>
                        <Trash2 color="red" size={20} />
                      </button>
                      <button
                        className="ml-2 p-1 rounded hover:bg-gray-200"
                        onClick={async (e) => {
                          e.stopPropagation(); // Prevent opening dialog when clicking download
                          if (pageRef.current) {
                            await downloadKeyPointPDF(pageRef.current, pin, `key-point-${pin.title}.pdf`);
                          }
                        }}
                        title="Download Key Point PDF"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-down"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L15 2z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M12 18V12" /><path d="M9 15l3 3 3-3" /></svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {totalPages > 0 && (
            <div className="border-t border-gray-200 p-4">
              <p className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </p>
              <p className="text-sm text-gray-500">
                {pagePins.length} pin{pagePins.length !== 1 ? 's' : ''} on this page
              </p>
              <p className="text-sm text-gray-500">
                {pins.length} pin{pins.length !== 1 ? 's' : ''} total
              </p>
            </div>
          )}
        </>
      )}

      <DialogModel isOpen={isDialog} onClose={handleClose} pinDetail={null} setPinDetail={null} />
    </div>
  );
};

export default AnnotationPanel;