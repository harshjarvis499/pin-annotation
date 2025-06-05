import React from 'react';
import { FileText, Pin, Upload } from 'lucide-react';
import { usePDFContext } from '../contexts/PDFContext';

const WelcomeScreen: React.FC = () => {
  const { setPDFFile, recentFiles, addRecentFile } = usePDFContext();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPDFFile(file);
      addRecentFile(file);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full mx-auto text-center">
        <div className="mb-8 flex justify-center">
          <div className="p-4 bg-primary/10 rounded-full">
            <Pin className="h-12 w-12 text-primary" />
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">PDF Pin Annotator</h1>
        <p className="text-gray-600 mb-8">
          Upload a PDF document to start adding pins with detailed annotations.
        </p>
        
        <div className="mb-8">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            className="hidden"
            id="welcome-pdf-upload"
          />
          <label 
            htmlFor="welcome-pdf-upload" 
            className="btn btn-primary inline-flex items-center px-6 py-3 text-base"
          >
            <Upload className="h-5 w-5 mr-2" />
            <span>Select PDF Document</span>
          </label>
        </div>
        
        {recentFiles.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Documents</h2>
            <div className="bg-white rounded-lg shadow divide-y divide-gray-200">
              {recentFiles.map((file, index) => (
                <button
                  key={index}
                  className="w-full px-4 py-3 flex items-center hover:bg-gray-50 transition duration-150 text-left"
                  onClick={() => {
                    // In a real app, we would need to have the actual file contents saved
                    alert(`In a full implementation, this would reopen ${file.name}`);
                  }}
                >
                  <FileText className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 truncate" style={{ maxWidth: '240px' }}>
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.lastModified.toLocaleDateString()}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WelcomeScreen;