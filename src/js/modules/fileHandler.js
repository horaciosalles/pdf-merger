/**
 * File Handler Module
 * File reading, validation (by extension AND magic bytes), downloads,
 * ZIP packaging, and image-to-PDF conversion.
 */

class FileHandler {
  static get pdfExts() { return (typeof CONFIG !== 'undefined' && CONFIG.ACCEPTED_PDF_EXT) || ['.pdf']; }
  static get imageExts() { return (typeof CONFIG !== 'undefined' && CONFIG.ACCEPTED_IMAGE_EXT) || ['.jpg', '.jpeg', '.png']; }

  static extensionOf(name) {
    const m = /(\.[a-z0-9]+)$/i.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  }

  static isPDFName(file) {
    return !!(file && file.name && this.pdfExts.includes(this.extensionOf(file.name)));
  }

  static isImageName(file) {
    return !!(file && file.name && this.imageExts.includes(this.extensionOf(file.name)));
  }

  /** Accepts a PDF by extension + MIME (kept for unit-test compatibility). */
  static isValidPDF(file) {
    return !!(file && file.name &&
      this.isPDFName(file) &&
      (file.type === 'application/pdf' || file.type === 'application/x-pdf' || file.type === ''));
  }

  static isValidFileSize(file, maxSize = 500 * 1024 * 1024) {
    return file.size <= maxSize;
  }

  /** Classify a file: 'pdf' | 'image' | null. */
  static classify(file) {
    if (this.isPDFName(file) && (file.type === '' || /pdf/i.test(file.type))) return 'pdf';
    if (this.isImageName(file) && (file.type === '' || /image\/(jpeg|png)/i.test(file.type))) return 'image';
    return null;
  }

  /**
   * Validate a list of files against current workspace state.
   * @param {object} opts { maxSize, maxTotalSize, existingTotal, existingNames, allowDuplicates, acceptImages, maxFiles }
   */
  static validateFiles(files, opts = {}) {
    const {
      maxSize = 500 * 1024 * 1024,
      maxTotalSize = Infinity,
      existingTotal = 0,
      existingNames = new Set(),
      allowDuplicates = false,
      acceptImages = false,
      maxFiles = Infinity
    } = opts;

    const results = { valid: [], invalid: [], errors: [] };
    const arr = Array.from(files);

    if (arr.length > maxFiles) {
      results.errors.push(`Maximum ${maxFiles} files allowed`);
      return results;
    }

    const seen = new Set(existingNames);
    let runningTotal = existingTotal;

    for (const file of arr) {
      const kind = this.classify(file);
      const isPdf = this.isValidPDF(file);
      const accepted = isPdf || (acceptImages && kind === 'image');

      if (!accepted) {
        results.invalid.push({ file: file.name, reason: acceptImages ? 'Not a PDF or supported image' : 'Not a valid PDF file' });
        continue;
      }
      if (!this.isValidFileSize(file, maxSize)) {
        results.invalid.push({ file: file.name, reason: `File exceeds ${(maxSize / 1024 / 1024).toFixed(0)}MB limit` });
        continue;
      }
      if (!allowDuplicates && seen.has(file.name)) {
        results.invalid.push({ file: file.name, reason: 'Already added' });
        continue;
      }
      if (runningTotal + file.size > maxTotalSize) {
        results.invalid.push({ file: file.name, reason: 'Total size limit exceeded' });
        continue;
      }
      seen.add(file.name);
      runningTotal += file.size;
      results.valid.push(file);
    }
    return results;
  }

  /** Read a File/Blob as Uint8Array (uses the modern API when available). */
  static async readAsUint8Array(file) {
    if (typeof file.arrayBuffer === 'function') {
      return new Uint8Array(await file.arrayBuffer());
    }
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result));
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsArrayBuffer(file);
    });
  }

  // Back-compat alias used by older call sites / tests.
  static async readAsArrayBuffer(file) {
    const u8 = await this.readAsUint8Array(file);
    return u8.buffer;
  }

  /** Confirm the first bytes are a PDF header. */
  static async sniffIsPDF(file) {
    try {
      const blob = file.slice ? file.slice(0, 5) : file;
      const u8 = await this.readAsUint8Array(blob);
      return u8[0] === 0x25 && u8[1] === 0x50 && u8[2] === 0x44 && u8[3] === 0x46 && u8[4] === 0x2D; // %PDF-
    } catch (_) {
      return false;
    }
  }

  static downloadBytes(bytes, filename, mime = 'application/pdf') {
    const blob = new Blob([bytes], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    // Revoke late — Firefox/Safari can abort large downloads if revoked too soon.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  static downloadPDF(pdfBytes, filename = 'document.pdf') {
    this.downloadBytes(pdfBytes, filename, 'application/pdf');
  }

  /** Package multiple PDFs into a single ZIP (avoids 50-download prompts). */
  static async downloadZip(entries, zipName = 'pdf-toolkit.zip') {
    const fflate = (typeof window !== 'undefined' && window.fflate);
    if (!fflate) {
      // Fallback: staggered individual downloads.
      entries.forEach((e, i) => setTimeout(() => this.downloadPDF(e.bytes, e.name), i * 150));
      return;
    }
    const files = {};
    for (const e of entries) files[e.name] = [e.bytes, { level: 0 }]; // PDFs are already compressed
    const zipped = fflate.zipSync(files);
    this.downloadBytes(zipped, zipName, 'application/zip');
  }

  static formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /** Convert a JPG/PNG File into a one-page PDF (Uint8Array). */
  static async imageToPdfBytes(file) {
    const { PDFDocument } = (window.PDFLib);
    const bytes = await this.readAsUint8Array(file);
    const pdf = await PDFDocument.create();
    const ext = this.extensionOf(file.name);
    const img = (ext === '.png') ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    const page = pdf.addPage([img.width, img.height]);
    page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    return pdf.save();
  }

  /** Strip extension for building output names. */
  static baseName(name) {
    return (name || 'document').replace(/\.[a-z0-9]+$/i, '');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileHandler;
}
