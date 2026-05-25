/**
 * PDF Splitter Module
 * Handles PDF splitting operations
 */

class PDFSplitter {
  /**
   * Split PDF by page range
   * Returns single PDF with specified pages
   */
  static async splitByRange(file, rangeString, options = {}) {
    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const sourcePdf = await PDFHelper.loadPDF(bytes);
      const pageCount = PDFHelper.getPageCount(sourcePdf);

      const pageIndices = PDFHelper.parsePageRange(rangeString, pageCount);
      const resultPdf = await PDFHelper.extractPages(sourcePdf, pageIndices);

      const resultBytes = await PDFHelper.savePDF(resultPdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Split by range failed: ${error.message}`);
    }
  }

  /**
   * Split PDF into individual pages
   * Returns array of PDFs, one per page
   */
  static async splitIntoPages(file, options = {}) {
    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const sourcePdf = await PDFHelper.loadPDF(bytes);
      const pageCount = PDFHelper.getPageCount(sourcePdf);

      const pdfArray = [];
      let processed = 0;

      for (let i = 0; i < pageCount; i++) {
        const singlePagePdf = await PDFHelper.extractPages(sourcePdf, [i]);
        const singlePageBytes = await PDFHelper.savePDF(singlePagePdf);
        pdfArray.push(singlePageBytes);

        processed++;
        if (options.onProgress) {
          options.onProgress({
            processed,
            total: pageCount,
            percent: Math.round((processed / pageCount) * 100)
          });
        }
      }

      return pdfArray;
    } catch (error) {
      throw new Error(`Split into pages failed: ${error.message}`);
    }
  }

  /**
   * Split PDF by page count
   * e.g., splitByCount(file, 10) creates PDFs with 10 pages each
   */
  static async splitByCount(file, pagesPerFile, options = {}) {
    if (!Number.isInteger(pagesPerFile) || pagesPerFile < 1) {
      throw new Error('Pages per file must be a positive integer');
    }

    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const sourcePdf = await PDFHelper.loadPDF(bytes);
      const pageCount = PDFHelper.getPageCount(sourcePdf);

      const pdfArray = [];
      let processed = 0;

      for (let i = 0; i < pageCount; i += pagesPerFile) {
        const endIndex = Math.min(i + pagesPerFile, pageCount);
        const pageIndices = [];
        
        for (let j = i; j < endIndex; j++) {
          pageIndices.push(j);
        }

        const chunkPdf = await PDFHelper.extractPages(sourcePdf, pageIndices);
        const chunkBytes = await PDFHelper.savePDF(chunkPdf);
        pdfArray.push(chunkBytes);

        processed++;
        if (options.onProgress) {
          options.onProgress({
            processed,
            total: Math.ceil(pageCount / pagesPerFile),
            percent: Math.round((processed / Math.ceil(pageCount / pagesPerFile)) * 100)
          });
        }
      }

      return pdfArray;
    } catch (error) {
      throw new Error(`Split by count failed: ${error.message}`);
    }
  }

  /**
   * Get page count from PDF file
   */
  static async getPageCount(file) {
    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);
      return PDFHelper.getPageCount(pdf);
    } catch (error) {
      throw new Error(`Failed to get page count: ${error.message}`);
    }
  }
}

// PDFSplitter is a global class — no export needed
