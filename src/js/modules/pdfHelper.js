/**
 * PDF Helper Module
 * Thin, well-tested wrapper around @cantoo/pdf-lib (a maintained pdf-lib fork
 * that implements encrypt() and password-protected load()).
 */

class PDFHelper {
  static get lib() {
    const lib = (typeof window !== 'undefined' && window.PDFLib) ||
                (typeof self !== 'undefined' && self.PDFLib);
    if (!lib) throw new Error('PDF library not loaded');
    return lib;
  }

  /** True if the error means the document is encrypted (and no/incorrect password was given). */
  static isEncryptionError(error) {
    const m = (error && error.message) || '';
    return /encrypted/i.test(m) || /password/i.test(m);
  }

  /** True specifically when a password was supplied but rejected, or is required. */
  static isPasswordError(error) {
    const m = (error && error.message) || '';
    return /password/i.test(m) && /(incorrect|invalid|wrong|need|required)/i.test(m);
  }

  /** Fresh Uint8Array copy — pdf-lib may mutate the input during (failed) decryption. */
  static _copy(bytes) {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    return u8.slice(0);
  }

  /**
   * Load a PDF from bytes. Always loads from a copy so the caller's buffer is
   * never mutated by an in-place decryption attempt.
   * @param {Uint8Array|ArrayBuffer} bytes
   * @param {object} [opts] - { password, updateMetadata }
   */
  static async loadPDF(bytes, opts = {}) {
    const { PDFDocument } = this.lib;
    const loadOpts = { updateMetadata: false };
    if (opts.password !== undefined) loadOpts.password = opts.password;
    try {
      return await PDFDocument.load(this._copy(bytes), loadOpts);
    } catch (error) {
      if (this.isEncryptionError(error)) throw error; // let callers handle encryption specially
      throw new Error(`Failed to load PDF: ${error.message}`);
    }
  }

  /**
   * Inspect a PDF's encryption without needing the password.
   * @returns {Promise<{encrypted:boolean, needsPassword:boolean}>}
   *   needsPassword=false with encrypted=true means a permissions-only PDF
   *   (owner password set, empty user password) that can be unlocked freely.
   */
  static async analyzeEncryption(bytes) {
    const { PDFDocument } = this.lib;
    try {
      await PDFDocument.load(this._copy(bytes), { updateMetadata: false });
      return { encrypted: false, needsPassword: false };
    } catch (error) {
      if (!this.isEncryptionError(error)) throw new Error(`Failed to read PDF: ${error.message}`);
    }
    // Encrypted. Can it be opened with an empty user password?
    try {
      await PDFDocument.load(this._copy(bytes), { password: '', updateMetadata: false });
      return { encrypted: true, needsPassword: false };
    } catch (_) {
      return { encrypted: true, needsPassword: true };
    }
  }

  static async createEmptyPDF() {
    const { PDFDocument } = this.lib;
    return PDFDocument.create();
  }

  static async savePDF(pdfDoc, opts = {}) {
    try {
      return await pdfDoc.save(opts);
    } catch (error) {
      throw new Error(`Failed to save PDF: ${error.message}`);
    }
  }

  static getPageCount(pdfDoc) {
    return pdfDoc.getPageCount();
  }

  static getAllPageIndices(pdfDoc) {
    return pdfDoc.getPageIndices();
  }

  static async extractPages(pdfDoc, pageIndices) {
    const { PDFDocument } = this.lib;
    const newPdf = await PDFDocument.create();
    const copied = await newPdf.copyPages(pdfDoc, pageIndices);
    copied.forEach(p => newPdf.addPage(p));
    return newPdf;
  }

  /**
   * Parse a page-range string like "1-5,7,10-15" or "3-end" into 0-based indices.
   * Hardened: rejects garbage tokens, supports open-ended "N-end", de-dupes with a Set.
   */
  static parsePageRange(rangeString, totalPages) {
    if (typeof rangeString !== 'string' || rangeString.trim() === '') {
      throw new Error('Page range is empty');
    }
    const seen = new Set();
    const indices = [];
    const add = (i) => { if (!seen.has(i)) { seen.add(i); indices.push(i); } };
    const parseNum = (tok) => {
      if (/^end$/i.test(tok)) return totalPages;
      if (!/^\d+$/.test(tok)) throw new Error(`Invalid page token: "${tok}"`);
      return parseInt(tok, 10);
    };

    for (const rawPart of rangeString.split(',')) {
      const part = rawPart.trim();
      if (part === '') continue;
      if (part.includes('-')) {
        const bits = part.split('-').map(s => s.trim());
        if (bits.length !== 2) throw new Error(`Invalid range: "${part}"`);
        const start = parseNum(bits[0]);
        const end = parseNum(bits[1]);
        if (start < 1 || end > totalPages || start > end) {
          throw new Error(`Invalid range: "${part}" (document has ${totalPages} pages)`);
        }
        for (let i = start; i <= end; i++) add(i - 1);
      } else {
        const n = parseNum(part);
        if (n < 1 || n > totalPages) {
          throw new Error(`Invalid page number: "${part}" (document has ${totalPages} pages)`);
        }
        add(n - 1);
      }
    }
    if (indices.length === 0) throw new Error('No valid pages in range');
    return indices;
  }

  /** Rotate a single page by a relative angle (90/180/270). */
  static rotatePage(pdfDoc, pageIndex, deg) {
    const { degrees } = this.lib;
    const page = pdfDoc.getPage(pageIndex);
    const current = page.getRotation().angle || 0;
    const normalized = ((deg % 360) + 360) % 360;
    page.setRotation(degrees((current + normalized) % 360));
  }

  /** Remove pages given 0-based indices (order-independent). */
  static deletePages(pdfDoc, pageIndices) {
    const sorted = [...new Set(pageIndices)].sort((a, b) => b - a);
    for (const index of sorted) pdfDoc.removePage(index);
  }

  static getMetadata(pdfDoc) {
    const safe = (fn) => { try { return fn() || ''; } catch { return ''; } };
    return {
      title: safe(() => pdfDoc.getTitle()),
      author: safe(() => pdfDoc.getAuthor()),
      subject: safe(() => pdfDoc.getSubject()),
      keywords: safe(() => pdfDoc.getKeywords()),
      creator: safe(() => pdfDoc.getCreator()),
      producer: safe(() => pdfDoc.getProducer()),
      creationDate: safe(() => pdfDoc.getCreationDate()),
      modificationDate: safe(() => pdfDoc.getModificationDate()),
      pageCount: pdfDoc.getPageCount()
    };
  }

  /** Set only the fields provided (empty strings ARE written, unlike before). */
  static setMetadata(pdfDoc, metadata) {
    const set = (key, fn) => { if (metadata[key] !== undefined) fn(metadata[key]); };
    set('title', v => pdfDoc.setTitle(v));
    set('author', v => pdfDoc.setAuthor(v));
    set('subject', v => pdfDoc.setSubject(v));
    set('keywords', v => pdfDoc.setKeywords(Array.isArray(v) ? v : String(v).split(/[,;]\s*/).filter(Boolean)));
    set('creator', v => pdfDoc.setCreator(v));
    set('producer', v => pdfDoc.setProducer(v));
  }

  /**
   * Strip all document metadata, including the XMP packet that the standard
   * setters leave untouched.
   */
  static clearMetadata(pdfDoc) {
    const { PDFName, PDFHexString } = this.lib;
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');
    // Drop the XMP metadata stream if present.
    try {
      const catalog = pdfDoc.catalog;
      if (catalog && catalog.has(PDFName.of('Metadata'))) {
        catalog.delete(PDFName.of('Metadata'));
      }
    } catch (_) { /* best effort */ }
    // Overwrite Info dates so they don't leak.
    try {
      const epoch = new Date(0);
      pdfDoc.setCreationDate(epoch);
      pdfDoc.setModificationDate(epoch);
    } catch (_) { /* some docs lack an Info dict */ }
  }

  /**
   * Encrypt a document in place with AES-256.
   * permissions keys: printing, modifying, copying, annotating,
   * fillingForms, contentAccessibility, documentAssembly
   */
  static encrypt(pdfDoc, userPassword, ownerPassword, permissions = {}) {
    if (typeof pdfDoc.encrypt !== 'function') {
      throw new Error('This PDF engine does not support encryption');
    }
    pdfDoc.encrypt({
      userPassword: userPassword || '',
      ownerPassword: ownerPassword || userPassword || '',
      permissions: {
        printing: permissions.printing === false ? undefined : 'highResolution',
        modifying: permissions.modifying !== false,
        copying: permissions.copying !== false,
        annotating: permissions.annotating !== false,
        fillingForms: permissions.fillingForms !== false,
        contentAccessibility: permissions.contentAccessibility !== false,
        documentAssembly: permissions.documentAssembly !== false
      }
    });
  }

  /**
   * After a password load, remove leftovers of the source's security handler:
   * stale XRef-stream/trailer objects that still reference /Encrypt, and the
   * /Standard encryption dictionary itself. Without this, a source saved with
   * an XRef stream yields an "unlocked" file that is still flagged encrypted.
   * @returns {number} objects removed
   */
  static stripEncryptionArtifacts(pdfDoc) {
    const { PDFName, PDFDict, PDFRef } = this.lib;
    const ctx = pdfDoc.context;
    const kill = new Set();
    for (const [ref, obj] of ctx.enumerateIndirectObjects()) {
      const dict = obj instanceof PDFDict ? obj : (obj && obj.dict);
      if (!dict || typeof dict.get !== 'function') continue;
      const type = dict.get(PDFName.of('Type'));
      const encrypt = dict.get(PDFName.of('Encrypt'));
      if ((type && type.toString() === '/XRef') || encrypt) {
        kill.add(ref.toString());
        if (encrypt instanceof PDFRef) kill.add(encrypt.toString());
      }
      const filter = dict.get(PDFName.of('Filter'));
      if (filter && filter.toString() === '/Standard' && dict.get(PDFName.of('O'))) kill.add(ref.toString());
    }
    for (const [ref] of ctx.enumerateIndirectObjects()) {
      if (kill.has(ref.toString())) ctx.delete(ref);
    }
    return kill.size;
  }

  /**
   * Replace characters the standard (WinAnsi) fonts cannot encode.
   * @returns {{text:string, hadUnsupported:boolean}}
   */
  static sanitizeWinAnsi(text) {
    let hadUnsupported = false;
    const out = String(text).replace(/[^\x00-\xFF]/g, () => { hadUnsupported = true; return '?'; });
    return { text: out, hadUnsupported };
  }

  static getPageDimensions(page) {
    return { width: page.getWidth(), height: page.getHeight() };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFHelper;
}
