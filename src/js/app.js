/**
 * PDF Toolkit Main Application
 * Orchestrates all modules and handles main application logic
 */

import CONFIG from './config.js';
import FileHandler from './modules/fileHandler.js';
import PDFHelper from './modules/pdfHelper.js';
import PDFMerger from './modules/merger.js';
import PDFSplitter from './modules/splitter.js';
import PDFEncryptor from './modules/encryptor.js';
import PDFProcessor from './modules/processor.js';
import UIManager from './modules/ui.js';

class PDFToolkit {
  constructor() {
    this.ui = new UIManager();
    this.currentFiles = [];
    this.initializationComplete = false;
    this.initializeApp();
  }

  /**
   * Initialize application
   */
  async initializeApp() {
    try {
      // Check if libraries are loaded
      if (!window.PDFLib || !window.Sortable) {
        throw new Error('Required libraries not loaded. Make sure pdf-lib.min.js and Sortable.min.js are included.');
      }

      this.setupCommonHandlers();
      this.setupMergeTab();
      this.setupSplitTab();
      this.setupEncryptTab();
      this.setupDecryptTab();
      this.setupToolsTab();

      // Register service worker if available
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('./src/sw.js');
        } catch (e) {
          console.log('Service Worker registration failed:', e);
        }
      }

      this.initializationComplete = true;
      this.ui.showToast('PDF Toolkit ready!', 'success', 2000);
    } catch (error) {
      console.error('Initialization failed:', error);
      this.ui.showToast('Initialization error: ' + error.message, 'error');
    }
  }

  /**
   * Setup common handlers (drag-drop, file input)
   */
  setupCommonHandlers() {
    // Setup file drop zones
    const dropzones = document.querySelectorAll('.dropzone');
    dropzones.forEach(zone => {
      this.setupDropzone(zone);
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        const fileList = document.querySelector('.file-list:not(.hidden)');
        if (fileList) {
          const checkboxes = fileList.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach(cb => cb.checked = true);
        }
      }
    });
  }

  /**
   * Setup dropzone for file uploads
   */
  setupDropzone(element) {
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      element.classList.add('dragover');
    });

    element.addEventListener('dragleave', () => {
      element.classList.remove('dragover');
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      element.classList.remove('dragover');
      this.handleFileSelect(e.dataTransfer.files);
    });

    element.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = '.pdf';
      input.onchange = (e) => this.handleFileSelect(e.target.files);
      input.click();
    });
  }

  /**
   * Handle file selection
   */
  handleFileSelect(files) {
    const validation = FileHandler.validateFiles(files, {
      maxSize: CONFIG.MAX_FILE_SIZE
    });

    if (validation.invalid.length > 0) {
      validation.invalid.forEach(item => {
        this.ui.showToast(`${item.file}: ${item.reason}`, 'warning');
      });
    }

    if (validation.valid.length > 0) {
      this.currentFiles = [...this.currentFiles, ...validation.valid];
      this.updateCurrentFilesList();
      this.ui.showToast(`${validation.valid.length} file(s) added`, 'success');
    }
  }

  /**
   * Update current files list display
   */
  updateCurrentFilesList() {
    const container = document.getElementById('currentFilesList');
    if (container) {
      this.ui.updateFileList(this.currentFiles, 'currentFilesList');
    }
  }

  /**
   * Setup Merge tab
   */
  setupMergeTab() {
    const mergeBtn = document.getElementById('merge-action');
    if (mergeBtn) {
      mergeBtn.addEventListener('click', () => this.performMerge());
    }
  }

  /**
   * Perform merge operation
   */
  async performMerge() {
    if (this.currentFiles.length < 2) {
      this.ui.showToast('Select at least 2 PDFs to merge', 'warning');
      return;
    }

    this.ui.setProcessing(true);
    const progress = this.ui.showProgress('Merging PDFs...');

    try {
      const result = await PDFMerger.mergePDFs(this.currentFiles, {
        onProgress: (p) => progress.update(p.percent)
      });

      FileHandler.downloadPDF(result, 'merged.pdf');
      this.ui.saveRecentFile('merged.pdf');
      this.ui.showToast('PDFs merged successfully!', 'success');
    } catch (error) {
      this.ui.showToast('Merge failed: ' + error.message, 'error');
    } finally {
      progress.close();
      this.ui.setProcessing(false);
    }
  }

  /**
   * Setup Split tab
   */
  setupSplitTab() {
    const splitByRangeBtn = document.getElementById('split-range-action');
    const splitIndividualBtn = document.getElementById('split-individual-action');
    const splitByCountBtn = document.getElementById('split-count-action');

    if (splitByRangeBtn) {
      splitByRangeBtn.addEventListener('click', () => this.performSplitByRange());
    }
    if (splitIndividualBtn) {
      splitIndividualBtn.addEventListener('click', () => this.performSplitIndividual());
    }
    if (splitByCountBtn) {
      splitByCountBtn.addEventListener('click', () => this.performSplitByCount());
    }
  }

  /**
   * Split by page range
   */
  async performSplitByRange() {
    if (this.currentFiles.length === 0) {
      this.ui.showToast('Select a PDF to split', 'warning');
      return;
    }

    const rangeInput = document.getElementById('split-range-input');
    const range = rangeInput ? rangeInput.value.trim() : '';

    if (!range) {
      this.ui.showToast('Enter a page range (e.g., 1-5,7,10-15)', 'warning');
      return;
    }

    this.ui.setProcessing(true);
    const progress = this.ui.showProgress('Splitting PDF...');

    try {
      const result = await PDFSplitter.splitByRange(this.currentFiles[0], range, {
        onProgress: (p) => progress.update(p.percent)
      });

      FileHandler.downloadPDF(result, `split_${this.currentFiles[0].name}`);
      this.ui.showToast('PDF split successfully!', 'success');
    } catch (error) {
      this.ui.showToast('Split failed: ' + error.message, 'error');
    } finally {
      progress.close();
      this.ui.setProcessing(false);
    }
  }

  /**
   * Split into individual pages
   */
  async performSplitIndividual() {
    if (this.currentFiles.length === 0) {
      this.ui.showToast('Select a PDF to split', 'warning');
      return;
    }

    this.ui.setProcessing(true);
    const progress = this.ui.showProgress('Splitting PDF into individual pages...');

    try {
      const results = await PDFSplitter.splitIntoPages(this.currentFiles[0], {
        onProgress: (p) => progress.update(p.percent)
      });

      FileHandler.downloadMultiplePDFs(results, `page`);
      this.ui.showToast(`PDF split into ${results.length} files!`, 'success');
    } catch (error) {
      this.ui.showToast('Split failed: ' + error.message, 'error');
    } finally {
      progress.close();
      this.ui.setProcessing(false);
    }
  }

  /**
   * Split by page count
   */
  async performSplitByCount() {
    if (this.currentFiles.length === 0) {
      this.ui.showToast('Select a PDF to split', 'warning');
      return;
    }

    const countInput = document.getElementById('split-count-input');
    const count = countInput ? parseInt(countInput.value) : 0;

    if (!Number.isInteger(count) || count < 1) {
      this.ui.showToast('Enter a valid number of pages per file', 'warning');
      return;
    }

    this.ui.setProcessing(true);
    const progress = this.ui.showProgress('Splitting PDF by count...');

    try {
      const results = await PDFSplitter.splitByCount(this.currentFiles[0], count, {
        onProgress: (p) => progress.update(p.percent)
      });

      FileHandler.downloadMultiplePDFs(results, `split`);
      this.ui.showToast(`PDF split into ${results.length} files!`, 'success');
    } catch (error) {
      this.ui.showToast('Split failed: ' + error.message, 'error');
    } finally {
      progress.close();
      this.ui.setProcessing(false);
    }
  }

  /**
   * Setup Encrypt tab
   */
  setupEncryptTab() {
    const encryptBtn = document.getElementById('encrypt-action');
    if (encryptBtn) {
      encryptBtn.addEventListener('click', () => this.performEncrypt());
    }
  }

  /**
   * Perform encryption
   */
  async performEncrypt() {
    if (this.currentFiles.length === 0) {
      this.ui.showToast('Select a PDF to encrypt', 'warning');
      return;
    }

    const password = await this.ui.createPasswordInput('Set PDF Password');
    if (!password) return;

    this.ui.setProcessing(true);
    const progress = this.ui.showProgress('Encrypting PDF...');

    try {
      const result = await PDFEncryptor.encryptPDF(this.currentFiles[0], password, {
        permissions: {
          printing: true,
          modifying: false,
          copying: false
        }
      });

      FileHandler.downloadPDF(result, `encrypted_${this.currentFiles[0].name}`);
      this.ui.showToast('PDF encrypted successfully!', 'success');
    } catch (error) {
      this.ui.showToast('Encryption failed: ' + error.message, 'error');
    } finally {
      progress.close();
      this.ui.setProcessing(false);
    }
  }

  /**
   * Setup Decrypt tab
   */
  setupDecryptTab() {
    const decryptBtn = document.getElementById('decrypt-action');
    if (decryptBtn) {
      decryptBtn.addEventListener('click', () => this.performDecrypt());
    }
  }

  /**
   * Perform decryption
   */
  async performDecrypt() {
    if (this.currentFiles.length === 0) {
      this.ui.showToast('Select a PDF to decrypt', 'warning');
      return;
    }

    const password = await this.ui.createPasswordInput('Enter PDF Password');
    if (!password) return;

    this.ui.setProcessing(true);
    const progress = this.ui.showProgress('Decrypting PDF...');

    try {
      const result = await PDFEncryptor.decryptPDF(this.currentFiles[0], password);

      FileHandler.downloadPDF(result, `decrypted_${this.currentFiles[0].name}`);
      this.ui.showToast('PDF decrypted successfully!', 'success');
    } catch (error) {
      this.ui.showToast('Decryption failed: ' + error.message, 'error');
    } finally {
      progress.close();
      this.ui.setProcessing(false);
    }
  }

  /**
   * Setup Tools tab
   */
  setupToolsTab() {
    const deleteBtn = document.getElementById('tool-delete-action');
    const rotateBtn = document.getElementById('tool-rotate-action');
    const watermarkBtn = document.getElementById('tool-watermark-action');
    const pageNumBtn = document.getElementById('tool-pagenum-action');
    const metadataBtn = document.getElementById('tool-metadata-action');

    if (deleteBtn) deleteBtn.addEventListener('click', () => this.performDeletePages());
    if (rotateBtn) rotateBtn.addEventListener('click', () => this.performRotatePages());
    if (watermarkBtn) watermarkBtn.addEventListener('click', () => this.performWatermark());
    if (pageNumBtn) pageNumBtn.addEventListener('click', () => this.performAddPageNumbers());
    if (metadataBtn) metadataBtn.addEventListener('click', () => this.performMetadata());
  }

  /**
   * Delete pages
   */
  async performDeletePages() {
    if (this.currentFiles.length === 0) {
      this.ui.showToast('Select a PDF', 'warning');
      return;
    }

    const pagesInput = document.getElementById('delete-pages-input');
    const pages = pagesInput ? pagesInput.value.trim() : '';

    if (!pages) {
      this.ui.showToast('Enter page numbers to delete', 'warning');
      return;
    }

    this.ui.setProcessing(true);
    const progress = this.ui.showProgress('Deleting pages...');

    try {
      const fileBytes = await FileHandler.readAsArrayBuffer(this.currentFiles[0]);
      const pdf = await PDFHelper.loadPDF(fileBytes);
      const pageCount = PDFHelper.getPageCount(pdf);
      const pageIndices = PDFHelper.parsePageRange(pages, pageCount);

      const result = await PDFProcessor.deletePages(this.currentFiles[0], pageIndices);
      FileHandler.downloadPDF(result, `edited_${this.currentFiles[0].name}`);
      this.ui.showToast('Pages deleted successfully!', 'success');
    } catch (error) {
      this.ui.showToast('Delete failed: ' + error.message, 'error');
    } finally {
      progress.close();
      this.ui.setProcessing(false);
    }
  }

  /**
   * Rotate pages
   */
  async performRotatePages() {
    if (this.currentFiles.length === 0) {
      this.ui.showToast('Select a PDF', 'warning');
      return;
    }

    const degreesSelect = document.getElementById('rotate-degrees');
    const degrees = degreesSelect ? parseInt(degreesSelect.value) : 90;

    this.ui.setProcessing(true);
    const progress = this.ui.showProgress('Rotating pages...');

    try {
      const fileBytes = await FileHandler.readAsArrayBuffer(this.currentFiles[0]);
      const pdf = await PDFHelper.loadPDF(fileBytes);
      const pageCount = PDFHelper.getPageCount(pdf);
      const allPages = Array.from({ length: pageCount }, (_, i) => i);

      const result = await PDFProcessor.rotatePages(this.currentFiles[0], allPages, degrees);
      FileHandler.downloadPDF(result, `rotated_${this.currentFiles[0].name}`);
      this.ui.showToast('Pages rotated successfully!', 'success');
    } catch (error) {
      this.ui.showToast('Rotation failed: ' + error.message, 'error');
    } finally {
      progress.close();
      this.ui.setProcessing(false);
    }
  }

  /**
   * Add watermark
   */
  async performWatermark() {
    if (this.currentFiles.length === 0) {
      this.ui.showToast('Select a PDF', 'warning');
      return;
    }

    const textInput = document.getElementById('watermark-text');
    const text = textInput ? textInput.value.trim() : '';

    if (!text) {
      this.ui.showToast('Enter watermark text', 'warning');
      return;
    }

    this.ui.setProcessing(true);
    const progress = this.ui.showProgress('Adding watermark...');

    try {
      const result = await PDFProcessor.addWatermark(this.currentFiles[0], text, {
        opacity: 0.3,
        rotation: -45,
        fontSize: 60
      });

      FileHandler.downloadPDF(result, `watermarked_${this.currentFiles[0].name}`);
      this.ui.showToast('Watermark added successfully!', 'success');
    } catch (error) {
      this.ui.showToast('Watermark failed: ' + error.message, 'error');
    } finally {
      progress.close();
      this.ui.setProcessing(false);
    }
  }

  /**
   * Add page numbers
   */
  async performAddPageNumbers() {
    if (this.currentFiles.length === 0) {
      this.ui.showToast('Select a PDF', 'warning');
      return;
    }

    this.ui.setProcessing(true);
    const progress = this.ui.showProgress('Adding page numbers...');

    try {
      const result = await PDFProcessor.addPageNumbers(this.currentFiles[0], {
        format: '{page}/{total}',
        position: 'bottom-right'
      });

      FileHandler.downloadPDF(result, `numbered_${this.currentFiles[0].name}`);
      this.ui.showToast('Page numbers added successfully!', 'success');
    } catch (error) {
      this.ui.showToast('Add page numbers failed: ' + error.message, 'error');
    } finally {
      progress.close();
      this.ui.setProcessing(false);
    }
  }

  /**
   * Manage metadata
   */
  async performMetadata() {
    if (this.currentFiles.length === 0) {
      this.ui.showToast('Select a PDF', 'warning');
      return;
    }

    try {
      const metadata = await PDFProcessor.getMetadata(this.currentFiles[0]);
      
      const modal = this.ui.createModal('metadataModal', 'PDF Metadata', { width: '600px' });
      
      const info = document.createElement('div');
      info.className = 'metadata-display';
      info.innerHTML = `
        <p><strong>Title:</strong> ${metadata.title || '(none)'}</p>
        <p><strong>Author:</strong> ${metadata.author || '(none)'}</p>
        <p><strong>Subject:</strong> ${metadata.subject || '(none)'}</p>
        <p><strong>Keywords:</strong> ${metadata.keywords || '(none)'}</p>
        <p><strong>Pages:</strong> ${metadata.pageCount}</p>
      `;
      
      const button = document.createElement('button');
      button.className = 'btn btn-secondary';
      button.textContent = 'Remove Metadata';
      button.addEventListener('click', async () => {
        try {
          const result = await PDFProcessor.removeMetadata(this.currentFiles[0]);
          FileHandler.downloadPDF(result, `clean_${this.currentFiles[0].name}`);
          this.ui.showToast('Metadata removed!', 'success');
          modal.close();
        } catch (error) {
          this.ui.showToast('Failed to remove metadata: ' + error.message, 'error');
        }
      });
      
      modal.body.appendChild(info);
      modal.body.appendChild(button);
      modal.show();
    } catch (error) {
      this.ui.showToast('Failed to read metadata: ' + error.message, 'error');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.pdfToolkit = new PDFToolkit();
});

export default PDFToolkit;
