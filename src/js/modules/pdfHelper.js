/**
 * PDF Helper Module
 * Utility functions for PDF manipulation using pdf-lib
 */

class PDFHelper {
  /**
   * Load PDF from bytes
   */
  static async loadPDF(bytes) {
    const { PDFDocument } = window.PDFLib;
    try {
      return await PDFDocument.load(bytes);
    } catch (error) {
      throw new Error(`Failed to load PDF: ${error.message}`);
    }
  }

  /**
   * Create empty PDF
   */
  static async createEmptyPDF() {
    const { PDFDocument } = window.PDFLib;
    return await PDFDocument.create();
  }

  /**
   * Save PDF to bytes
   */
  static async savePDF(pdfDoc) {
    try {
      return await pdfDoc.save();
    } catch (error) {
      throw new Error(`Failed to save PDF: ${error.message}`);
    }
  }

  /**
   * Get page count
   */
  static getPageCount(pdfDoc) {
    return pdfDoc.getPageCount();
  }

  /**
   * Get all page indices
   */
  static getAllPageIndices(pdfDoc) {
    return pdfDoc.getPageIndices();
  }

  /**
   * Extract specific pages as new PDF
   */
  static async extractPages(pdfDoc, pageIndices) {
    const { PDFDocument } = window.PDFLib;
    const newPdf = await PDFDocument.create();
    
    try {
      const copiedPages = await newPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach(page => newPdf.addPage(page));
      return newPdf;
    } catch (error) {
      throw new Error(`Failed to extract pages: ${error.message}`);
    }
  }

  /**
   * Parse page range string (e.g., "1-5,7,10-15")
   */
  static parsePageRange(rangeString, totalPages) {
    const indices = [];
    const parts = rangeString.split(',').map(p => p.trim());

    for (const part of parts) {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(p => parseInt(p.trim()));
        
        if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
          throw new Error(`Invalid range: ${part}`);
        }

        for (let i = start - 1; i < end; i++) {
          if (!indices.includes(i)) {
            indices.push(i);
          }
        }
      } else {
        const pageNum = parseInt(part);
        if (isNaN(pageNum) || pageNum < 1 || pageNum > totalPages) {
          throw new Error(`Invalid page number: ${part}`);
        }
        if (!indices.includes(pageNum - 1)) {
          indices.push(pageNum - 1);
        }
      }
    }

    return indices;
  }

  /**
   * Rotate page(s)
   */
  static rotatePage(pdfDoc, pageIndex, deg) {
    const { degrees } = window.PDFLib;
    const page = pdfDoc.getPage(pageIndex);
    const rotation = page.getRotation();
    const normalizedDeg = ((deg % 360) + 360) % 360;
    const newAngle = (rotation.angle + normalizedDeg) % 360;
    page.setRotation(degrees(newAngle));
  }

  /**
   * Delete page(s)
   */
  static deletePages(pdfDoc, pageIndices) {
    const sortedIndices = pageIndices.sort((a, b) => b - a);
    for (const index of sortedIndices) {
      pdfDoc.removePage(index);
    }
  }

  /**
   * Get PDF metadata
   */
  static getMetadata(pdfDoc) {
    return {
      title: pdfDoc.getTitle() || '',
      author: pdfDoc.getAuthor() || '',
      subject: pdfDoc.getSubject() || '',
      keywords: pdfDoc.getKeywords() || '',
      creator: pdfDoc.getCreator() || '',
      producer: pdfDoc.getProducer() || '',
      creationDate: pdfDoc.getCreationDate(),
      modificationDate: pdfDoc.getModificationDate(),
      pageCount: pdfDoc.getPageCount()
    };
  }

  /**
   * Set PDF metadata
   */
  static setMetadata(pdfDoc, metadata) {
    if (metadata.title) pdfDoc.setTitle(metadata.title);
    if (metadata.author) pdfDoc.setAuthor(metadata.author);
    if (metadata.subject) pdfDoc.setSubject(metadata.subject);
    if (metadata.keywords) pdfDoc.setKeywords(metadata.keywords);
    if (metadata.creator) pdfDoc.setCreator(metadata.creator);
    if (metadata.producer) pdfDoc.setProducer(metadata.producer);
  }

  /**
   * Encrypt PDF
   */
  static encryptPDF(pdfDoc, userPassword = '', ownerPassword = '', permissions = {}) {
    try {
      pdfDoc.encrypt({
        userPassword,
        ownerPassword: ownerPassword || userPassword,
        permissions: {
          printing: permissions.printing !== false ? 'highResolution' : 'none',
          modifying: permissions.modifying !== false,
          copying: permissions.copying !== false,
          annotating: permissions.annotating !== false,
          fillingForms: permissions.fillingForms !== false,
          contentAccessibility: permissions.contentAccessibility !== false,
          documentAssembly: permissions.documentAssembly !== false
        }
      });
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Register font (if needed)
   */
  static async registerFont(pdfDoc, fontName, fontBytes) {
    try {
      const { PDFDocument } = window.PDFLib;
      // This would require the font data
      // Implementation depends on font handling needs
    } catch (error) {
      console.warn(`Failed to register font: ${error.message}`);
    }
  }

  /**
   * Copy single page
   */
  static async copyPage(sourcePdf, destinationPdf, pageIndex) {
    try {
      const [copiedPage] = await destinationPdf.copyPages(sourcePdf, [pageIndex]);
      return copiedPage;
    } catch (error) {
      throw new Error(`Failed to copy page: ${error.message}`);
    }
  }

  /**
   * Get page dimensions
   */
  static getPageDimensions(page) {
    return {
      width: page.getWidth(),
      height: page.getHeight()
    };
  }

  /**
   * Check if PDF is encrypted
   */
  static isEncrypted(pdfDoc) {
    return pdfDoc.isEncrypted ? pdfDoc.isEncrypted : false;
  }
}

// PDFHelper is a global class — no export needed
