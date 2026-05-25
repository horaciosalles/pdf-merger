/**
 * File Handler Module
 * Handles file I/O operations, validation, and conversion
 */

class FileHandler {
  /**
   * Validate if file is PDF
   */
  static isValidPDF(file) {
    return file.name && 
           file.name.toLowerCase().endsWith('.pdf') &&
           (file.type === 'application/pdf' || file.type === '');
  }

  /**
   * Validate file size
   */
  static isValidFileSize(file, maxSize = 500 * 1024 * 1024) {
    return file.size <= maxSize;
  }

  /**
   * Validate multiple files
   */
  static validateFiles(files, options = {}) {
    const {
      maxSize = 500 * 1024 * 1024,
      allowDuplicates = false,
      maxFiles = Infinity
    } = options;

    const results = {
      valid: [],
      invalid: [],
      errors: []
    };

    if (files.length > maxFiles) {
      results.errors.push(`Maximum ${maxFiles} files allowed`);
      return results;
    }

    const seenNames = new Set();

    for (const file of files) {
      if (!this.isValidPDF(file)) {
        results.invalid.push({
          file: file.name,
          reason: 'Not a valid PDF file'
        });
        continue;
      }

      if (!this.isValidFileSize(file, maxSize)) {
        results.invalid.push({
          file: file.name,
          reason: `File exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit`
        });
        continue;
      }

      if (!allowDuplicates && seenNames.has(file.name)) {
        results.invalid.push({
          file: file.name,
          reason: 'Duplicate file name'
        });
        continue;
      }

      seenNames.add(file.name);
      results.valid.push(file);
    }

    return results;
  }

  /**
   * Read file as ArrayBuffer
   */
  static async readAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Download PDF from Uint8Array
   */
  static downloadPDF(pdfBytes, filename = 'document.pdf') {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    // Append to body temporarily (required for some browsers)
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Download multiple PDFs as separate files
   */
  static async downloadMultiplePDFs(pdfArray, baseFilename = 'document') {
    for (let i = 0; i < pdfArray.length; i++) {
      const filename = `${baseFilename}_${i + 1}.pdf`;
      const delay = i * 100; // Stagger downloads
      
      setTimeout(() => {
        this.downloadPDF(pdfArray[i], filename);
      }, delay);
    }
  }

  /**
   * Get file size in human-readable format
   */
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clear memory (for cleanup)
   */
  static clearMemory() {
    // Revoke all blob URLs
    const links = document.querySelectorAll('[href*="blob:"]');
    links.forEach(link => {
      try {
        URL.revokeObjectURL(link.href);
      } catch (e) {
        // Ignore
      }
    });
  }
}

// FileHandler is a global class — no export needed
