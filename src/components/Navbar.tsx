import React, { useState } from 'react';
import {
  Upload, Download, Pin, Settings, Menu, X
} from 'lucide-react';
import { usePDFContext } from '../contexts/PDFContext';
import { downloadPDFWithPins } from '../utils/pdfUtils';

import Logo from "../../public/waltz-logo-black.jpg"

const Navbar: React.FC = () => {
  const { pdfUrl, setPDFFile, pins, addRecentFile, scale } = usePDFContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPDFFile(file);
      e.target.value = '';
    }
  };

  const exportPDF = async () => {
    if (!pdfUrl || pins.length === 0) return;

    try {
      setIsExporting(true);
      await downloadPDFWithPins(pdfUrl, pins, scale);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <img src={Logo} className='h-16 object-fit-cover' />
            </div>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            {/* <div className="relative">
              <button
                className="btn btn-secondary flex items-center"
                onClick={() => setShowRecent(prev => !prev)}
              >
                <Upload className="h-4 w-4 mr-2" />
                <span>Open PDF</span>
              </button>
              {showRecent && (
                <RecentFilesMenu onClose={() => setShowRecent(false)} />
              )}
            </div>

            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className="btn btn-primary flex items-center cursor-pointer"
            >
              <Upload className="h-4 w-4 mr-2" />
              <span>Upload New</span>
            </label> */}

            {pdfUrl && (
              <button
                className="btn btn-secondary flex items-center"
                onClick={exportPDF}
                disabled={pins.length === 0 || isExporting}
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2" />
                    <span>Exporting...</span>
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    <span>Export with Pins</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-gray-900 hover:bg-gray-100 focus:outline-none"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg absolute w-full z-50">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <label
              htmlFor="mobile-pdf-upload"
              className="block px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-100"
            >
              Upload PDF
            </label>
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
              id="mobile-pdf-upload"
            />

            {pdfUrl && (
              <button
                className="w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-900 hover:bg-gray-100"
                onClick={exportPDF}
                disabled={pins.length === 0 || isExporting}
              >
                {isExporting ? 'Exporting...' : 'Export with Pins'}
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;