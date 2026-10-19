/**
 * PDF Processor Module
 * Page-level editing and content operations. All methods take unlocked bytes
 * and return a new Uint8Array.
 */

class PDFProcessor {
  /** Delete 0-based page indices. */
  static async deletePages(bytes, pageIndices) {
    if (!pageIndices || pageIndices.length === 0) throw new Error('No pages selected for deletion');
    const pdf = await PDFHelper.loadPDF(bytes);
    if (pageIndices.length >= PDFHelper.getPageCount(pdf)) throw new Error('Cannot delete all pages');
    PDFHelper.deletePages(pdf, pageIndices);
    return PDFHelper.savePDF(pdf);
  }

  /** Keep only the given indices (used by the page editor "extract"). */
  static async extractPages(bytes, pageIndices) {
    if (!pageIndices || pageIndices.length === 0) throw new Error('No pages selected');
    const pdf = await PDFHelper.loadPDF(bytes);
    const out = await PDFHelper.extractPages(pdf, pageIndices);
    return PDFHelper.savePDF(out);
  }

  /** Rotate given indices (or all) by a relative angle. */
  static async rotatePages(bytes, pageIndices, degrees) {
    if (!Number.isInteger(degrees) || ![90, 180, 270].includes(((degrees % 360) + 360) % 360)) {
      throw new Error('Rotation must be 90, 180, or 270 degrees');
    }
    const pdf = await PDFHelper.loadPDF(bytes);
    const indices = (pageIndices && pageIndices.length)
      ? pageIndices
      : PDFHelper.getAllPageIndices(pdf);
    for (const i of indices) PDFHelper.rotatePage(pdf, i, degrees);
    return PDFHelper.savePDF(pdf);
  }

  /** Reorder pages to an explicit 0-based order (from the page editor). */
  static async reorderPages(bytes, order) {
    const { PDFDocument } = PDFHelper.lib;
    const source = await PDFHelper.loadPDF(bytes);
    const out = await PDFDocument.create();
    const copied = await out.copyPages(source, order);
    copied.forEach(p => out.addPage(p));
    return PDFHelper.savePDF(out);
  }

  /**
   * Rebuild a document from a page-editor model in one pass.
   * @param {Array<{src:number, rotate?:number}>} model ordered; src is 0-based
   *        into the original; rotate is an additional relative angle.
   */
  static async rebuild(bytes, model) {
    const { PDFDocument, degrees } = PDFHelper.lib;
    if (!model || model.length === 0) throw new Error('Document must keep at least one page');
    const source = await PDFHelper.loadPDF(bytes);
    const out = await PDFDocument.create();
    const copied = await out.copyPages(source, model.map(m => m.src));
    copied.forEach((page, i) => {
      const extra = model[i].rotate || 0;
      if (extra) {
        const cur = page.getRotation().angle || 0;
        page.setRotation(degrees((((cur + extra) % 360) + 360) % 360));
      }
      out.addPage(page);
    });
    return PDFHelper.savePDF(out);
  }

  /** Duplicate given indices (non-mutating copy, inserted right after each). */
  static async duplicatePages(bytes, pageIndices) {
    if (!pageIndices || pageIndices.length === 0) throw new Error('No pages selected');
    const pdf = await PDFHelper.loadPDF(bytes);
    const sorted = [...new Set(pageIndices)].sort((a, b) => b - a);
    for (const index of sorted) {
      const [copy] = await pdf.copyPages(pdf, [index]);
      pdf.insertPage(index + 1, copy);
    }
    return PDFHelper.savePDF(pdf);
  }

  /** Reverse page order. */
  static async reversePages(bytes) {
    const pdf = await PDFHelper.loadPDF(bytes);
    const order = PDFHelper.getAllPageIndices(pdf).reverse();
    return this.reorderPages(bytes, order);
  }

  /** Insert a blank page at a 0-based position (default: end), matching last page size. */
  static async insertBlankPage(bytes, position = -1) {
    const pdf = await PDFHelper.loadPDF(bytes);
    const count = PDFHelper.getPageCount(pdf);
    const ref = pdf.getPage(Math.max(0, count - 1));
    const { width, height } = ref.getSize();
    if (position < 0 || position >= count) pdf.addPage([width, height]);
    else pdf.insertPage(position, [width, height]);
    return PDFHelper.savePDF(pdf);
  }

  /** Flatten AcroForm fields into static content. */
  static async flattenForms(bytes) {
    const pdf = await PDFHelper.loadPDF(bytes);
    const form = pdf.getForm();
    form.flatten();
    return PDFHelper.savePDF(pdf);
  }

  static async getMetadata(bytes) {
    const pdf = await PDFHelper.loadPDF(bytes);
    return PDFHelper.getMetadata(pdf);
  }

  static async setMetadata(bytes, metadata) {
    const pdf = await PDFHelper.loadPDF(bytes);
    PDFHelper.setMetadata(pdf, metadata);
    return PDFHelper.savePDF(pdf);
  }

  static async removeMetadata(bytes) {
    const pdf = await PDFHelper.loadPDF(bytes);
    PDFHelper.clearMetadata(pdf);
    return PDFHelper.savePDF(pdf);
  }

  /**
   * Add a diagonal text watermark to every page.
   * @returns {Promise<{bytes:Uint8Array, warning?:string}>}
   */
  static async addWatermark(bytes, text, options = {}) {
    const { StandardFonts, rgb, degrees } = PDFHelper.lib;
    const {
      opacity = 0.25, rotation = -45, fontSize = 60,
      color = [0.6, 0.6, 0.6]
    } = options;

    const clean = PDFHelper.sanitizeWinAnsi(text);
    if (!clean.text.trim()) throw new Error('Watermark text is empty');

    const pdf = await PDFHelper.loadPDF(bytes);
    const font = await pdf.embedFont(StandardFonts.HelveticaBold);
    const rad = (rotation * Math.PI) / 180;
    const tw = font.widthOfTextAtSize(clean.text, fontSize);
    const th = font.heightAtSize(fontSize);

    for (const page of pdf.getPages()) {
      const { width, height } = page.getSize();
      // Place the text origin so the text block centres on the page after rotation.
      const x = width / 2 - (tw / 2) * Math.cos(rad) + (th / 2) * Math.sin(rad);
      const y = height / 2 - (tw / 2) * Math.sin(rad) - (th / 2) * Math.cos(rad);
      page.drawText(clean.text, {
        x, y, size: fontSize, font,
        color: rgb(color[0], color[1], color[2]),
        opacity, rotate: degrees(rotation)
      });
    }
    const out = await PDFHelper.savePDF(pdf);
    return { bytes: out, warning: clean.hadUnsupported ? 'Some characters are not supported by the built-in font and were replaced with "?".' : undefined };
  }

  /**
   * Add page numbers.
   * @param {object} options { format, position, fontSize, startAt, skipFirst, margin, color }
   */
  static async addPageNumbers(bytes, options = {}) {
    const { StandardFonts, rgb } = PDFHelper.lib;
    const {
      format = '{page} / {total}',
      position = 'bottom-right',
      fontSize = 12,
      startAt = 1,
      skipFirst = false,
      margin = 24,
      color = [0, 0, 0]
    } = options;

    const pdf = await PDFHelper.loadPDF(bytes);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const pages = pdf.getPages();
    const total = pages.length;

    pages.forEach((page, i) => {
      if (skipFirst && i === 0) return;
      const { width, height } = page.getSize();
      const label = PDFHelper.sanitizeWinAnsi(
        format.replace('{page}', String(i + startAt)).replace('{total}', String(total + startAt - 1))
      ).text;
      const tw = font.widthOfTextAtSize(label, fontSize);

      let x;
      if (position.includes('right')) x = width - margin - tw;
      else if (position.includes('left')) x = margin;
      else x = (width - tw) / 2;

      const y = position.includes('top') ? height - margin - fontSize : margin;

      page.drawText(label, { x, y, size: fontSize, font, color: rgb(color[0], color[1], color[2]) });
    });
    return PDFHelper.savePDF(pdf);
  }

  /**
   * Lossless structural re-save (object streams). Honest about scope:
   * this does not re-encode images. Returns size delta for the UI.
   * @returns {Promise<{bytes:Uint8Array, before:number, after:number}>}
   */
  static async optimize(bytes) {
    const pdf = await PDFHelper.loadPDF(bytes);
    const out = await PDFHelper.savePDF(pdf, { useObjectStreams: true });
    return { bytes: out, before: bytes.length || bytes.byteLength, after: out.length };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFProcessor;
}
