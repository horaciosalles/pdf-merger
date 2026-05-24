/**
 * Web Worker for Heavy PDF Operations
 * Runs PDF processing in background thread to prevent UI blocking
 */

// Import modules (note: cannot use ES6 imports in workers, so we'll load them)
self.addEventListener('message', async (event) => {
  const { action, payload, id } = event.data;

  try {
    // Load pdf-lib from the message (pre-loaded)
    const PDFLib = self.PDFLib || payload.PDFLib;

    let result;

    switch (action) {
      case 'mergePDFs':
        result = await mergePDFs(payload.files, PDFLib);
        break;
      case 'splitPDF':
        result = await splitPDF(payload.file, payload.operation, PDFLib);
        break;
      case 'encryptPDF':
        result = await encryptPDF(payload.file, payload.password, PDFLib);
        break;
      case 'decryptPDF':
        result = await decryptPDF(payload.file, payload.password, PDFLib);
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    self.postMessage({
      id,
      success: true,
      result
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message
    });
  }
});

/**
 * Merge PDFs in worker
 */
async function mergePDFs(filesData, PDFLib) {
  const { PDFDocument } = PDFLib;
  const mergedPdf = await PDFDocument.create();

  for (const fileData of filesData) {
    const sourcePdf = await PDFDocument.load(fileData);
    const pageIndices = sourcePdf.getPageIndices();
    const copiedPages = await mergedPdf.copyPages(sourcePdf, pageIndices);
    copiedPages.forEach(page => mergedPdf.addPage(page));

    // Post progress
    self.postMessage({
      progress: true,
      processed: filesData.indexOf(fileData) + 1,
      total: filesData.length
    });
  }

  return await mergedPdf.save();
}

/**
 * Split PDF in worker
 */
async function splitPDF(fileData, operation, PDFLib) {
  const { PDFDocument } = PDFLib;
  const pdf = await PDFDocument.load(fileData);
  const pageCount = pdf.getPageCount();

  let result = [];

  if (operation.type === 'individual') {
    for (let i = 0; i < pageCount; i++) {
      const singlePdf = await PDFDocument.create();
      const [copiedPage] = await singlePdf.copyPages(pdf, [i]);
      singlePdf.addPage(copiedPage);
      result.push(await singlePdf.save());

      self.postMessage({
        progress: true,
        processed: i + 1,
        total: pageCount
      });
    }
  } else if (operation.type === 'byCount') {
    const pagesPerFile = operation.pagesPerFile;
    for (let i = 0; i < pageCount; i += pagesPerFile) {
      const endIndex = Math.min(i + pagesPerFile, pageCount);
      const pageIndices = Array.from({ length: endIndex - i }, (_, j) => i + j);

      const chunkPdf = await PDFDocument.create();
      const copiedPages = await chunkPdf.copyPages(pdf, pageIndices);
      copiedPages.forEach(page => chunkPdf.addPage(page));
      result.push(await chunkPdf.save());

      self.postMessage({
        progress: true,
        processed: Math.ceil((i + pagesPerFile) / pagesPerFile),
        total: Math.ceil(pageCount / pagesPerFile)
      });
    }
  }

  return result;
}

/**
 * Encrypt PDF in worker
 */
async function encryptPDF(fileData, password, PDFLib) {
  const { PDFDocument } = PDFLib;
  const pdf = await PDFDocument.load(fileData);

  pdf.encrypt({
    userPassword: password,
    ownerPassword: password,
    permissions: {
      printing: 'highResolution',
      modifying: true,
      copying: true,
      annotating: true,
      fillingForms: true,
      contentAccessibility: true,
      documentAssembly: true
    }
  });

  return await pdf.save();
}

/**
 * Decrypt PDF in worker
 */
async function decryptPDF(fileData, password, PDFLib) {
  const { PDFDocument } = PDFLib;
  
  try {
    const pdf = await PDFDocument.load(fileData, { password });
    return await pdf.save();
  } catch (error) {
    throw new Error('Decryption failed: Incorrect password or corrupted file');
  }
}
