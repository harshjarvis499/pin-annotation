import { PDFDocument, rgb, degrees, LineCapStyle, PDFName, PDFArray, PDFString, AnnotationFlags, PDFNumber } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { Pin, Highlight, Stroke } from '../contexts/PDFContext';

// Simple pin icon SVG path data
const PIN_PATH = 'M12 0C7.6 0 4 3.6 4 8c0 5.3 8 16 8 16s8-10.7 8-16c0-4.4-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z';

// Pin dimensions for centering calculations
const PIN_WIDTH = 24;  // Width of the SVG viewbox
const PIN_HEIGHT = 24; // Height of the SVG viewbox







/**
 * Generate and download a copy of the original PDF with highlight rectangles burned in.
 * Each highlight is stored as percentages relative to the page, so we convert them
 * to absolute coordinates for drawing. Highlights are rendered as semi–transparent
 * rectangles using their stored color.
 */

export async function downloadPDFWithHighlights(pdfUrl: string, highlights: Highlight[], scale: number = 1) {
    try {
        const pdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        const highlightsByPage = highlights.reduce((acc, h) => {
            const pageNum = h.pageNumber - 1;
            (acc[pageNum] ||= []).push(h);
            return acc;
        }, {} as Record<number, Highlight[]>);

        for (const [pageNumStr, pageHighlights] of Object.entries(highlightsByPage)) {
            const page = pages[parseInt(pageNumStr)];
            if (!page) continue;

            const { width, height } = page.getSize();
            const rotation = page.getRotation().angle;

            pageHighlights.forEach(h => {
                // base percentage values
                const baseX = h.x / 100;
                const baseY = h.y / 100;
                const baseW = h.width / 100;
                const baseH = h.height / 100;

                let x: number, y: number, drawW: number, drawH: number;

                if (rotation === 90) {
                    x = baseY * width;
                    y = baseX * height;
                    drawW = baseH * width;  // swap
                    drawH = baseW * height;
                } else if (rotation === 180) {
                    x = width - baseX * width - baseW * width;
                    y = baseY * height;
                    drawW = baseW * width;
                    drawH = baseH * height;
                } else if (rotation === 270 || rotation === -90) {
                    x = width - baseY * width - baseH * width;
                    y = height - baseX * height - baseW * height;
                    drawW = baseH * width; // swap
                    drawH = baseW * height;
                } else {
                    x = baseX * width;
                    y = height - baseY * height - baseH * height;
                    drawW = baseW * width;
                    drawH = baseH * height;
                }

                const { r, g, b } = hexToRgb(h.color);
                page.drawRectangle({
                    x,
                    y,
                    width: drawW,
                    height: drawH,
                    color: rgb(r / 255, g / 255, b / 255),
                    opacity: 0.3,
                    borderColor: rgb(r / 255, g / 255, b / 255),
                    borderWidth: 1
                });
            });
        }

        const modifiedBytes = await pdfDoc.save();
        const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
        const originalFilename = pdfUrl.split('/').pop() || 'document';
        const filename = originalFilename.replace('.pdf', '-with-highlights.pdf');
        saveAs(blob, filename);
    } catch (err) {
        console.error('Error generating PDF with highlights:', err);
        throw err;
    }
}



function interpolateLinePoints(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    step = 0.5
): { x: number; y: number }[] {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const count = Math.max(2, Math.ceil(dist / step));
    return Array.from({ length: count + 1 }, (_, i) => ({
        x: p1.x + (dx * i) / count,
        y: p1.y + (dy * i) / count,
    }));
}

const getRotatedCoordinates = (
    px: number,
    py: number,
    width: number,
    height: number,
    rotation: number
): { x: number, y: number } => {
    if (rotation === 90) {
        return {
            x: (py / 100) * width,
            y: (px / 100) * height
        };
    } else if (rotation === 180) {
        return {
            x: width - (px / 100) * width,
            y: (py / 100) * height
        };
    } else if (rotation === 270) {
        return {
            x: width - (py / 100) * width,
            y: height - (px / 100) * height
        };
    } else {
        let x = (px / 100) * width;
        let y = (py / 100) * height;
        y = height - y;
        return { x, y };
    }
};


// ------------------------------ STROKES & HIGHLIGHTS ------------------------------
export async function downloadPDFWithAnnotations(
    pdfUrl: string,
    highlights: Highlight[],
    strokes: Stroke[],
    scale: number = 1
) {
    try {
        const pdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        const highlightsByPage = highlights.reduce<Record<number, Highlight[]>>((acc, h) => {
            const pageNum = h.pageNumber - 1;
            (acc[pageNum] ||= []).push(h);
            return acc;
        }, {});

        for (const [pageNumStr, pageHighlights] of Object.entries(highlightsByPage)) {
            const page = pages[parseInt(pageNumStr)];
            if (!page) continue;

            const { width: pageWidth, height: pageHeight } = page.getSize();
            const rotation = page.getRotation().angle;

            if (!page.node.has(PDFName.of('Annots'))) {
                page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([]));
            }

            const annots = page.node.lookup(PDFName.of('Annots'), PDFArray);


            pageHighlights.forEach(h => {
                const fillColor = rgb(68 / 255, 64 / 255, 59 / 255);
                const opacity = 0.5;

                const unrotatedW = (rotation === 90 || rotation === 270) ? pageHeight : pageWidth;
                const unrotatedH = (rotation === 90 || rotation === 270) ? pageWidth : pageHeight;

                const absX = (h.x / 100) * unrotatedW;
                const absY = (h.y / 100) * unrotatedH;
                const absW = (h.width / 100) * unrotatedW;
                const absH = (h.height / 100) * unrotatedH;

                let finalRect = { x: 0, y: 0, width: 0, height: 0 };

                switch (rotation) {
                    case 90:
                        finalRect = { x: absY, y: unrotatedW - absX - absW, width: absH, height: absW };
                        break;
                    case 180:
                        finalRect = {
                            x: unrotatedW - absX - absW,
                            y: unrotatedH - absY - absH,
                            width: absW,
                            height: absH
                        };
                        break;
                    case 270:
                        finalRect = {
                            x: unrotatedH - absY - absH,
                            y: unrotatedW - absX - absW,
                            width: absH,
                            height: absW
                        };
                        break;
                    default:
                        finalRect = {
                            x: absX,
                            y: unrotatedH - absY - absH,
                            width: absW,
                            height: absH
                        };
                        break;
                }

                // Draw visible highlight
                page.drawRectangle({
                    ...finalRect,
                    color: fillColor,
                    opacity,
                });

                if (h.note) {
                    // --- UPDATED: Use Highlight annotation instead of rectangle + sticky note ---
                    const highlightRef = pdfDoc.context.register(
                        pdfDoc.context.obj({
                            Type: PDFName.of('Annot'),
                            Subtype: PDFName.of('Highlight'),
                            Rect: [finalRect.x, finalRect.y, finalRect.x + finalRect.width, finalRect.y + finalRect.height],
                            QuadPoints: [
                                finalRect.x, finalRect.y + finalRect.height,
                                finalRect.x + finalRect.width, finalRect.y + finalRect.height,
                                finalRect.x, finalRect.y,
                                finalRect.x + finalRect.width, finalRect.y
                            ],
                            C: [68 / 255, 64 / 255, 59 / 255],
                            CA: 0.2,
                            T: PDFString.of('Note'),
                            Contents: PDFString.of(h.note),
                            F: AnnotationFlags.Print,
                            M: PDFString.fromDate(new Date())
                        })
                    );

                    // Create the popup
                    const popup = pdfDoc.context.obj({
                        Type: PDFName.of('Annot'),
                        Subtype: PDFName.of('Popup'),
                        Rect: [finalRect.x + 10, finalRect.y + 10, finalRect.x + 200, finalRect.y + 100],
                        Parent: highlightRef,
                        Open: false
                    });

                    annots.push(highlightRef);
                    annots.push(popup);

                }

            });
        }

        // ---- Strokes ----
        const strokesByPage = strokes.reduce<Record<number, Stroke[]>>((acc, s) => {
            const pageNum = s.pageNumber - 1;
            (acc[pageNum] ||= []).push(s);
            return acc;
        }, {});

        for (const [pageNumStr, pageStrokes] of Object.entries(strokesByPage)) {
            const page = pages[parseInt(pageNumStr)];
            if (!page) continue;
            const { width, height } = page.getSize();
            const rotation = page.getRotation().angle;

            pageStrokes.forEach(s => {
                const { r, g, b } = hexToRgb(s.color);
                const brushColor = {
                    r: r + (255 - r) * 0.4,
                    g: g + (255 - g) * 0.4,
                    b: b + (255 - b) * 0.4,
                };

                const absPoints = s.points.map(pt =>
                    getRotatedCoordinates(pt.x, pt.y, width, height, rotation)
                );

                const strokeWidth = s.width * scale;
                const strokeColor = rgb(68 / 255, 64 / 255, 59 / 255);
                const strokeOpacity = 0.01;

                for (let i = 0; i < absPoints.length - 1; i++) {
                    const p1 = absPoints[i];
                    const p2 = absPoints[i + 1];

                    const segments = interpolateLinePoints(p1, p2);

                    for (let j = 0; j < segments.length - 1; j++) {
                        const start = segments[j];
                        const end = segments[j + 1];
                        page.drawLine({
                            start,
                            end,
                            thickness: strokeWidth,
                            color: strokeColor,
                            opacity: strokeOpacity,
                            lineCap: LineCapStyle.Projecting,
                        });
                    }
                }
            });
        }

        const modifiedBytes = await pdfDoc.save();
        const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
        const originalFilename = pdfUrl.split('/').pop() || 'document';
        const filename = originalFilename.replace('.pdf', '-with-annotations.pdf');
        saveAs(blob, filename);
    } catch (err) {
        console.error('Error generating PDF with annotations:', err);
        throw err;
    }
}
// ------------------------------ PINS ------------------------------

export async function downloadPDFWithPins(pdfUrl: string, pins: Pin[], scale: number = 1) {
    try {
        const pdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        const pinsByPage = pins.reduce<Record<number, Pin[]>>((acc, pin) => {
            const pageNum = pin.pageNumber - 1;
            (acc[pageNum] ||= []).push(pin);
            return acc;
        }, {});

        for (const [pageNumStr, pagePins] of Object.entries(pinsByPage)) {
            const page = pages[parseInt(pageNumStr)];
            if (!page) continue;

            const { width, height } = page.getSize();
            const rotation = page.getRotation().angle;

            (pagePins as Pin[]).forEach(pin => {
                try {
                    // Convert percentage to absolute coordinates
                    let x;
                    let y;
                    if (rotation !== 0) {
                        if (rotation === 90) {
                            x = (pin.y / 100) * width;
                            y = (pin.x / 100) * height;
                        } else if (rotation === 180) {
                            x = width - (pin.x / 100) * width;
                            y = (pin.y / 100) * height;
                        } else if (rotation === 270) {
                            x = width - (pin.y / 100) * width + 12;
                            y = height - (pin.x / 100) * height + 12;
                        } else {
                            x = (pin.x / 100) * width;
                            y = height - (pin.y / 100) * height;
                        }
                    } else {
                        x = (pin.x / 100) * width;
                        y = (pin.y / 100) * height;
                        y = height - y;

                        const pinScale = 0.8 * scale;
                        const scaledPinWidth = PIN_WIDTH * pinScale / 2;
                        const scaledPinHeight = PIN_HEIGHT * pinScale / 2;

                        x = (x - scaledPinWidth) - 2.5;
                        y = (y + scaledPinHeight) + 5;
                    }

                    const { r, g, b } = hexToRgb(pin.color);
                    page.drawSvgPath(PIN_PATH, {
                        x,
                        y,
                        scale: scale,
                        color: rgb(r / 255, g / 255, b / 255),
                        borderColor: rgb(0, 0, 0),
                        borderWidth: 1,
                        rotate: degrees(rotation)
                    });
                } catch (err) {
                    console.error('Error drawing pin:', err);
                }
            });
        }

        const modifiedBytes = await pdfDoc.save();
        const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
        const originalFilename = pdfUrl.split('/').pop() || 'document';
        const filename = originalFilename.replace('.pdf', '-with-pins.pdf');
        saveAs(blob, filename);
    } catch (err) {
        console.error('Error generating PDF with pins:', err);
        throw err;
    }
}

function hexToRgb(hex: string) {
    // Remove # if present
    hex = hex.replace('#', '');

    // Parse hex values
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    return { r, g, b };
} 