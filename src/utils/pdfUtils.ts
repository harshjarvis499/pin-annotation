import { PDFDocument, rgb, degrees } from 'pdf-lib';
import { saveAs } from 'file-saver';
import { Pin } from '../contexts/PDFContext';

// Simple pin icon SVG path data
const PIN_PATH = 'M12 0C7.6 0 4 3.6 4 8c0 5.3 8 16 8 16s8-10.7 8-16c0-4.4-3.6-8-8-8zm0 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z';

// Pin dimensions for centering calculations
const PIN_WIDTH = 24;  // Width of the SVG viewbox
const PIN_HEIGHT = 24; // Height of the SVG viewbox


function adjustCoordinatesForRotation(
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number
): { x: number, y: number } {
    // Convert degrees to radians
    const rad = (rotation * Math.PI) / 180;

    console.log("rad", rad);

    // Calculate the center of the page
    const centerX = width / 2;
    const centerY = height / 2;

    // Translate point to origin
    const transX = x - centerX;
    const transY = y - centerY;

    console.log("height", height);

    // Rotate point
    let rotX = transX * Math.cos(rad) - transY * Math.sin(rad);
    let rotY = transX * Math.sin(rad) + transY * Math.cos(rad);

    console.log("rotY", rotY);
    console.log("rotX", rotX);

    // Adjust Y if rotY is too far down
    // if (rotY > 150) {
    //     let adjustmentPercent = 0.054 + ((rotY - 150) / 3000); // Linearly increase
    //     adjustmentPercent = Math.min(adjustmentPercent, 0.09); // Cap at 10%
    //     const adjustment = height * adjustmentPercent;
    //     console.log(`Adjusting Y down by ${adjustmentPercent * 100}% (${adjustment}px)`);
    //     rotY += adjustment;
    // }
    // // Adjust Y if rotY is too far up (negative)
    // else if (rotY < -10) {
    //     let adjustmentPercent = 0.054 + ((-rotY - 150) / 3000); // Linearly increase
    //     adjustmentPercent = Math.min(adjustmentPercent, 0.1); // Cap at 10%
    //     const adjustment = height * adjustmentPercent;
    //     console.log(`Adjusting Y down (from top) by ${adjustmentPercent * 100}% (${adjustment}px)`);
    //     rotY -= adjustment; // pushing it downward
    // }

    if (rotY < -100) {
        let adjustmentPercentForY = 0.055 + ((-rotY - 150) / 3000); // Linearly increase
        adjustmentPercentForY = Math.min(adjustmentPercentForY, 0.1); // Cap at 10%
        const adjustment = height * adjustmentPercentForY;
        console.log(`Adjusting Y down (from top) by ${adjustmentPercentForY * 100}% (${adjustment}px)`);
        rotY -= adjustment; // pushing it downward

    } else {
        let adjustmentPercentForY = 0.052 + ((-rotY - 150) / 3000); // Linearly increase
        adjustmentPercentForY = Math.min(adjustmentPercentForY, 0.1); // Cap at 10%
        const adjustment = height * adjustmentPercentForY;
        console.log(`Adjusting Y down (from top) by ${adjustmentPercentForY * 100}% (${adjustment}px)`);
        rotY -= adjustment; // pushing it downward
    }

    // Adjust X if rotX is too far left
    if (rotX < -300 && rotX < -250) {
        let adjustmentPercent = (rotX < -350 ? 0.08 : 0.07) + ((-rotX - 100) / 3000); // increase with how far left
        adjustmentPercent = Math.min(adjustmentPercent, (rotX < -350 ? 0.122 : 0.114)); // Cap at 10%
        const adjustment = width * adjustmentPercent;
        console.log(`Adjusting X right by test ${adjustmentPercent * 100}% (${adjustment}px)`);
        rotX += adjustment; // pushing it to the right
    }
    else if (rotX < -250 && rotX < -200) {
        let adjustmentPercent = 0.1 + ((-rotX - 100) / 3000); // increase with how far left
        adjustmentPercent = Math.min(adjustmentPercent, 0.118); // Cap at 10%
        const adjustment = width * adjustmentPercent;
        console.log(`Adjusting X right by test ${adjustmentPercent * 100}% (${adjustment}px)`);
        rotX += adjustment; // pushing it to the right
    }
    else if (rotX < -150 && rotX < -100) {

        let adjustmentPercent = 0.05 + ((-rotX - 100) / 3000); // increase with how far left
        adjustmentPercent = Math.min(adjustmentPercent, 0.1); // Cap at 10%
        const adjustment = width * adjustmentPercent;
        console.log(`Adjusting X right by ${adjustmentPercent * 100}% (${adjustment}px)`);
        rotX += adjustment; // pushing it to the right
    }
    else if ((rotX < -100 || rotX > -100) && rotX > -150 && rotX < -1) {
        let adjustmentPercent = 0.04 + ((-rotX - 100) / 3000); // increase with how far left
        adjustmentPercent = Math.min(adjustmentPercent, 0.1); // Cap at 10%
        const adjustment = width * adjustmentPercent;
        console.log(`Adjusting X right by ${adjustmentPercent * 100}% (${adjustment}px)`);
        rotX += adjustment; // pushing it to the right
    } else {
        let adjustmentPercent = 0.029 + ((-rotX - 100) / 3000); // increase with how far left
        adjustmentPercent = Math.min(adjustmentPercent, 0.029); // Cap at 10%
        const adjustment = width * adjustmentPercent;
        console.log(`Adjusting X right by ${adjustmentPercent * 100}% (${adjustment}px)`);
        rotX += adjustment; // pushing it to the right
    }



    // Translate back
    return {
        x: rotX + centerX,
        y: rotY + centerY
    };
}



export async function downloadPDFWithPins(pdfUrl: string, pins: Pin[], scale: number = 1) {
    try {
        const pdfBytes = await fetch(pdfUrl).then(res => res.arrayBuffer());
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = pdfDoc.getPages();

        const pinsByPage = pins.reduce((acc, pin) => {
            const pageNum = pin.pageNumber - 1;
            if (!acc[pageNum]) {
                acc[pageNum] = [];
            }
            acc[pageNum].push(pin);
            return acc;
        }, {} as { [key: number]: Pin[] });

        for (const [pageNum, pagePins] of Object.entries(pinsByPage)) {
            const page = pages[parseInt(pageNum)];
            if (!page) continue;

            const { width, height } = page.getSize();
            const rotation = page.getRotation().angle;

            for (const pin of pagePins) {
                try {
                    // Convert percentage to actual coordinates
                    let x = (pin.x / 100) * width;
                    let y = (pin.y / 100) * height;

                    // Adjust for PDF coordinate system (origin at bottom-left)
                    y = height - y;

                    // Center the pin on the click point
                    const pinScale = 0.8 * scale;
                    const scaledPinWidth = PIN_WIDTH * pinScale / 2;  // Divide by 2 for better centering
                    const scaledPinHeight = PIN_HEIGHT * pinScale / 2;

                    x = x - scaledPinWidth;
                    y = y + scaledPinHeight; // Move further down

                    // Apply rotation if needed
                    if (rotation !== 0) {
                        const adjustedCoords = adjustCoordinatesForRotation(x, y, width, height, rotation);
                        x = adjustedCoords.x;
                        y = adjustedCoords.y;
                    }

                    const color = hexToRgb(pin.color);
                    const rgbColor = rgb(color.r / 255, color.g / 255, color.b / 255);

                    // Draw the pin with precise positioning
                    page.drawSvgPath(PIN_PATH, {
                        x,
                        y,
                        scale: pinScale,
                        color: rgbColor,
                        borderColor: rgb(0, 0, 0),
                        borderWidth: 1,
                        rotate: degrees(rotation),
                    });

                } catch (pinError) {
                    console.error('Error drawing individual pin:', pinError);
                }
            }
        }

        const modifiedPdfBytes = await pdfDoc.save();
        const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });

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