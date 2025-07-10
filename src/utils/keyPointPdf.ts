import { PDFDocument, rgb } from 'pdf-lib';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';
import { Pin } from '../contexts/PDFContext'; // Import Pin interface

export async function downloadKeyPointPDF(
    element: HTMLElement,
    pin: Pin, // Accept a Pin object
    filename: string = 'key-point.pdf'
) {
    try {
        // Get the actual dimensions of the element (PDF page)
        const rect = element.getBoundingClientRect();
        const pageWidth = rect.width;
        const pageHeight = rect.height;

        // Calculate pin position in pixels
        const pinX_px = (pin.x / 100) * pageWidth;
        const pinY_px = (pin.y / 100) * pageHeight;

        // Define capture area dimensions (e.g., 600x600 pixels)
        const captureWidth = 150;
        const captureHeight = 150;

        // Calculate top-left corner of the capture area
        // Center the capture area around the pin
        let cropX = pinX_px - (captureWidth / 2);
        let cropY = pinY_px - (captureHeight / 2);

        // Ensure the capture area stays within the page boundaries
        cropX = Math.max(0, cropX);
        cropY = Math.max(0, cropY);
        if (cropX + captureWidth > pageWidth) {
            cropX = pageWidth - captureWidth;
        }
        if (cropY + captureHeight > pageHeight) {
            cropY = pageHeight - captureHeight;
        }

        // Temporarily hide all pin titles
        const pinTitles = element.querySelectorAll('.pin span');
        pinTitles.forEach(title => {
            (title as HTMLElement).style.display = 'none';
        });

        // Capture the element as an image, focusing on the area around the pin
        const canvas = await html2canvas(element, {
            x: cropX,
            y: cropY,
            width: captureWidth,
            height: captureHeight,
            scale: 4, // Increased scale for better quality
            useCORS: true // Enable CORS for images loaded from other origins
        });

        // Restore pin titles visibility
        pinTitles.forEach(title => {
            (title as HTMLElement).style.display = '';
        });

        const imgData = canvas.toDataURL('image/png');

        // Create a new PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage();

        // Embed the image
        const pngImage = await pdfDoc.embedPng(imgData);
        const { width, height } = page.getSize();

        // Calculate image dimensions to fit PDF page while maintaining aspect ratio
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const ratio = Math.min(width / imgWidth, height / imgHeight);
        const scaledWidth = imgWidth * ratio;
        const scaledHeight = imgHeight * ratio;

        page.drawImage(pngImage, {
            x: (width - scaledWidth) / 2,
            y: (height - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
        });

        // Add the pin title to the PDF
        page.drawText(pin.title, {
            x: 50,
            y: height - 50,
            font: await pdfDoc.embedFont('Helvetica-Bold'),
            size: 24,
            color: rgb(0, 0, 0),
        });

        // Save the PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        saveAs(blob, filename);

    } catch (error) {
        console.error('Error generating key point PDF:', error);
        throw error;
    }
}

export async function downloadCombinedKeyPointsPDF(
    element: HTMLElement,
    pins: Pin[],
    filename: string = 'combined-key-points.pdf'
) {
    try {
        const pdfDoc = await PDFDocument.create();

        // Temporarily hide all pin titles
        const pinTitles = element.querySelectorAll('.pin span');
        pinTitles.forEach(title => {
            (title as HTMLElement).style.display = 'none';
        });

        for (const pin of pins) {
            // Get the actual dimensions of the element (PDF page)
            const rect = element.getBoundingClientRect();
            const pageWidth = rect.width;
            const pageHeight = rect.height;

            // Calculate pin position in pixels
            const pinX_px = (pin.x / 100) * pageWidth;
            const pinY_px = (pin.y / 100) * pageHeight;

            // Define capture area dimensions (e.g., 150x150 pixels)
            const captureWidth = 150;
            const captureHeight = 150;

            // Calculate top-left corner of the capture area
            // Center the capture area around the pin
            let cropX = pinX_px - (captureWidth / 2);
            let cropY = pinY_px - (captureHeight / 2);

            // Ensure the capture area stays within the page boundaries
            cropX = Math.max(0, cropX);
            cropY = Math.max(0, cropY);
            if (cropX + captureWidth > pageWidth) {
                cropX = pageWidth - captureWidth;
            }
            if (cropY + captureHeight > pageHeight) {
                cropY = pageHeight - captureHeight;
            }

            // Capture the element as an image, focusing on the area around the pin
            const canvas = await html2canvas(element, {
                x: cropX,
                y: cropY,
                width: captureWidth,
                height: captureHeight,
                scale: 4, // Increased scale for better quality
                useCORS: true // Enable CORS for images loaded from other origins
            });

            const imgData = canvas.toDataURL('image/png');
            const pngImage = await pdfDoc.embedPng(imgData);

            // Add a new page for each pin
            const page = pdfDoc.addPage();
            const { width, height } = page.getSize();

            // Calculate image dimensions to fit PDF page while maintaining aspect ratio
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            const ratio = Math.min(width / imgWidth, height / imgHeight);
            const scaledWidth = imgWidth * ratio;
            const scaledHeight = imgHeight * ratio;

            // Draw the image
            page.drawImage(pngImage, {
                x: (width - scaledWidth) / 2,
                y: (height - scaledHeight) / 2,
                width: scaledWidth,
                height: scaledHeight,
            });

            // Add the pin title to the PDF
            page.drawText(pin.title, {
                x: 50,
                y: height - 50,
                font: await pdfDoc.embedFont('Helvetica-Bold'),
                size: 24,
                color: rgb(0, 0, 0),
            });
        }

        // Restore pin titles visibility
        pinTitles.forEach(title => {
            (title as HTMLElement).style.display = '';
        });

        // Save the combined PDF
        const pdfBytes = await pdfDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        saveAs(blob, filename);

    } catch (error) {
        console.error('Error generating combined key points PDF:', error);
        throw error;
    }
} 