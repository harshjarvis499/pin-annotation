import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { nanoid } from 'nanoid';

export interface Pin {
  id: string;
  pageNumber: number;
  x: number; // percentage position on the page
  y: number; // percentage position on the page
  color: string;
  title: string;
  description: string;
  createdAt: Date;
}

interface PDFContextType {
  pdfUrl: string | null;
  setPDFFile: (file: File | null) => void;
  pins: Pin[];
  addPin: (pin: Omit<Pin, 'id' | 'createdAt'>) => void;
  updatePin: (id: string, updates: Partial<Omit<Pin, 'id' | 'createdAt'>>) => void;
  deletePin: (id: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  scale: number;
  setScale: (scale: number) => void;
  selectedPin: string | null;
  setSelectedPin: (id: string | null) => void;
  recentFiles: { name: string, lastModified: Date }[];
  addRecentFile: (file: File) => void;
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export const PDFProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(""); // testUrl = "https://jb-glass-webapp2.s3.ap-south-1.amazonaws.com/website/glass-catalogue-pdf/6636126df7231385747e3e81/TINTED-1748892672539.pdf"
  const [pins, setPins] = useState<Pin[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState<number>(1);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<{ name: string, lastModified: Date }[]>([]);

  // Clean up object URL when component unmounts or when URL changes
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  const setPDFFile = (file: File | null) => {
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }

    if (file) {
      const newUrl = URL.createObjectURL(file);
      setPdfUrl(newUrl);
      addRecentFile(file);
    } else {
      setPdfUrl(null);
    }
  };

  const addPin = (pinData: Omit<Pin, 'id' | 'createdAt'>) => {
    const newPin: Pin = {
      ...pinData,
      id: nanoid(),
      createdAt: new Date(),
    };
    setPins(prev => [...prev, newPin]);
    // setSelectedPin(newPin.id);
  };

  const updatePin = (id: string, updates: Partial<Omit<Pin, 'id' | 'createdAt'>>) => {
    setPins(prev => prev.map(pin =>
      pin.id === id ? { ...pin, ...updates } : pin
    ));
  };

  const deletePin = (id: string) => {
    setPins(prev => prev.filter(pin => pin.id !== id));
    if (selectedPin === id) {
      setSelectedPin(null);
    }
  };

  const addRecentFile = (file: File) => {
    const newRecent = {
      name: file.name,
      lastModified: new Date(file.lastModified)
    };

    setRecentFiles(prev => {
      // Remove duplicate if exists
      const filtered = prev.filter(item => item.name !== file.name);
      // Add to beginning and limit to 5 items
      return [newRecent, ...filtered].slice(0, 5);
    });
  };

  return (
    <PDFContext.Provider
      value={{
        pdfUrl,
        setPDFFile,
        pins,
        addPin,
        updatePin,
        deletePin,
        currentPage,
        setCurrentPage,
        totalPages,
        setTotalPages,
        scale,
        setScale,
        selectedPin,
        setSelectedPin,
        recentFiles,
        addRecentFile
      }}
    >
      {children}
    </PDFContext.Provider>
  );
};

export const usePDFContext = () => {
  const context = useContext(PDFContext);
  if (context === undefined) {
    throw new Error('usePDFContext must be used within a PDFProvider');
  }
  return context;
};