import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
export async function applyTextWatermark(pdfDoc: PDFDocument, text: string) {
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  pdfDoc.getPages().forEach(page => {
    const { width, height } = page.getSize();
    page.drawText(text, { x: width / 4, y: height / 2, size: 48, font, color: rgb(0.5, 0.5, 0.5), opacity: 0.2, rotate: degrees(45) });
  });
}
