import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import { Pin as PinIcon, Plus, Minus, ChevronLeft, ChevronRight } from 'lucide-react';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import '../lib/pdfjs-init';
import { usePDFContext } from '../contexts/PDFContext';
import PinMarker from './PinMarker';
import AnnotationPanel from './AnnotationPanel';
import DialogModel from './DialogModel';

export interface PinDetailEntity {
  pageNumber: number;
  x: number;
  y: number;
}

const PDFViewer: React.FC = () => {
  const {
    pdfUrl, pins, addPin, currentPage, setCurrentPage,
    totalPages, setTotalPages, scale, setScale, setSelectedPin
  } = usePDFContext();
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [isPinningMode, setIsPinningMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);

  const [pinDetail, setPinDetail] = useState<PinDetailEntity | null>(null)


  // dialog state
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => setIsOpen(false);

  // Memoize the options object
  const pdfOptions = useMemo(() => ({
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/standard_fonts/'
  }), []); // Empty dependency array since these values never change

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setTotalPages(numPages);
    setIsLoading(false);
    setLoadError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setLoadError(error);
    setIsLoading(false);
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPinningMode || !pageRef.current) return;

    const page = pageRef.current;
    const rect = page.getBoundingClientRect();

    // Get click position relative to the page element
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    // Calculate position as percentage of page dimensions
    const xPercent = (offsetX / rect.width) * 100;
    const yPercent = (offsetY / rect.height) * 100;

    // Ensure the click is within the page bounds
    if (xPercent >= 0 && xPercent <= 100 && yPercent >= 0 && yPercent <= 100) {
      // addPin({
      //   pageNumber: currentPage,
      //   x: xPercent,
      //   y: yPercent,
      //   color: '#FF3B30',
      //   title: 'New Pin',
      //   description: 'Add your notes here'
      // });

      setPinDetail({
        pageNumber: currentPage,
        x: xPercent,
        y: yPercent
      });
      setSelectedPin(null);
      setIsOpen(true)
      setIsPinningMode(false);
    }
  };

  const zoomIn = () => {
    setScale(Math.min(scale + 0.1, 2.0));
  };

  const zoomOut = () => {
    setScale(Math.max(scale - 0.1, 0.5));
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading PDF</h3>
          <p className="text-gray-600">{loadError.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-1 overflow-hidden">
        <div className="pdf-container" ref={containerRef}>
          {pdfUrl && (
            <Document
              file={pdfUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={onDocumentLoadError}
              loading={
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              }
              options={pdfOptions}
            >
              <div className="flex justify-center">
                <div
                  ref={pageRef}
                  className="pdf-page relative"
                  style={{ cursor: isPinningMode ? 'crosshair' : 'auto' }}
                  onClick={handlePageClick}
                >
                  <Page
                    pageNumber={currentPage}
                    scale={scale}
                    onLoadSuccess={(page) => {
                      setPdfDimensions({
                        width: page.width * scale,
                        height: page.height * scale
                      });
                    }}
                    onRenderError={(error) => {
                      console.error('Error rendering page:', error);
                    }}
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                  />

                  {!isLoading && pins
                    .filter(pin => pin.pageNumber === currentPage)
                    .map(pin => (
                      <PinMarker
                        key={pin.id}
                        pin={pin}
                        pdfDimensions={pdfDimensions}
                      />
                    ))}
                </div>
              </div>
            </Document>
          )}

          <div className="zoom-controls">
            <button
              className="p-2 hover:bg-gray-100 rounded-full"
              onClick={zoomOut}
            >
              <Minus size={18} />
            </button>
            <span className="px-2 text-sm">{Math.round(scale * 100)}%</span>
            <button
              className="p-2 hover:bg-gray-100 rounded-full"
              onClick={zoomIn}
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="page-controls">
            <button
              className="p-2 hover:bg-gray-100 rounded-full"
              onClick={prevPage}
              disabled={currentPage <= 1}
            >
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm">
              {currentPage} / {totalPages}
            </span>
            <button
              className="p-2 hover:bg-gray-100 rounded-full"
              onClick={nextPage}
              disabled={currentPage >= totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <button
            className={`fixed bottom-6 left-6 p-3 rounded-full shadow-lg z-10 ${isPinningMode ? 'bg-accent text-white' : 'bg-white text-gray-700'
              }`}
            onClick={() => setIsPinningMode(!isPinningMode)}
            title={isPinningMode ? 'Cancel adding pin' : 'Add a new pin'}
          >
            <PinIcon size={20} />
          </button>
        </div>

        <AnnotationPanel width={sidebarWidth} setWidth={setSidebarWidth} />
        <DialogModel isOpen={isOpen} onClose={handleClose} setPinDetail={setPinDetail} pinDetail={pinDetail} />
      </div>
    </>
  );
};

export default PDFViewer;