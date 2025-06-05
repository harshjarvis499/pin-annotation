import React from 'react';
import { FileQuestion } from 'lucide-react';
import PDFViewer from './components/PDFViewer';
import Navbar from './components/Navbar';
import WelcomeScreen from './components/WelcomeScreen';
import { usePDFContext } from './contexts/PDFContext';

function App() {
  const { pdfUrl } = usePDFContext();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Navbar />
      <main className="flex-1 flex overflow-hidden">
        {pdfUrl ? (
          <PDFViewer />
        ) : (
          <WelcomeScreen />
        )}
      </main>
    </div>
  );
}

export default App;