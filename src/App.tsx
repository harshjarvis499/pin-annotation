import React, { useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { FileQuestion, Download, Pencil, Scissors } from 'lucide-react';
import PDFViewer from './components/PDFViewer';
import Navbar from './components/Navbar';
import WelcomeScreen from './components/WelcomeScreen';
import PDFSplitter from './pages/PDFSplitter';
import { usePDFContext } from './contexts/PDFContext';
import { downloadPDFWithPins } from './utils/pdfUtils';
import { downloadCombinedKeyPointsPDF } from './utils/keyPointPdf';

// Create a separate navigation component to use useLocation
const Navigation = ({ pageRef }: { pageRef: React.RefObject<HTMLDivElement> }) => {
  const { pdfUrl, pins, scale } = usePDFContext();
  const location = useLocation();

  const handleExportWithPins = async () => {
    if (!pdfUrl || pins.length === 0) return;
    try {
      await downloadPDFWithPins(pdfUrl, pins, scale);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    }
  };

  const handleExportCombinedKeyPoints = async () => {
    if (!pageRef.current || pins.length === 0) return;
    try {
      await downloadCombinedKeyPointsPDF(pageRef.current, pins, 'combined-key-points.pdf');
    } catch (error) {
      console.error('Error exporting key points:', error);
      alert('Failed to export key points. Please try again.');
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
              <div className="flex space-x-2">
                <button
                  onClick={handleExportWithPins}
                  disabled={pins.length === 0}
                  className={`btn btn-primary btn-sm flex items-center py-2 h-auto ${pins.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  title={pins.length === 0 ? 'Add pins before exporting' : 'Export PDF with pins'}
                >
                  <Download className="h-5 w-5 mr-2" />
                  <span className="text-sm">Export with Pins</span>
                </button>
                <button
                  onClick={handleExportCombinedKeyPoints}
                  disabled={pins.length === 0}
                  className={`btn btn-secondary btn-sm flex items-center py-2 h-auto ${pins.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  title={pins.length === 0 ? 'Add pins before exporting' : 'Export combined key points'}
                >
                  <Download className="h-5 w-5 mr-2" />
                  <span className="text-sm">Export Key Points</span>
                </button>
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