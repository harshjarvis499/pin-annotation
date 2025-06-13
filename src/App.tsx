import React, { useRef } from 'react';
import { FileQuestion } from 'lucide-react';
import PDFViewer from './components/PDFViewer';
import Navbar from './components/Navbar';
import WelcomeScreen from './components/WelcomeScreen';
import { usePDFContext } from './contexts/PDFContext';

function App() {
  const { pdfUrl } = usePDFContext();
  const pageRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar pageRef={pageRef} />
      <main className="flex-1 flex overflow-hidden">
        {pdfUrl ? (
          <PDFViewer pageRef={pageRef} />
        ) : (
          <WelcomeScreen />
        )}
      </main>
    </div>
  );
}

export default App;