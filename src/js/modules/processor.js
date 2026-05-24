/**
 * PDF Processor Module
 * Handles advanced PDF operations (compression, rotation, metadata, etc.)
 */

import PDFHelper from './pdfHelper.js';
import FileHandler from './fileHandler.js';

class PDFProcessor {
  /**
   * Rotate pages
   */
  static async rotatePages(file, pageIndices, degrees, options = {}) {
    if (!Number.isInteger(degrees) || ![90, 180, 270].includes(degrees % 360)) {
      throw new Error('Degrees must be 90, 180, or 270');
    }

    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);

      for (const index of pageIndices) {
        PDFHelper.rotatePage(pdf, index, degrees);
      }

      const resultBytes = await PDFHelper.savePDF(pdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Rotation failed: ${error.message}`);
    }
  }

  /**
   * Delete pages
   */
  static async deletePages(file, pageIndices, options = {}) {
    if (pageIndices.length === 0) {
      throw new Error('No pages selected for deletion');
    }

    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);
      const pageCount = PDFHelper.getPageCount(pdf);

      if (pageIndices.length >= pageCount) {
        throw new Error('Cannot delete all pages');
      }

      PDFHelper.deletePages(pdf, pageIndices);

      const resultBytes = await PDFHelper.savePDF(pdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Delete pages failed: ${error.message}`);
    }
  }

  /**
   * Extract pages (non-destructive)
   */
  static async extractPages(file, pageIndices, options = {}) {
    if (pageIndices.length === 0) {
      throw new Error('No pages selected for extraction');
    }

    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);

      const resultPdf = await PDFHelper.extractPages(pdf, pageIndices);
      const resultBytes = await PDFHelper.savePDF(resultPdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Extract pages failed: ${error.message}`);
    }
  }

  /**
   * Get PDF metadata
   */
  static async getMetadata(file) {
    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);
      return PDFHelper.getMetadata(pdf);
    } catch (error) {
      throw new Error(`Failed to get metadata: ${error.message}`);
    }
  }

  /**
   * Set PDF metadata
   */
  static async setMetadata(file, metadata, options = {}) {
    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);

      PDFHelper.setMetadata(pdf, metadata);

      const resultBytes = await PDFHelper.savePDF(pdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Failed to set metadata: ${error.message}`);
    }
  }

  /**
   * Remove metadata (privacy)
   */
  static async removeMetadata(file, options = {}) {
    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);

      PDFHelper.setMetadata(pdf, {
        title: '',
        author: '',
        subject: '',
        keywords: '',
        creator: '',
        producer: 'PDF Toolkit'
      });

      const resultBytes = await PDFHelper.savePDF(pdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Failed to remove metadata: ${error.message}`);
    }
  }

  /**
   * Compress PDF (basic - reduce image quality)
   */
  static async compressPDF(file, compressionLevel = 'medium', options = {}) {
    // Note: pdf-lib has limited built-in compression
    // This is a placeholder for future enhancement
    
    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);

      // Current implementation just re-saves
      // For advanced compression, would need additional libraries
      const resultBytes = await PDFHelper.savePDF(pdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Compression failed: ${error.message}`);
    }
  }

  /**
   * Add text to all pages (watermark)
   */
  static async addWatermark(file, text, options = {}) {
    const {
      opacity = 0.3,
      rotation = -45,
      fontSize = 60,
      color = [200, 200, 200]
    } = options;

    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);
      const { rgb } = window.PDFLib;

      const pageCount = PDFHelper.getPageCount(pdf);

      for (let i = 0; i < pageCount; i++) {
        const page = pdf.getPage(i);
        const { width, height } = page.getSize();

        page.drawText(text, {
          x: width / 2 - (text.length * fontSize) / 4,
          y: height / 2,
          size: fontSize,
          color: rgb(color[0] / 255, color[1] / 255, color[2] / 255),
          opacity: opacity,
          rotate: rotation
        });
      }

      const resultBytes = await PDFHelper.savePDF(pdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Watermark failed: ${error.message}`);
    }
  }

  /**
   * Add page numbers
   */
  static async addPageNumbers(file, options = {}) {
    const {
      format = '{page}', // {page} or {page}/{total}
      position = 'bottom-right', // bottom-right, bottom-center, bottom-left, etc.
      fontSize = 12,
      color = [0, 0, 0],
      margin = 20
    } = options;

    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);
      const { rgb } = window.PDFLib;

      const pageCount = PDFHelper.getPageCount(pdf);

      for (let i = 0; i < pageCount; i++) {
        const page = pdf.getPage(i);
        const { width, height } = page.getSize();

        const pageNum = i + 1;
        const text = format
          .replace('{page}', pageNum)
          .replace('{total}', pageCount);

        let x, y;
        
        // Calculate position
        if (position.includes('bottom')) {
          y = margin;
        } else if (position.includes('top')) {
          y = height - margin - fontSize;
        } else {
          y = height / 2;
        }

        if (position.includes('right')) {
          x = width - margin - (text.length * fontSize) / 3;
        } else if (position.includes('left')) {
          x = margin;
        } else {
          x = width / 2 - (text.length * fontSize) / 6;
        }

        page.drawText(text, {
          x,
          y,
          size: fontSize,
          color: rgb(color[0] / 255, color[1] / 255, color[2] / 255)
        });
      }

      const resultBytes = await PDFHelper.savePDF(pdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Add page numbers failed: ${error.message}`);
    }
  }

  /**
   * Duplicate page(s)
   */
  static async duplicatePages(file, pageIndices, options = {}) {
    if (pageIndices.length === 0) {
      throw new Error('No pages selected for duplication');
    }

    try {
      const bytes = await FileHandler.readAsArrayBuffer(file);
      const pdf = await PDFHelper.loadPDF(bytes);

      // Sort indices in reverse to insert at correct positions
      const sortedIndices = pageIndices.sort((a, b) => b - a);

      for (const index of sortedIndices) {
        const page = pdf.getPage(index);
        const [copiedPage] = await pdf.copyPages(pdf, [index]);
        pdf.insertPage(index + 1, copiedPage);
      }

      const resultBytes = await PDFHelper.savePDF(pdf);
      return resultBytes;
    } catch (error) {
      throw new Error(`Duplicate pages failed: ${error.message}`);
    }
  }
}

export default PDFProcessor;
