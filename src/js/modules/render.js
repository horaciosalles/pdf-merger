/**
 * Render Module
 * Rasterises PDF pages to images for previews and the page editor, using
 * pdf.js. Kept separate so the rest of the app has no pdf.js dependency.
 */

class PDFRender {
  static _ready = false;

  static get lib() {
    return (typeof window !== 'undefined') && (window.pdfjsLib || (window.pdfjsDistBuildPdf));
  }

  static init() {
    if (this._ready) return true;
    const lib = this.lib;
    if (!lib) return false;
    try {
      lib.GlobalWorkerOptions.workerSrc = './src/lib/pdf.worker.min.js';
      this._ready = true;
    } catch (_) { /* ignore */ }
    return this._ready;
  }

  static available() { return !!this.lib; }

  /** Load a pdf.js document from bytes. Always copies — pdf.js detaches buffers. */
  static async _load(bytes, password) {
    this.init();
    const copy = bytes.slice(0);
    const task = this.lib.getDocument({ data: copy, password, isEvalSupported: false });
    return task.promise;
  }

  static async _renderPageToCanvas(page, targetWidth) {
    const base = page.getViewport({ scale: 1 });
    const scale = targetWidth / base.width;
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const ctx = canvas.getContext('2d');
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas;
  }

  /** First-page thumbnail as a data URL (or null if rendering is unavailable). */
  static async firstPageThumbnail(bytes, width = 150, password = '') {
    if (!this.available()) return null;
    let pdf;
    try {
      pdf = await this._load(bytes, password);
      const page = await pdf.getPage(1);
      const canvas = await this._renderPageToCanvas(page, width);
      return canvas.toDataURL('image/png');
    } catch (_) {
      return null;
    } finally {
      if (pdf) pdf.destroy();
    }
  }

  /**
   * Export every page as PNG bytes at the given DPI.
   * @returns {Promise<Uint8Array[]>}
   */
  static async pagesToPng(bytes, dpi = 150, onPage = null) {
    if (!this.available()) throw new Error('Renderer is not available');
    const pdf = await this._load(bytes);
    const out = [];
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const widthPx = page.getViewport({ scale: 1 }).width * (dpi / 72);
        const canvas = await this._renderPageToCanvas(page, widthPx);
        const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
        out.push(new Uint8Array(await blob.arrayBuffer()));
        if (onPage) onPage(i, pdf.numPages);
      }
      return out;
    } finally {
      pdf.destroy();
    }
  }

  /**
   * Render every page. Calls onPage(index, dataURL) as each completes.
   * @returns {Promise<string[]>}
   */
  static async allThumbnails(bytes, width = 150, password = '', onPage = null) {
    if (!this.available()) throw new Error('Preview renderer is not available');
    const pdf = await this._load(bytes, password);
    const urls = [];
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const canvas = await this._renderPageToCanvas(page, width);
        const url = canvas.toDataURL('image/png');
        urls.push(url);
        if (onPage) onPage(i - 1, url);
      }
      return urls;
    } finally {
      pdf.destroy();
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFRender;
}
