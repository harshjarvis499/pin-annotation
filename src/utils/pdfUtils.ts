import { PDFDocument, rgb, degrees, LineCapStyle, PDFName, PDFArray, PDFString, AnnotationFlags, PDFNumber, LineJoinStyle } from 'pdf-lib';
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
    strokes: Stroke[],
    scale: number = 1
) {
    try {
        const pdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();


        const svgIconUrl = "https://jb-glass-uat-apis.jarvistechnolabs.com/pdf-pin-design/shape-icon.svg";
        const iconPngBytes = await svgUrlToPngBytes(svgIconUrl, "#000", 60, 60);
        const iconImage = await pdfDoc.embedPng(iconPngBytes);
        const iconDims = iconImage.scale(0.4); // scale image if needed

        // const highlightsByPage = highlights.reduce<Record<number, Highlight[]>>((acc, h) => {
        //     const pageNum = h.pageNumber - 1;
        //     (acc[pageNum] ||= []).push(h);
        //     return acc;
        // }, {});

        // for (const [pageNumStr, pageHighlights] of Object.entries(highlightsByPage)) {
        //     const page = pages[parseInt(pageNumStr)];
        //     if (!page) continue;

        //     const { width: pageWidth, height: pageHeight } = page.getSize();
        //     const rotation = page.getRotation().angle;

        //     if (!page.node.has(PDFName.of('Annots'))) {
        //         page.node.set(PDFName.of('Annots'), pdfDoc.context.obj([]));
        //     }

        //     const annots = page.node.lookup(PDFName.of('Annots'), PDFArray);


        //     pageHighlights.forEach(h => {
        //         const fillColor = rgb(68 / 255, 64 / 255, 59 / 255);
        //         const opacity = 0.5;

        //         const unrotatedW = (rotation === 90 || rotation === 270) ? pageHeight : pageWidth;
        //         const unrotatedH = (rotation === 90 || rotation === 270) ? pageWidth : pageHeight;

        //         const absX = (h.x / 100) * unrotatedW;
        //         const absY = (h.y / 100) * unrotatedH;
        //         const absW = (h.width / 100) * unrotatedW;
        //         const absH = (h.height / 100) * unrotatedH;

        //         let finalRect = { x: 0, y: 0, width: 0, height: 0 };

        //         switch (rotation) {
        //             case 90:
        //                 finalRect = { x: absY, y: unrotatedW - absX - absW, width: absH, height: absW };
        //                 break;
        //             case 180:
        //                 finalRect = {
        //                     x: unrotatedW - absX - absW,
        //                     y: unrotatedH - absY - absH,
        //                     width: absW,
        //                     height: absH
        //                 };
        //                 break;
        //             case 270:
        //                 finalRect = {
        //                     x: unrotatedH - absY - absH,
        //                     y: unrotatedW - absX - absW,
        //                     width: absH,
        //                     height: absW
        //                 };
        //                 break;
        //             default:
        //                 finalRect = {
        //                     x: absX,
        //                     y: unrotatedH - absY - absH,
        //                     width: absW,
        //                     height: absH
        //                 };
        //                 break;
        //         }

        //         // Draw visible highlight
        //         page.drawRectangle({
        //             ...finalRect,
        //             color: fillColor,
        //             opacity,
        //         });

        //         if (h.note) {
        //             // --- UPDATED: Use Highlight annotation instead of rectangle + sticky note ---
        //             const highlightRef = pdfDoc.context.register(
        //                 pdfDoc.context.obj({
        //                     Type: PDFName.of('Annot'),
        //                     Subtype: PDFName.of('Highlight'),
        //                     Rect: [finalRect.x, finalRect.y, finalRect.x + finalRect.width, finalRect.y + finalRect.height],
        //                     QuadPoints: [
        //                         finalRect.x, finalRect.y + finalRect.height,
        //                         finalRect.x + finalRect.width, finalRect.y + finalRect.height,
        //                         finalRect.x, finalRect.y,
        //                         finalRect.x + finalRect.width, finalRect.y
        //                     ],
        //                     C: [68 / 255, 64 / 255, 59 / 255],
        //                     CA: 0.2,
        //                     T: PDFString.of('Note'),
        //                     Contents: PDFString.of(h.note),
        //                     F: AnnotationFlags.Print,
        //                     M: PDFString.fromDate(new Date())
        //                 })
        //             );

        //             // Create the popup
        //             const popup = pdfDoc.context.obj({
        //                 Type: PDFName.of('Annot'),
        //                 Subtype: PDFName.of('Popup'),
        //                 Rect: [finalRect.x + 10, finalRect.y + 10, finalRect.x + 200, finalRect.y + 100],
        //                 Parent: highlightRef,
        //                 Open: false
        //             });

        //             annots.push(highlightRef);
        //             annots.push(popup);

        //         }

        //     });
        // }

        const strokesByPage = strokes.reduce<Record<number, Stroke[]>>((acc, s) => {
            const pageNum = s.pageNumber - 1;
            (acc[pageNum] ||= []).push(s);
            return acc;
        }, {});

        const strokeColor = rgb(204 / 255, 204 / 255, 204 / 255); // #cccccc
        const strokeOpacity = 0.05; // lower to make intersections lighter
        const strokeSegments = 1; // reduce from 100 to avoid overdraw

        for (const [pageNumStr, pageStrokes] of Object.entries(strokesByPage)) {
            const page = pages[parseInt(pageNumStr)];
            if (!page) continue;

            const { width, height } = page.getSize();
            const rotation = page.getRotation().angle;

            pageStrokes.forEach((s) => {
                const absPoints = s.points.map((pt) =>
                    getRotatedCoordinates(pt.x, pt.y, width, height, rotation)
                );

                const strokeWidth = s.width * scale;
                const jointRadius = (strokeWidth * 0.8) / 2;

                // // Draw joint fills *before* strokes to blend under
                // for (let i = 1; i < absPoints.length - 1; i++) {
                //     const jointPoint = absPoints[i];
                //     page.drawEllipse({
                //         x: jointPoint.x,
                //         y: jointPoint.y,
                //         xScale: jointRadius,
                //         yScale: jointRadius,
                //         color: strokeColor,
                //         opacity: strokeOpacity,
                //         borderWidth: 0,
                //     });
                // }

                // Draw actual stroke lines
                for (let i = 0; i < absPoints.length - 1; i++) {
                    const p1 = absPoints[i];
                    const p2 = absPoints[i + 1];

                    const segments = interpolateLinePoints(p1, p2, strokeSegments);

                    for (let j = 0; j < segments.length - 1; j++) {
                        page.drawLine({
                            start: segments[j],
                            end: segments[j + 1],
                            color: strokeColor,
                            opacity: strokeOpacity,
                            thickness: strokeWidth,
                            lineCap: LineCapStyle.Projecting, // ✅ smoother joins
                        });
                    }
                }

                // === ICON PLACEMENT (unchanged) ===
                if (s.points.length >= 2) {
                    let maxLen = 0;
                    let bestSeg = { start: s.points[0], end: s.points[1] };

                    for (let i = 0; i < s.points.length - 1; i++) {
                        const p1 = s.points[i];
                        const p2 = s.points[i + 1];
                        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                        if (len > maxLen) {
                            maxLen = len;
                            bestSeg = { start: p1, end: p2 };
                        }
                    }

                    const startAbs = getRotatedCoordinates(bestSeg.start.x, bestSeg.start.y, width, height, rotation);
                    const endAbs = getRotatedCoordinates(bestSeg.end.x, bestSeg.end.y, width, height, rotation);

                    const midX = (startAbs.x + endAbs.x) / 2;
                    const midY = (startAbs.y + endAbs.y) / 2;

                    const dx = endAbs.x - startAbs.x;
                    const dy = endAbs.y - startAbs.y;

                    const perpX = -dy;
                    const perpY = dx;
                    const lenPerp = Math.hypot(perpX, perpY);
                    const unitPerpX = perpX / lenPerp;
                    const unitPerpY = perpY / lenPerp;

                    const iconOffset = 16;
                    const iconX = midX + unitPerpX * iconOffset;
                    const iconY = midY + unitPerpY * iconOffset;

                    page.drawImage(iconImage, {
                        x: iconX - iconDims.width / 2,
                        y: (iconY + (iconY * 0.02)) - iconDims.height / 2,
                        width: iconDims.width,
                        height: iconDims.height,
                        rotate: degrees(rotation)
                    });
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

// Helper function to calculate crop area from stroke points
export const getCropArea = (stroke: Stroke, canvasWidth: number, canvasHeight: number) => {
    if (!stroke.points || stroke.points.length === 0) return null;

    // Convert percentage coordinates to pixel coordinates
    const pixelPoints = stroke.points.map(point => ({
        x: (point.x / 100) * canvasWidth,
        y: (point.y / 100) * canvasHeight
    }));

    // Find bounding box
    const minX = Math.min(...pixelPoints.map(p => p.x));
    const maxX = Math.max(...pixelPoints.map(p => p.x));
    const minY = Math.min(...pixelPoints.map(p => p.y));
    const maxY = Math.max(...pixelPoints.map(p => p.y));

    // Add dynamic margin
    const baseMargin = 15; // Base margin in pixels
    const percentageMarginX = (maxX - minX) * 0.2;
    const percentageMarginY = (maxY - minY) * 0.2;

    const marginX = Math.max(baseMargin, percentageMarginX);
    const marginY = Math.max(baseMargin, percentageMarginY);

    const width = maxX - minX;
    const height = maxY - minY;

    const cropX = minX - marginX;
    const cropY = minY - marginY;
    const cropWidth = width + marginX * 2;
    const cropHeight = height + marginY * 2;

    // Clamp crop to canvas boundaries
    const adjustedCrop = {
        x: Math.max(0, cropX),
        y: Math.max(0, cropY),
        width: Math.min(canvasWidth - cropX, cropWidth),
        height: Math.min(canvasHeight - cropY, cropHeight)
    };

    return adjustedCrop;
};

// Download cropped PDF with stroke

function expandToAspectRatio(minX: number, minY: number, maxX: number, maxY: number, aspectW = 4, aspectH = 3, pageWidth: number, pageHeight: number) {
    const boxW = maxX - minX;
    const boxH = maxY - minY;
    const boxRatio = boxW / boxH;
    const targetRatio = aspectW / aspectH;

    let newW = boxW;
    let newH = boxH;

    if (boxRatio > targetRatio) {
        // too wide, increase height
        newH = boxW / targetRatio;
    } else {
        // too tall, increase width
        newW = boxH * targetRatio;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    let newMinX = centerX - newW / 2;
    let newMinY = centerY - newH / 2;

    // Clamp to page boundaries
    newMinX = Math.max(0, newMinX);
    newMinY = Math.max(0, newMinY);
    let newMaxX = Math.min(pageWidth, newMinX + newW);
    let newMaxY = Math.min(pageHeight, newMinY + newH);

    return {
        minX: newMinX,
        minY: newMinY,
        maxX: newMaxX,
        maxY: newMaxY,
        width: newMaxX - newMinX,
        height: newMaxY - newMinY,
    };
}


export const getStrokeIconPosition = (
    points: { x: number; y: number }[],
    rect: DOMRect
) => {
    if (points.length < 2) return null;

    const pixelPoints = points.map(p => ({
        x: (p.x / 100) * rect.width,
        y: (p.y / 100) * rect.height,
    }));

    let maxLen = 0;
    let baseSegment = { start: pixelPoints[0], end: pixelPoints[1] };

    for (let i = 0; i < pixelPoints.length - 1; i++) {
        const p1 = pixelPoints[i];
        const p2 = pixelPoints[i + 1];
        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        if (len > maxLen) {
            maxLen = len;
            baseSegment = { start: p1, end: p2 };
        }
    }

    const dx = baseSegment.end.x - baseSegment.start.x;
    const dy = baseSegment.end.y - baseSegment.start.y;

    let lineType: "vertical" | "horizontal" | "diagonal";
    if (Math.abs(dx) > Math.abs(dy)) {
        lineType = "horizontal";
    } else if (Math.abs(dy) > Math.abs(dx)) {
        lineType = "vertical";
    } else {
        lineType = "diagonal";
    }

    console.log(`Line segment classified as: ${lineType}`);

    const midX = (baseSegment.start.x + baseSegment.end.x) / 2;
    const midY = (baseSegment.start.y + baseSegment.end.y) / 2;

    const angleRad = Math.atan2(dy, dx);

    // Offset icon perpendicular
    const offset = 16;
    let offsetX = Math.cos(angleRad - Math.PI / 2) * offset;
    let offsetY = Math.sin(angleRad - Math.PI / 2) * offset;

    // Flip direction if icon below the midpoint
    const newY = midY + offsetY;
    if (newY > midY) {
        offsetX = -offsetX;
        offsetY = -offsetY;
    }

    const rotationDeg = (angleRad * 180) / Math.PI;

    const angleDeg = (angleRad * 180) / Math.PI;

    let tiltDirection: "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top";
    let x = midX + (offsetX - 5);
    let y = midY + offsetY;
    if (angleDeg >= -45 && angleDeg <= 45) {
        y -= 5
        x += 5
        tiltDirection = "left-to-right";
    } else if (angleDeg > 45 && angleDeg < 135) {
        x += 7;
        y -= 10;
        tiltDirection = "top-to-bottom";
    } else if (angleDeg < -45 && angleDeg > -135) {
        tiltDirection = "bottom-to-top";
    } else {
        tiltDirection = "right-to-left";
    }

    console.log(`The line is tilted: ${tiltDirection}`);

    return {
        x,
        y,
        rotation: rotationDeg,
    };
};



export const svgUrlToPngBytes = async (svgUrl: string, fillColor: string, width = 100, height = 100): Promise<Uint8Array> => {
    const svgText = await fetch(svgUrl).then(res => res.text());
    const coloredSvg = svgText.replace(/fill="[^"]*"/g, `fill="${fillColor}"`);


    return new Promise((resolve) => {
        const img = new Image();
        const blob = new Blob([coloredSvg], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx?.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
                    reader.readAsArrayBuffer(blob);
                }
            }, "image/png");
        };

        img.src = url;
    });
};

function getBestSegment(points: { x: number | null; y: number | null }[]) {
    if (points.length < 2) return null;

    // Extract continuous segments separated by null points
    const segments: { start: { x: number; y: number }, end: { x: number; y: number } }[] = [];
    let segmentStart = 0;

    for (let i = 1; i < points.length; i++) {
        if (points[i].x == null || points[i].y == null) {
            if (i - 1 > segmentStart) {
                for (let j = segmentStart; j < i - 1; j++) {
                    segments.push({ start: points[j] as { x: number; y: number }, end: points[j + 1] as { x: number; y: number } });
                }
            }
            segmentStart = i + 1;
        }
    }
    if (segmentStart < points.length - 1) {
        for (let j = segmentStart; j < points.length - 1; j++) {
            segments.push({ start: points[j] as { x: number; y: number }, end: points[j + 1] as { x: number; y: number } });
        }
    }

    if (segments.length === 0) return null;

    // Calculate centroid of all valid points
    const validPoints = points.filter(p => p.x != null && p.y != null) as { x: number; y: number }[];
    const centroid = validPoints.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    centroid.x /= validPoints.length;
    centroid.y /= validPoints.length;

    // Find max length
    let maxLen = 0;
    segments.forEach(seg => {
        const dx = seg.end.x - seg.start.x;
        const dy = seg.end.y - seg.start.y;
        const len = Math.hypot(dx, dy);
        if (len > maxLen) maxLen = len;
    });

    // Get all segments within 90% of max length
    const nearMax = segments.filter(seg => {
        const dx = seg.end.x - seg.start.x;
        const dy = seg.end.y - seg.start.y;
        return Math.hypot(dx, dy) >= 0.9 * maxLen;
    });

    // Pick the segment whose midpoint is closest to centroid
    let bestSeg = nearMax[0];
    let bestDist = Infinity;
    for (const seg of nearMax) {
        const midX = (seg.start.x + seg.end.x) / 2;
        const midY = (seg.start.y + seg.end.y) / 2;
        const dist = Math.hypot(midX - centroid.x, midY - centroid.y);
        if (dist < bestDist) {
            bestDist = dist;
            bestSeg = seg;
        }
    }

    return bestSeg;
}


export const donwloadKeyPointForStroke = async (pdfUrl: string, stroke: Stroke[], scale = 1) => {
    try {
        const pdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        const svgIconUrl = "https://jb-glass-uat-apis.jarvistechnolabs.com/pdf-pin-design/shape-icon.svg";
        const iconPngBytes = await svgUrlToPngBytes(svgIconUrl, "#000", 60, 60);
        const iconImage = await pdfDoc.embedPng(iconPngBytes);
        const iconDims = iconImage.scale(0.4); // scale image if needed

        const { width: pageWidth, height: pageHeight } = pages[stroke[0].pageNumber - 1].getSize();
        const rotation = pages[stroke[0].pageNumber - 1].getRotation().angle;


        const absPoints = stroke[0].points
            .filter(pt => pt.x != null && pt.y != null)
            .map(pt => getRotatedCoordinates(pt.x, pt.y, pageWidth, pageHeight, rotation));


        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        absPoints.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        });

        // Add padding
        const padding = 60;
        minX -= padding;
        minY -= padding;
        maxX += padding;
        maxY += padding;

        let aspectW = rotation === 0 ? 6 : 4;
        let aspectH = rotation === 0 ? 4 : 6;
        // Expand to 4:3 crop and center
        const crop = expandToAspectRatio(minX, minY, maxX, maxY, aspectW, aspectH, pageWidth, pageHeight);

        // ---- Strokes ----
        const strokesByPage = stroke.reduce<Record<number, Stroke[]>>((acc, s) => {
            const pageNum = s.pageNumber - 1;
            (acc[pageNum] ||= []).push(s);
            return acc;
        }, {});

        const strokeOpacity = 0.08; // lower to make intersections lighter
        const strokeSegments = 1; // reduce from 100 to avoid overdraw

        for (const [pageNumStr, pageStrokes] of Object.entries(strokesByPage)) {
            const page = pages[parseInt(pageNumStr)];
            if (!page) continue;

            const { width, height } = page.getSize();
            const rotation = page.getRotation().angle;

            // Convert hex like "#555555" to rgb() 0–1 range for pdf-lib
            function hexToRgb(hex: string) {
                const sanitized = hex.replace('#', '');
                const bigint = parseInt(sanitized, 16);
                const r = (bigint >> 16) & 255;
                const g = (bigint >> 8) & 255;
                const b = bigint & 255;
                return rgb(r / 255, g / 255, b / 255);
            }

            pageStrokes.forEach((s) => {
                const absPoints = s.points.map((pt) =>
                    pt.x == null || pt.y == null
                        ? null
                        : getRotatedCoordinates(pt.x, pt.y, width, height, rotation)
                );

                const strokeWidth = s.width * scale;
                const pdfStrokeColor = hexToRgb('#cccccc'); // or strokeColor if it's a hex
                const jointRadius = (strokeWidth * 0.8) / 2;

                // === Draw stroke lines ===
                for (let i = 0; i < absPoints.length - 1; i++) {
                    const p1 = absPoints[i];
                    const p2 = absPoints[i + 1];
                    if (!p1 || !p2) continue;

                    const segments = interpolateLinePoints(p1, p2, strokeSegments);

                    for (let j = 0; j < segments.length - 1; j++) {
                        page.drawLine({
                            start: segments[j],
                            end: segments[j + 1],
                            color: pdfStrokeColor,
                            opacity: strokeOpacity ?? 1,
                            thickness: strokeWidth || 1,
                            lineCap: LineCapStyle.Projecting,
                        });
                    }
                }

                // === ICON PLACEMENT 
                if (s.points.length >= 2) {
                    let maxLen = 0;

                    // Usage inside your forEach stroke:
                    const bestSeg = getBestSegment(s.points);
                    if (bestSeg) {
                        const startAbs = getRotatedCoordinates(bestSeg.start.x, bestSeg.start.y, width, height, rotation);
                        const endAbs = getRotatedCoordinates(bestSeg.end.x, bestSeg.end.y, width, height, rotation);

                        const midX = (startAbs.x + endAbs.x) / 2;
                        const midY = (startAbs.y + endAbs.y) / 2;

                        const dx = endAbs.x - startAbs.x;
                        const dy = endAbs.y - startAbs.y;

                        const perpX = -dy;
                        const perpY = dx;
                        const lenPerp = Math.hypot(perpX, perpY);
                        const unitPerpX = perpX / lenPerp;
                        const unitPerpY = perpY / lenPerp;

                        const iconOffset = rotation === 0 ? 24 : 0;
                        const iconX = midX + unitPerpX * iconOffset;
                        const iconY = midY + unitPerpY * iconOffset;

                        page.drawImage(iconImage, {
                            x: iconX - iconDims.width / 2,
                            y: iconY - iconDims.height / 2,
                            width: iconDims.width,
                            height: iconDims.height,
                            rotate: degrees(rotation),
                        });
                    }

                }
            });
        }


        const newPdf = await PDFDocument.create();
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [stroke[0].pageNumber - 1]);
        copiedPage.setCropBox(crop.minX, crop.minY, crop.width, crop.height);
        newPdf.addPage(copiedPage);
        const modifiedBytes = await newPdf.save();
        const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
        const originalFilename = pdfUrl.split('/').pop() || 'document';
        const filename = originalFilename.replace('.pdf', '-with-annotations.pdf');
        saveAs(blob, filename);
    } catch (error) {
        console.log(error);
    }
}


const perpendicularDistance = (point: { x: number; y: number }, start: { x: number; y: number }, end: { x: number; y: number }): number => {
    const A = point.x - start.x;
    const B = point.y - start.y;
    const C = end.x - start.x;
    const D = end.y - start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    if (lenSq === 0) return Math.sqrt(A * A + B * B);

    const param = dot / lenSq;
    let xx, yy;

    if (param < 0) {
        xx = start.x;
        yy = start.y;
    } else if (param > 1) {
        xx = end.x;
        yy = end.y;
    } else {
        xx = start.x + param * C;
        yy = start.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
};

// Douglas-Peucker algorithm to simplify a path
export const simplifyPath = (points: { x: number; y: number }[], tolerance: number = 5): { x: number; y: number }[] => {
    if (points.length <= 2) return points;

    const douglasPeucker = (points: { x: number; y: number }[], epsilon: number): { x: number; y: number }[] => {
        if (points.length <= 2) return points;

        let maxDistance = 0;
        let maxIndex = 0;
        const start = points[0];
        const end = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i++) {
            const distance = perpendicularDistance(points[i], start, end);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }

        if (maxDistance > epsilon) {
            const leftSegment = douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
            const rightSegment = douglasPeucker(points.slice(maxIndex), epsilon);
            return [...leftSegment.slice(0, -1), ...rightSegment];
        } else {
            return [start, end];
        }
    };

    return douglasPeucker(points, tolerance);
};



export function checkStrokeOverlapAndConfirm(
    stroke: { pageNumber: number; points: { x: number; y: number }[] },
    existingStrokes: { pageNumber: number; points: { x: number; y: number }[]; id: string; isDraft?: boolean }[],
    overlapThreshold = 0
) {
    if (!stroke?.points?.length) return [];

    const threshold = Math.max(0, overlapThreshold);

    const samePageStrokes = existingStrokes.filter(
        s => s.pageNumber === stroke.pageNumber && !s.isDraft && s.points?.length
    );

    const getBBox = (pts: { x: number; y: number }[]) => {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return { minX, minY, maxX, maxY };
    };

    const pointSegmentDistance = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
        const dx = x2 - x1;
        const dy = y2 - y1;
        if (dx === 0 && dy === 0) return Math.hypot(px - x1, py - y1);
        const t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
        const clamped = Math.max(0, Math.min(1, t));
        const cx = x1 + clamped * dx;
        const cy = y1 + clamped * dy;
        return Math.hypot(px - cx, py - cy);
    };

    const polylineMinDistance = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => {
        let minD = Infinity;
        for (let i = 0; i < a.length - 1; i++) {
            const a1 = a[i], a2 = a[i + 1];
            for (let j = 0; j < b.length - 1; j++) {
                const b1 = b[j], b2 = b[j + 1];
                const d1 = pointSegmentDistance(a1.x, a1.y, b1.x, b1.y, b2.x, b2.y);
                const d2 = pointSegmentDistance(a2.x, a2.y, b1.x, b1.y, b2.x, b2.y);
                const d3 = pointSegmentDistance(b1.x, b1.y, a1.x, a1.y, a2.x, a2.y);
                const d4 = pointSegmentDistance(b2.x, b2.y, a1.x, a1.y, a2.x, a2.y);
                const d = Math.min(d1, d2, d3, d4);
                if (d < minD) minD = d;
                if (minD === 0) return 0;
            }
        }
        if (!Number.isFinite(minD)) {
            for (const p1 of a) {
                for (const p2 of b) {
                    const d = Math.hypot(p1.x - p2.x, p1.y - p2.y);
                    if (d < minD) minD = d;
                }
            }
        }
        return minD;
    };

    const strokeBox = getBBox(stroke.points);
    const overlappingStrokes = [];

    for (const existing of samePageStrokes) {
        const box = getBBox(existing.points);
        const boxSeparated =
            strokeBox.maxX + threshold < box.minX ||
            box.maxX + threshold < strokeBox.minX ||
            strokeBox.maxY + threshold < box.minY ||
            box.maxY + threshold < strokeBox.minY;

        if (boxSeparated) continue;

        const dist = polylineMinDistance(stroke.points, existing.points);
        if (dist <= threshold) {
            overlappingStrokes.push(existing);
        }
    }

    if (overlappingStrokes.length === 0) return [];

    const shouldMerge = window.confirm(
        `This stroke overlaps with ${overlappingStrokes.length} existing stroke(s). Do you want to merge them?`
    );

    return overlappingStrokes.map(targetStroke => ({ targetStroke, shouldMerge }));
}



function rgbaToPdfLibColor(rgba) {
    const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
    if (!match) return rgb(0, 0, 0); // default black
    const r = parseInt(match[1]) / 255;
    const g = parseInt(match[2]) / 255;
    const b = parseInt(match[3]) / 255;
    const a = match[4] !== undefined ? parseFloat(match[4]) : 1;
    return { color: rgb(r, g, b), alpha: a };
}

// Usage:
