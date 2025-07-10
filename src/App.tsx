import React, { useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';
import PDFViewer from './components/PDFViewer';
import Navbar from './components/Navbar';
import WelcomeScreen from './components/WelcomeScreen';
import PDFSplitter from './pages/PDFSplitter';
import { usePDFContext } from './contexts/PDFContext';

function App() {
  const { pdfUrl } = usePDFContext();
  const pageRef = useRef<HTMLDivElement>(null);

  return (
    <Router>
      <div className="flex flex-col h-screen bg-gray-50">
        <nav className="bg-white shadow-sm mb-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-gray-900">
                  PDF Tools
                </Link>
              </div>
              <div className="flex items-center space-x-4">
                <Link to="/" className="text-gray-600 hover:text-gray-900">
                  Annotator
                </Link>
                <Link to="/split" className="text-gray-600 hover:text-gray-900">
                  Split PDF
                </Link>
              </div>
            </div>
          </div>
        </nav>

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