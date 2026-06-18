import { PDFDocument } from 'pdf-lib';
export async function getPageGeometry(pdfBytes: Uint8Array) {
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const first = doc.getPages()[0];
  return { pageCount: doc.getPageCount(), size: first ? first.getSize() : { width: 0, height: 0 } };
}
