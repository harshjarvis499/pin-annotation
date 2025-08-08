import React, { useRef, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { FileQuestion, Download, Pencil, Scissors } from 'lucide-react';
import PDFViewer from './components/PDFViewer';
import Navbar from './components/Navbar';
import WelcomeScreen from './components/WelcomeScreen';
import PDFSplitter from './pages/PDFSplitter';
import { usePDFContext } from './contexts/PDFContext';
import { downloadPDFWithAnnotations, downloadPDFWithHighlights, downloadPDFWithPins } from './utils/pdfUtils';
import { downloadCombinedKeyPointsPDF } from './utils/keyPointPdf';

// Create a separate navigation component to use useLocation
const Navigation = ({ pageRef }: { pageRef: React.RefObject<HTMLDivElement> }) => {
  const { pdfUrl, pins, scale, strokes } = usePDFContext();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleExportPDFWithStrokes = async () => {
    if (!pdfUrl || strokes.length === 0) return;
    try {
      await downloadPDFWithAnnotations(pdfUrl, strokes, scale);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportPDFWithoutStrokes = async () => {
    if (!pdfUrl) return;
    try {
      await downloadPDFWithHighlights(pdfUrl, [], scale);
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const isAnnotatorRoute = location.pathname === '/';

  return (
    <nav className="bg-white shadow-sm mb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-auto py-4">
          <div className="flex items-center">
            <Link to="/" className="text-2xl font-bold text-gray-900">
              PDF Tools
            </Link>
          </div>
          <div className="flex space-x-2">
            <div className="flex space-x-4 mb-2">
              <Link
                to="/"
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${isAnnotatorRoute
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <Pencil className="h-5 w-5 mb-1" />
                <span className="text-sm font-medium">Annotator</span>
              </Link>
              <Link
                to="/split"
                className={`flex flex-col items-center p-2 rounded-lg transition-colors ${!isAnnotatorRoute
                  ? 'bg-primary/10 text-primary'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <Scissors className="h-5 w-5 mb-1" />
                <span className="text-sm font-medium">Split PDF</span>
              </Link>
            </div>
            {isAnnotatorRoute && pdfUrl && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className={`btn btn-primary btn-sm flex items-center py-2 h-auto`}
                  title="Export PDF"
                >
                  <Download className="h-5 w-5 mr-2" />
                  <span className="text-sm">Export PDF</span>
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                    <button
                      onClick={handleExportPDFWithStrokes}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                    >
                      Export PDF with Stroke
                    </button>
                    <button
                      onClick={handleExportPDFWithoutStrokes}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors border-t border-gray-200"
                    >
                      Export PDF without Stroke
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

function App() {
  const { pdfUrl } = usePDFContext();
  const pageRef = useRef<HTMLDivElement>(null);

  return (
    <Router>
      <div className="flex flex-col h-screen bg-gray-50">
        <Navigation pageRef={pageRef} />
        <Routes>
          <Route path="/split" element={<PDFSplitter />} />
          <Route path="/" element={
            <main className="flex-1 flex overflow-hidden">
              {pdfUrl ? (
                <PDFViewer pageRef={pageRef} />
              ) : (
                <WelcomeScreen />
              )}
            </main>
          } />
        </Routes>
      </div>
    </Router>
  );
}

export default App;