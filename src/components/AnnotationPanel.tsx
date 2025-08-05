import React, { useEffect, useState } from 'react';
import { Trash2, ChevronLeft, ChevronRight, PinIcon, PenTool } from 'lucide-react';
import { usePDFContext } from '../contexts/PDFContext';
import DialogModel from './DialogModel';
import { downloadKeyPointPDF } from '../utils/keyPointPdf';
import { donwloadKeyPointForStroke, downloadCroppedPDF } from '../utils/pdfUtils';

interface AnnotationPanelProps {
  width: number;
  pageRef: React.RefObject<HTMLDivElement>;
}

const AnnotationPanel: React.FC<AnnotationPanelProps> = ({ width, pageRef }) => {
  const {
    pins, updatePin, deletePin, selectedPin, setSelectedPin,
    highlights, selectedHighlight, setSelectedHighlight, deleteHighlight,
    strokes, deleteStroke, currentPage, totalPages, pdfUrl
  } = usePDFContext();
  const [selectedStroke, setSelectedStroke] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#FF3B30');

  const selectedPinData = pins.find(pin => pin.id === selectedPin);
  const pagePins = pins.filter(pin => pin.pageNumber === currentPage);
  const pageHighlights = highlights.filter(h => h.pageNumber === currentPage);
  const pageStrokes = strokes.filter(s => s.pageNumber === currentPage);

  const [isDialog, setIsDialog] = useState(false);

  const handleClose = () => setIsDialog(false);

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

  const handleDeletePin = (id: string) => {
    deletePin(id);
  };

  const handleDeleteHighlight = (id: string) => {
    deleteHighlight(id);
  };

  const handleDeleteStroke = (id: string) => {
    deleteStroke(id);
  };

  const handleDownloadStroke = async (stroke: any) => {

    await donwloadKeyPointForStroke(pdfUrl!, [stroke]);
  };

  useEffect(() => {
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
          Annotations
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

          {/* <div className="flex-1 overflow-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-medium">Pins</h3>
            </div>
            {pagePins.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                <p>No pins on this page</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {pagePins.map(pin => (
                  <div
                    key={pin.id}
                    className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedPin === pin.id ? 'bg-blue-100' : ''}`}
                    onClick={() => setSelectedPin(pin.id)}
                  >
                    <div className="flex items-center ">
                      <div className='flex items-center gap-2 flex-grow' onClick={(e) => { e.stopPropagation(); setSelectedPin(pin.id); setIsDialog(true); }}>
                        <div className='flex items-end'>
                          <PinIcon size={20} color={pin.color} className='-rotate-45 ' />
                        </div>
                        <div className="font-medium flex-grow ">{pin.title}</div>
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); handleDeletePin(pin.id); }}>
                        <Trash2 color="red" size={20} />
                      </button>
                      <button
                        className="ml-2 p-1 rounded hover:bg-gray-200"
                        onClick={async (e) => {
                          e.stopPropagation();
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

          <div className="p-4 border-y border-gray-200 mt-4">
            <h3 className="font-medium">Highlights</h3>
          </div>
          {pageHighlights.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No highlights on this page</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pageHighlights.map(h => (
                <div
                  key={h.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedHighlight === h.id ? 'bg-blue-100' : ''}`}
                  onClick={() => setSelectedHighlight(h.id)}
                >
                  <div className="flex items-center">
                    <div style={{ width: 16, height: 16, backgroundColor: h.color, marginRight: 8, flexShrink: 0 }} />
                    <div className="font-medium flex-grow truncate">{h.note || 'Highlight'}</div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteHighlight(h.id); }}>
                      <Trash2 color="red" size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )} */}

          <div className="p-4 border-y border-gray-200 ">
            <h3 className="font-medium">Freehand Drawings</h3>
          </div>
          {pageStrokes.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              <p>No drawings on this page</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {pageStrokes.map(stroke => (
                <div
                  key={stroke.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${selectedStroke === stroke.id ? 'bg-blue-100' : ''}`}
                  onClick={() => setSelectedStroke(stroke.id)}
                >
                  <div className="flex items-center">
                    <div className='flex items-center gap-2 flex-grow'>
                      <div className='flex items-end'>
                        <PenTool size={20} color={stroke.color} />
                      </div>
                      <div className="font-medium flex-grow">
                        Drawing {stroke.id.slice(0, 8)} ({stroke.points.length} points)
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStroke(stroke.id);
                      }}
                      className="mr-2"
                    >
                      <Trash2 color="red" size={20} />
                    </button>
                    <button
                      className="p-1 rounded hover:bg-gray-200"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await handleDownloadStroke(stroke);
                      }}
                      title="Download Cropped PDF"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-down"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L15 2z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M12 18V12" /><path d="M9 15l3 3 3-3" /></svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {totalPages > 0 && (
        <div className="border-t border-gray-200 p-4">
          <p className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </p>
          <p className="text-sm text-gray-500">
            {pagePins.length} pin{pagePins.length !== 1 ? 's' : ''} on this page
          </p>
          <p className="text-sm text-gray-500">
            {pageHighlights.length} highlight{pageHighlights.length !== 1 ? 's' : ''} on this page
          </p>
          <p className="text-sm text-gray-500">
            {pins.length} pin{pins.length !== 1 ? 's' : ''} total
          </p>
          <p className="text-sm text-gray-500">
            {highlights.length} highlight{highlights.length !== 1 ? 's' : ''} total
          </p>
          <p className="text-sm text-gray-500">
            {pageStrokes.length} drawing{pageStrokes.length !== 1 ? 's' : ''} on this page
          </p>
          <p className="text-sm text-gray-500">
            {strokes.length} drawing{strokes.length !== 1 ? 's' : ''} total
          </p>
        </div>
      )}
      <DialogModel isOpen={isDialog} onClose={handleClose} pinDetail={null} setPinDetail={null} />
    </div>
  );
};

export default AnnotationPanel;