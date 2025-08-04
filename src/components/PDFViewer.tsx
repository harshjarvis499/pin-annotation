import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Document, Page } from 'react-pdf';
import { Pin as PinIcon, Plus, Minus, ChevronLeft, ChevronRight, Highlighter, Download as DownloadIcon, Pencil, Eraser, Move } from 'lucide-react';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import '../lib/pdfjs-init';
import { usePDFContext } from '../contexts/PDFContext';
import PinMarker from './PinMarker';
import HighlightMarker from './HighlightMarker';
import FreehandCanvas from './FreehandCanvas';
import AnnotationPanel from './AnnotationPanel';
import DialogModel from './DialogModel';
import { nanoid } from 'nanoid';
import { downloadKeyPointPDF, downloadCombinedKeyPointsPDF } from '../utils/keyPointPdf';
import { downloadPDFWithPins, downloadPDFWithAnnotations } from '../utils/pdfUtils';

export interface PinDetailEntity {
  pageNumber: number;
  x: number;
  y: number;
}

interface PDFViewerProps {
  pageRef: React.RefObject<HTMLDivElement>;
}

const PDFViewer: React.FC<PDFViewerProps> = ({ pageRef }) => {
  const {
    pdfUrl, pins, addPin, highlights, addHighlight, currentPage, setCurrentPage,
    totalPages, setTotalPages, scale, setScale, setSelectedPin, setSelectedHighlight,
    undoLastStroke, strokes, isDragMode, setIsDragMode
  } = usePDFContext();
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });
  const sidebarWidth = 320;
  const [isPinningMode, setIsPinningMode] = useState(false);
  const [isHighlightExporting, setIsHighlightExporting] = useState(false);
  const [isMarkerMode, setIsMarkerMode] = useState(false);
  const [isEraserMode, setIsEraserMode] = useState(false);
  const [isHighlightingMode, setIsHighlightingMode] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionRect, setSelectionRect] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const [pinDetail, setPinDetail] = useState<PinDetailEntity | null>(null)

  // dialog state
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = () => setIsOpen(false);

  const handleDownloadHighlightPdf = async () => {
    if (!pdfUrl || highlights.length === 0) return;
    try {
      setIsHighlightExporting(true);
      await downloadPDFWithAnnotations(pdfUrl, highlights, strokes, scale);
    } catch (err) {
      console.error('Failed to download PDF with highlights', err);
    } finally {
      setIsHighlightExporting(false);
    }
  };

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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragMode) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grabbing';
      }
      return;
    }

    if (isHighlightingMode) {
      handleHighlightMouseDown(e);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning && containerRef.current) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      containerRef.current.scrollLeft -= dx;
      containerRef.current.scrollTop -= dy;
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (isHighlightingMode) {
      handleHighlightMouseMove(e);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isPanning) {
      setIsPanning(false);
      if (containerRef.current) {
        containerRef.current.style.cursor = 'grab';
      }
      return;
    }

    if (isHighlightingMode) {
      handleHighlightMouseUp(e);
    }
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

  const handleHighlightMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHighlightingMode || !pageRef.current) return;

    const page = pageRef.current;
    const rect = page.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const xPercent = (offsetX / rect.width) * 100;
    const yPercent = (offsetY / rect.height) * 100;

    if (xPercent >= 0 && xPercent <= 100 && yPercent >= 0 && yPercent <= 100) {
      setSelectionStart({ x: xPercent, y: yPercent });
      setIsSelecting(true);
      setSelectedHighlight(null);
    }
  };

  const handleHighlightMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionStart || !pageRef.current) return;

    const page = pageRef.current;
    const rect = page.getBoundingClientRect();

    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    const startX = Math.min(selectionStart.x, currentX);
    const startY = Math.min(selectionStart.y, currentY);
    const width = Math.abs(currentX - selectionStart.x);
    const height = Math.abs(currentY - selectionStart.y);

    setSelectionRect({ x: startX, y: startY, width, height });
  };

  const handleHighlightMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !selectionStart || !pageRef.current) return;

    const page = pageRef.current;
    const rect = page.getBoundingClientRect();

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    const xPercent = (offsetX / rect.width) * 100;
    const yPercent = (offsetY / rect.height) * 100;

    if (xPercent >= 0 && xPercent <= 100 && yPercent >= 0 && yPercent <= 100) {
      const startX = Math.min(selectionStart.x, xPercent);
      const startY = Math.min(selectionStart.y, yPercent);
      const width = Math.abs(xPercent - selectionStart.x);
      const height = Math.abs(yPercent - selectionStart.y);

      // Only create highlight if selection is large enough
      if (width > 1 && height > 0.5) {
        addHighlight({
          pageNumber: currentPage,
          x: startX,
          y: startY,
          width: width,
          height: height,
          color: '#ffeb3b', // Yellow highlight
          note: 'New highlight'
        });
      }
    }

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionRect(null);
    setIsHighlightingMode(false);
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
        {/* PDF Viewer Main Container */}
        <div
          ref={containerRef}
          className="pdf-viewer-container flex-1 overflow-auto relative"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ cursor: isDragMode ? 'grab' : 'default' }}
        >
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
                  style={{ cursor: isPinningMode || isHighlightingMode || isMarkerMode ? 'crosshair' : 'auto' }}
                  onClick={handlePageClick}
                  onMouseDown={handleHighlightMouseDown}
                  onMouseMove={handleHighlightMouseMove}
                  onMouseUp={handleHighlightMouseUp}
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

                  {/* Freehand drawing overlay */}
                  <FreehandCanvas pageRef={pageRef} pageNumber={currentPage} drawActive={isMarkerMode} eraseActive={isEraserMode} />

                  {isSelecting && selectionRect && (
                    <div
                      className="selection-rectangle"
                      style={{
                        position: 'absolute',
                        left: `${selectionRect.x}%`,
                        top: `${selectionRect.y}%`,
                        width: `${selectionRect.width}%`,
                        height: `${selectionRect.height}%`,
                        backgroundColor: 'rgba(59, 130, 246, 0.3)',
                        border: '1px solid #3b82f6',
                        zIndex: 10
                      }}
                    />
                  )}

                  {!isLoading && highlights
                    .filter(h => h.pageNumber === currentPage)
                    .map(h => (
                      <HighlightMarker
                        key={h.id}
                        highlight={h}
                        pdfDimensions={pdfDimensions}
                      />
                    ))}

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

          {/* Floating Action Buttons */}
          <div className="fixed bottom-6 left-6 flex flex-col gap-2 z-10">
            <button
              className={`p-3 rounded-full shadow-lg ${isHighlightingMode ? 'bg-accent text-white' : 'bg-white text-gray-700'}`}
              onClick={() => { setIsHighlightingMode(!isHighlightingMode); setIsPinningMode(false); setIsMarkerMode(false); setSelectedHighlight(null); setSelectedPin(null); }}
              title={isHighlightingMode ? 'Cancel highlighting' : 'Add a highlight'}
            >
              <Highlighter size={20} />
            </button>
            <button
              className={`p-3 rounded-full shadow-lg ${isPinningMode ? 'bg-accent text-white' : 'bg-white text-gray-700'}`}
              onClick={() => { setIsPinningMode(!isPinningMode); setIsHighlightingMode(false); setIsMarkerMode(false); setSelectedPin(null); setSelectedHighlight(null); }}
              title={isPinningMode ? 'Cancel adding pin' : 'Add a new pin'}
            >
              <PinIcon size={20} />
            </button>
            <button
              className={`p-3 rounded-full shadow-lg ${isMarkerMode ? 'bg-accent text-white' : 'bg-white text-gray-700'}`}
              onClick={() => {
                setIsMarkerMode(!isMarkerMode);
                setIsPinningMode(false);
                setIsHighlightingMode(false);
                setSelectedPin(null);
                setSelectedHighlight(null);
              }}
              title={isMarkerMode ? 'Cancel marker' : 'Freehand marker'}
            >
              <Pencil size={20} />
            </button>
            <button
              className={`p-3 rounded-full shadow-lg ${isEraserMode ? 'bg-accent text-white' : 'bg-white text-gray-700'}`}
              onClick={() => {
                setIsEraserMode(!isEraserMode);
                setIsMarkerMode(false);
                setIsPinningMode(false);
                setIsHighlightingMode(false);
              }}
              title={isEraserMode ? 'Cancel eraser' : 'Eraser mode'}
            >
              <Eraser size={20} />
            </button>
            <button
              className={`p-3 rounded-full shadow-lg ${isDragMode ? 'bg-accent text-white' : 'bg-white text-gray-700'}`}
              onClick={() => {
                setIsDragMode(!isDragMode);
                setIsPinningMode(false);
                setIsHighlightingMode(false);
                setIsMarkerMode(false);
                setIsEraserMode(false);
              }}
              title={isDragMode ? 'Cancel Panning' : 'Pan Mode'}
            >
              <Move size={20} />
            </button>
            <button
              className={`p-3 rounded-full shadow-lg ${isHighlightExporting ? 'bg-gray-200 text-gray-500' : 'bg-white text-gray-700'}`}
              onClick={handleDownloadHighlightPdf}
              disabled={(highlights.length === 0 && strokes.length === 0) || !pdfUrl || isHighlightExporting}
              title="Download PDF with Highlights & Strokes"
            >
              {isHighlightExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
              ) : (
                <DownloadIcon size={20} />
              )}
            </button>
          </div>
        </div>

        {/* Annotation Panel */}
        <AnnotationPanel width={sidebarWidth} pageRef={pageRef} />

        {/* Dialog Model */}
        <DialogModel key={nanoid()} isOpen={isOpen} onClose={handleClose} setPinDetail={setPinDetail} pinDetail={pinDetail} />
      </div>
    </>
  );
};

export default PDFViewer;