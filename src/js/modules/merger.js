/**
 * PDF Merger Module
 * Combines multiple source documents (already-unlocked byte arrays) into one.
 */

class PDFMerger {
  /**
   * @param {Array<{bytes:Uint8Array,name?:string}>} sources
   * @param {object} opts { onProgress }
   * @returns {Promise<Uint8Array>}
   */
  static async merge(sources, opts = {}) {
    const { onProgress = null } = opts;
    if (!sources || sources.length < 2) {
      throw new Error('At least 2 documents are required to merge');
    }

    const merged = await PDFHelper.createEmptyPDF();
    let processed = 0;

    for (const src of sources) {
      const sourcePdf = await PDFHelper.loadPDF(src.bytes);
      const indices = PDFHelper.getAllPageIndices(sourcePdf);
      const copied = await merged.copyPages(sourcePdf, indices);
      copied.forEach(p => merged.addPage(p));
      processed++;
      if (onProgress) onProgress({ processed, total: sources.length, percent: Math.round((processed / sources.length) * 100) });
    }

    merged.setProducer('PDF Toolkit');
    return PDFHelper.savePDF(merged);
  }

  /**
   * Merge selected page ranges from each source.
   * @param {Array<{bytes:Uint8Array, pages?:number[]}>} items pages are 0-based; omit for all
   */
  static async mergePages(items, opts = {}) {
    const { onProgress = null } = opts;
    const merged = await PDFHelper.createEmptyPDF();
    let processed = 0;
    for (const item of items) {
      const sourcePdf = await PDFHelper.loadPDF(item.bytes);
      const indices = item.pages && item.pages.length ? item.pages : PDFHelper.getAllPageIndices(sourcePdf);
      const copied = await merged.copyPages(sourcePdf, indices);
      copied.forEach(p => merged.addPage(p));
      processed++;
      if (onProgress) onProgress({ processed, total: items.length, percent: Math.round((processed / items.length) * 100) });
    }
    merged.setProducer('PDF Toolkit');
    return PDFHelper.savePDF(merged);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFMerger;
}
