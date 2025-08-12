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

export interface Stroke {
  id: string;
  pageNumber: number;
  points: { x: number; y: number }[]; // percentage coordinates
  color: string;
  draftColor?: string;
  width: number; // px at scale 1
  createdAt: Date;
  isDraft?: boolean;
}

export interface Highlight {
  id: string;
  pageNumber: number;
  x: number; // percentage position on the page
  y: number; // percentage position on the page
  width: number; // percentage width
  height: number; // percentage height
  color: string;
  note?: string;
  createdAt: Date;
}

interface PDFContextType {
  pdfUrl: string | null;
  setPDFFile: (file: File | null) => void;
  pins: Pin[];
  addPin: (pin: Omit<Pin, 'id' | 'createdAt'>) => void;
  updatePin: (id: string, updates: Partial<Omit<Pin, 'id' | 'createdAt'>>) => void;
  deletePin: (id: string) => void;
  highlights: Highlight[];
  addHighlight: (highlight: Omit<Highlight, 'id' | 'createdAt'>) => void;
  updateHighlight: (id: string, updates: Partial<Omit<Highlight, 'id' | 'createdAt'>>) => void;
  deleteHighlight: (id: string) => void;
  strokes: Stroke[];
  addStroke: (stroke: Omit<Stroke, 'id' | 'createdAt'>) => void;
  updateStroke: (stroke: Stroke) => void;
  undoLastStroke: (pageNumber: number) => void;
  deleteStroke: (id: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  setTotalPages: (pages: number) => void;
  scale: number;
  setScale: (scale: number) => void;
  selectedPin: string | null;
  setSelectedPin: (id: string | null) => void;
  selectedHighlight: string | null;
  setSelectedHighlight: (id: string | null) => void;
  recentFiles: { name: string, lastModified: Date }[];
  addRecentFile: (file: File) => void;
  isDragMode: boolean;
  setIsDragMode: (isDrag: boolean) => void;
}

const PDFContext = createContext<PDFContextType | undefined>(undefined);

export const PDFProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pdfUrl, setPdfUrl] = useState<string | null>(""); // testUrl = "https://jb-glass-webapp2.s3.ap-south-1.amazonaws.com/website/glass-catalogue-pdf/6636126df7231385747e3e81/TINTED-1748892672539.pdf"
  const [pins, setPins] = useState<Pin[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState<number>(1);
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [selectedHighlight, setSelectedHighlight] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<{ name: string, lastModified: Date }[]>([]);
  const [isDragMode, setIsDragMode] = useState(false);

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

  const addHighlight = (highlightData: Omit<Highlight, 'id' | 'createdAt'>) => {
    const newHighlight: Highlight = {
      ...highlightData,
      id: nanoid(),
      createdAt: new Date(),
    };
    setHighlights(prev => [...prev, newHighlight]);
  };

  const updateHighlight = (id: string, updates: Partial<Omit<Highlight, 'id' | 'createdAt'>>) => {
    setHighlights(prev => prev.map(highlight =>
      highlight.id === id ? { ...highlight, ...updates } : highlight
    ));
  };

  const deleteHighlight = (id: string) => {
    setHighlights(prev => prev.filter(highlight => highlight.id !== id));
    if (selectedHighlight === id) {
      setSelectedHighlight(null);
    }
  };

  // ---- Stroke helpers ----
  const addStroke = (strokeData: Omit<Stroke, 'id' | 'createdAt'>) => {
    const newStroke: Stroke = {
      ...strokeData,
      id: nanoid(),
      createdAt: new Date(),
    };
    setStrokes(prev => [...prev, newStroke]);
  };

  const updateStroke = (stroke: Stroke) => {
    setStrokes(prev => prev.map(s => s.id === stroke.id ? stroke : s));
  };

  const undoLastStroke = (pageNumber: number) => {
    setStrokes(prev => {
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].pageNumber === pageNumber) {
          return [...prev.slice(0, i), ...prev.slice(i + 1)];
        }
      }
      return prev;
    });
  };

  const deleteStroke = (id: string) => {
    setStrokes(prev => prev.filter(s => s.id !== id));
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
        highlights,
        addHighlight,
        updateHighlight,
        deleteHighlight,
        strokes,
        addStroke,
        updateStroke,
        undoLastStroke,
        deleteStroke,
        currentPage,
        setCurrentPage,
        totalPages,
        setTotalPages,
        scale,
        setScale,
        selectedPin,
        setSelectedPin,
        selectedHighlight,
        setSelectedHighlight,
        recentFiles,
        addRecentFile,
        isDragMode,
        setIsDragMode
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