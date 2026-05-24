/**
 * PDF Merger Module
 * Handles PDF merging operations
 */

import PDFHelper from './pdfHelper.js';
import FileHandler from './fileHandler.js';

class PDFMerger {
  /**
   * Merge multiple PDF files
   */
  static async mergePDFs(files, options = {}) {
    const {
      compress = false,
      preserveMetadata = false,
      onProgress = null
    } = options;

    if (!files || files.length === 0) {
      throw new Error('No files provided for merging');
    }

    if (files.length === 1) {
      throw new Error('At least 2 PDFs required for merging');
    }

    try {
      const mergedPdf = await PDFHelper.createEmptyPDF();
      let processed = 0;

      for (const file of files) {
        const bytes = await FileHandler.readAsArrayBuffer(file);
        const sourcePdf = await PDFHelper.loadPDF(bytes);
        
        // Copy all pages
        const pageIndices = PDFHelper.getAllPageIndices(sourcePdf);
        const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach(page => mergedPdf.addPage(page));

        processed++;
        if (onProgress) {
          onProgress({
            processed,
            total: files.length,
            percent: Math.round((processed / files.length) * 100)
          });
        }
      }

      // Preserve first file's metadata if requested
      if (preserveMetadata && files.length > 0) {
        const firstBytes = await FileHandler.readAsArrayBuffer(files[0]);
        const firstPdf = await PDFHelper.loadPDF(firstBytes);
        const metadata = PDFHelper.getMetadata(firstPdf);
        
        // Set merged PDF metadata
        PDFHelper.setMetadata(mergedPdf, {
          title: metadata.title ? `${metadata.title} (Merged)` : 'Merged Document',
          author: metadata.author
        });
      }

      const mergedBytes = await PDFHelper.savePDF(mergedPdf);
      return mergedBytes;
    } catch (error) {
      throw new Error(`Merge failed: ${error.message}`);
    }
  }

  /**
   * Merge PDFs with custom ordering
   */
  static async mergeWithOrdering(filesWithOrdering, options = {}) {
    // filesWithOrdering is array of { file, startPage, endPage }
    const mergedPdf = await PDFHelper.createEmptyPDF();
    let processed = 0;

    try {
      for (const item of filesWithOrdering) {
        const bytes = await FileHandler.readAsArrayBuffer(item.file);
        const sourcePdf = await PDFHelper.loadPDF(bytes);

        let pageIndices = [];
        if (item.startPage !== undefined && item.endPage !== undefined) {
          for (let i = item.startPage - 1; i < item.endPage; i++) {
            pageIndices.push(i);
          }
        } else {
          pageIndices = PDFHelper.getAllPageIndices(sourcePdf);
        }

        const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);
        copiedPages.forEach(page => mergedPdf.addPage(page));

        processed++;
        if (options.onProgress) {
          options.onProgress({
            processed,
            total: filesWithOrdering.length,
            percent: Math.round((processed / filesWithOrdering.length) * 100)
          });
        }
      }

      const mergedBytes = await PDFHelper.savePDF(mergedPdf);
      return mergedBytes;
    } catch (error) {
      throw new Error(`Merge with ordering failed: ${error.message}`);
    }
  }
}

export default PDFMerger;
