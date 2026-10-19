/**
 * PDF Splitter Module
 * All methods take unlocked bytes and return { bytes } chunk arrays or a single
 * byte array. Naming is left to the caller.
 */

class PDFSplitter {
  /** Extract a page range into a single new PDF. @returns {Promise<Uint8Array>} */
  static async extractRange(bytes, rangeString) {
    const source = await PDFHelper.loadPDF(bytes);
    const total = PDFHelper.getPageCount(source);
    const indices = PDFHelper.parsePageRange(rangeString, total);
    const out = await PDFHelper.extractPages(source, indices);
    out.setProducer('PDF Toolkit');
    return PDFHelper.savePDF(out);
  }

  /** One PDF per page. @returns {Promise<Array<{bytes:Uint8Array, page:number}>>} */
  static async splitIntoPages(bytes, opts = {}) {
    const { onProgress = null } = opts;
    const source = await PDFHelper.loadPDF(bytes);
    const total = PDFHelper.getPageCount(source);
    const results = [];
    for (let i = 0; i < total; i++) {
      const out = await PDFHelper.extractPages(source, [i]);
      results.push({ bytes: await PDFHelper.savePDF(out), page: i + 1 });
      if (onProgress) onProgress({ processed: i + 1, total, percent: Math.round(((i + 1) / total) * 100) });
    }
    return results;
  }

  /** Fixed-size chunks. @returns {Promise<Array<{bytes:Uint8Array, from:number, to:number}>>} */
  static async splitByCount(bytes, pagesPerFile, opts = {}) {
    const { onProgress = null } = opts;
    if (!Number.isInteger(pagesPerFile) || pagesPerFile < 1) {
      throw new Error('Pages per file must be a positive integer');
    }
    const source = await PDFHelper.loadPDF(bytes);
    const total = PDFHelper.getPageCount(source);
    const chunks = Math.ceil(total / pagesPerFile);
    const results = [];
    let processed = 0;
    for (let i = 0; i < total; i += pagesPerFile) {
      const end = Math.min(i + pagesPerFile, total);
      const indices = [];
      for (let j = i; j < end; j++) indices.push(j);
      const out = await PDFHelper.extractPages(source, indices);
      results.push({ bytes: await PDFHelper.savePDF(out), from: i + 1, to: end });
      processed++;
      if (onProgress) onProgress({ processed, total: chunks, percent: Math.round((processed / chunks) * 100) });
    }
    return results;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFSplitter;
}
