import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { Pin } from '../contexts/PDFContext';

// Simple pin icon SVG path data
const PIN_PATH = 'M12 0C7.6 0 4 3.6 4 8c0 5.3 8 16 8 16s8-10.7 8-16c0-4.4-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z';

export async function downloadPDFWithPins(pdfUrl: string, pins: Pin[], scale: number = 1) {
    try {
        // Fetch the PDF
        const pdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        // Group pins by page
        const pinsByPage = pins.reduce((acc, pin) => {
            const pageNum = pin.pageNumber - 1; // Convert to 0-based index
            if (!acc[pageNum]) {
                acc[pageNum] = [];
            }
            acc[pageNum].push(pin);
            return acc;
        }, {} as { [key: number]: Pin[] });

        // Add pins to each page
        for (const [pageNum, pagePins] of Object.entries(pinsByPage)) {
            const page = pages[parseInt(pageNum)];
            console.log("PAGE :_ ", page)
            if (!page) continue;

            const { width, height } = page.getSize();

            for (const pin of pagePins) {
                try {
                    // Convert percentage positions to actual coordinates
                    const x = (pin.x / 100) * width;
                    const y = height - ((pin.y / 100) * height); // Flip Y coordinate because PDF coordinates start from bottom-left

                    // Draw pin marker
                    const baseSize = 100; // Increased significantly for larger pins
                    const pinSize = baseSize * (10 / 100); // Convert scale percentage to decimal
                    const color = hexToRgb(pin.color);
                    const rgbColor = rgb(color.r / 255, color.g / 255, color.b / 255);

                    // Draw a filled circle as the pin head
                    // page.drawCircle({
                    //     x: x,
                    //     y: y,
                    //     size: pinSize,
                    //     color: rgbColor,
                    //     opacity: 1,
                    //     borderWidth: 4, // Added border for better visibility
                    //     borderColor: rgb(1, 1, 1), // White border
                    // });

                    page.drawSvgPath(PIN_PATH, {
                        x: x - 10,  // Center of path
                        y: y + 10,  // Bottom tip of path
                        scale: 0.8,
                        color: rgbColor,       // Fill color
                        borderColor: rgb(0, 0, 0),       // Stroke color
                        borderWidth: 1,
                    })



                    // Draw a larger middle circle in white for contrast
                    // page.drawCircle({
                    //     x: x,
                    //     y: y,
                    //     size: pinSize * 0.8, // Increased from 0.6
                    //     color: rgbColor, // White
                    //     opacity: 1,
                    // });

                    // // Draw the inner circle in the original color
                    // page.drawCircle({
                    //     x: x,
                    //     y: y,
                    //     size: pinSize * 0.6, // Increased from 0.3
                    //     color: rgbColor,
                    //     opacity: 1,
                    // });

                } catch (pinError) {
                    console.error('Error drawing individual pin:', pinError);
                    // Continue with other pins even if one fails
                }
            }
        }

        // Save the PDF
        const modifiedPdfBytes = await pdfDoc.save();
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

        // Generate filename
        const originalFilename = pdfUrl.split('/').pop() || 'document';
        const filename = originalFilename.replace('.pdf', '-with-pins.pdf');

        saveAs(blob, filename);
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
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