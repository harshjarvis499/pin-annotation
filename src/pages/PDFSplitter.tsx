import React, { useState, useCallback } from 'react';
import { PDFDocument } from 'pdf-lib';
import { Document, Page } from 'react-pdf';
import { Upload, Save, Trash2, Minus, Plus } from 'lucide-react';

interface SplitPage {
    pageNumber: number;
    name: string;
    blob?: Blob;
    url?: string;
}

const PDFSplitter: React.FC = () => {
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [splitPages, setSplitPages] = useState<SplitPage[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedPage, setSelectedPage] = useState<SplitPage | null>(null);
    const [scale, setScale] = useState(1);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;

        const file = e.target.files[0];
        setPdfFile(file);
        setIsProcessing(true);

        try {
            // First load the PDF to get page count
            const arrayBuffer = await file.arrayBuffer();
            const pdfDoc = await PDFDocument.load(arrayBuffer);
            const pageCount = pdfDoc.getPageCount();

            // Initialize split pages with default names
            const newSplitPages: SplitPage[] = Array.from({ length: pageCount }, (_, i) => ({
                pageNumber: i + 1,
                name: `Page ${i + 1}`,
            }));

            setSplitPages(newSplitPages);

            // Automatically split the PDF
            const updatedPages = await Promise.all(
                newSplitPages.map(async (page) => {
                    const newPdfDoc = await PDFDocument.create();
                    const [copiedPage] = await newPdfDoc.copyPages(pdfDoc, [page.pageNumber - 1]);
                    newPdfDoc.addPage(copiedPage);

                    const pdfBytes = await newPdfDoc.save();
                    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);

                    return { ...page, blob, url };
                })
            );

            setSplitPages(updatedPages);
            if (updatedPages.length > 0) {
                setSelectedPage(updatedPages[0]);
            }
        } catch (error) {
            console.error('Error processing PDF:', error);
            alert('Error processing PDF file. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleNameChange = (index: number, newName: string) => {
        setSplitPages(prev =>
            prev.map((page, i) =>
                i === index ? { ...page, name: newName } : page
            )
        );
    };

    const handleDownload = useCallback((page: SplitPage) => {
        if (!page.blob) return;

        const a = document.createElement('a');
        a.href = page.url || '';
        a.download = `${page.name}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, []);

    const handleRemoveFile = () => {
        setPdfFile(null);
        setSplitPages([]);
        setSelectedPage(null);
        // Cleanup URLs
        splitPages.forEach(page => {
            if (page.url) {
                URL.revokeObjectURL(page.url);
            }
        });
    };

    const handleRemoveSplit = (pageToRemove: SplitPage) => {
        // Cleanup URL for the removed page
        if (pageToRemove.url) {
            URL.revokeObjectURL(pageToRemove.url);
        }

        // Remove the page from splitPages
        setSplitPages(prev => {
            const newPages = prev.filter(page => page.pageNumber !== pageToRemove.pageNumber);

            // Update page numbers for remaining pages
            return newPages.map((page, index) => ({
                ...page,
                pageNumber: index + 1,
                name: page.name === `Page ${page.pageNumber}` ? `Page ${index + 1}` : page.name
            }));
        });

        // If the removed page was selected, select another page
        if (selectedPage?.pageNumber === pageToRemove.pageNumber) {
            setSelectedPage(prev => {
                const remainingPages = splitPages.filter(page => page.pageNumber !== pageToRemove.pageNumber);
                return remainingPages.length > 0 ? remainingPages[0] : null;
            });
        }
    };

    const zoomIn = () => {
        setScale(prev => Math.min(prev + 0.1, 2.0));
    };

    const zoomOut = () => {
        setScale(prev => Math.max(prev - 0.1, 0.5));
    };

    return (
        <div className="flex h-full">
            {/* Left Sidebar */}
            <div className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="file"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="hidden"
                            id="pdf-upload"
                        />
                        <label
                            htmlFor="pdf-upload"
                            className="btn btn-primary flex-1 flex items-center justify-center"
                        >
                            <Upload className="h-4 w-4 mr-2" />
                            <span>Upload PDF</span>
                        </label>
                        {pdfFile && (
                            <button
                                onClick={handleRemoveFile}
                                className="btn btn-error btn-square"
                                title="Remove all"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {isProcessing && (
                        <div className="text-center py-4">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                            <p className="text-sm text-gray-500">Processing PDF...</p>
                        </div>
                    )}

                    {splitPages.length > 0 && (
                        <div className="space-y-2">
                            {splitPages.map((page, index) => (
                                <div
                                    key={page.pageNumber}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors ${selectedPage?.pageNumber === page.pageNumber
                                        ? 'bg-primary/10 border border-primary'
                                        : 'hover:bg-gray-100 border border-transparent'
                                        }`}
                                    onClick={() => page.url && setSelectedPage(page)}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">Page {page.pageNumber}</span>
                                        <div className="flex items-center gap-1">
                                            {page.blob && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDownload(page);
                                                    }}
                                                    className="btn btn-ghost btn-sm p-1"
                                                    title="Download"
                                                >
                                                    <Save className="h-4 w-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveSplit(page);
                                                }}
                                                className="btn btn-ghost btn-sm p-1 hover:text-error"
                                                title="Remove page"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <input
                                        type="text"
                                        value={page.name}
                                        onChange={(e) => handleNameChange(index, e.target.value)}
                                        className="input input-bordered input-sm w-full"
                                        onClick={(e) => e.stopPropagation()}
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {selectedPage?.url ? (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between p-4 border-b">
                            <h2 className="text-xl font-semibold">{selectedPage.name}</h2>
                            <div className="flex items-center space-x-2">
                                <button onClick={zoomOut} className="btn btn-ghost btn-sm">
                                    <Minus className="h-4 w-4" />
                                </button>
                                <span className="text-sm">{Math.round(scale * 100)}%</span>
                                <button onClick={zoomIn} className="btn btn-ghost btn-sm">
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto flex items-center justify-center p-4">
                            <Document
                                file={selectedPage.url}
                                loading={
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                }
                            >
                                <Page
                                    pageNumber={1}
                                    scale={scale}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />
                            </Document>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-gray-500">
                        {pdfFile ? (
                            isProcessing ? (
                                <div className="text-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                                    <p>Processing PDF...</p>
                                </div>
                            ) : (
                                <p>Select a page from the sidebar to view</p>
                            )
                        ) : (
                            <p>Upload a PDF to get started</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default PDFSplitter; 