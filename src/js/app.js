/**
 * PDF Toolkit — Main Application
 * Wires the shared Workspace to the UI: one document panel feeds every tab, so
 * there is no per-tab duplicate state. Handles importing (drag overlay, click,
 * paste, folders), encryption-aware loading, and dispatches operations.
 */

class PDFToolkit {
  constructor() {
    this.ui = new UIManager();
    this.workspace = new Workspace();
    this.pageEditor = new PageEditor(this.ui, this.workspace);
    this.tabs = ['merge', 'split', 'encrypt', 'decrypt', 'tools'];
    this.currentTab = 'merge';
    this.init();
  }

  async init() {
    if (!window.PDFLib) { this.ui.showToast('PDF engine failed to load', 'error'); return; }
    if (window.pdfjsLib) PDFRender.init();

    this.workspace.on(() => this.renderWorkspace());

    this.setupDropzone();
    this.setupGlobalDnD();
    this.setupPaste();
    this.setupTabs();
    this.setupActions();
    this.setupTabHandlers();
    this.restoreTab();
    this.renderWorkspace();

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      try { await navigator.serviceWorker.register('./sw.js'); } catch (e) { console.warn('SW registration failed', e); }
    }
  }

  // ── Importing ───────────────────────────────────────────────────────────
  setupDropzone() {
    const zone = document.getElementById('dropzone');
    const input = document.getElementById('fileInput');
    if (!zone || !input) return;
    zone.addEventListener('click', () => input.click());
    zone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', (e) => { this.importFiles(e.target.files); input.value = ''; });
  }

  setupGlobalDnD() {
    const overlay = document.getElementById('drop-overlay');
    let depth = 0;
    const show = () => { if (overlay) overlay.classList.add('show'); };
    const hide = () => { if (overlay) overlay.classList.remove('show'); };
    const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');

    window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; show(); });
    window.addEventListener('dragover', (e) => { if (hasFiles(e)) e.preventDefault(); });
    window.addEventListener('dragleave', (e) => { depth = Math.max(0, depth - 1); if (depth === 0) hide(); });
    window.addEventListener('drop', async (e) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0; hide();
      const items = e.dataTransfer.items;
      if (items && items.length && items[0].webkitGetAsEntry) {
        const files = await this.collectEntries(items);
        this.importFiles(files);
      } else {
        this.importFiles(e.dataTransfer.files);
      }
    });
  }

  /** Recursively read folders dropped via the DataTransferItem API. */
  async collectEntries(items) {
    const entries = [];
    for (const item of items) {
      const entry = item.webkitGetAsEntry && item.webkitGetAsEntry();
      if (entry) entries.push(entry); else if (item.getAsFile) { const f = item.getAsFile(); if (f) entries.push(f); }
    }
    const files = [];
    const walk = (entry) => new Promise((resolve) => {
      if (entry instanceof File) { files.push(entry); return resolve(); }
      if (entry.isFile) { entry.file(f => { files.push(f); resolve(); }, () => resolve()); }
      else if (entry.isDirectory) {
        const reader = entry.createReader();
        const readBatch = () => reader.readEntries(async (batch) => {
          if (!batch.length) return resolve();
          for (const e of batch) await walk(e);
          readBatch();
        }, () => resolve());
        readBatch();
      } else resolve();
    });
    for (const e of entries) await walk(e);
    return files;
  }

  setupPaste() {
    window.addEventListener('paste', (e) => {
      if (!e.clipboardData || !e.clipboardData.files || !e.clipboardData.files.length) return;
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      this.importFiles(e.clipboardData.files);
    });
  }

  async importFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    const validation = FileHandler.validateFiles(files, {
      maxSize: CONFIG.MAX_FILE_SIZE,
      maxTotalSize: CONFIG.MAX_TOTAL_SIZE,
      existingTotal: this.workspace.totalSize,
      existingNames: this.workspace.names,
      acceptImages: true
    });

    validation.errors.forEach(err => this.ui.showToast(err, 'error'));
    validation.invalid.forEach(item => this.ui.showToast(`${item.file}: ${item.reason}`, 'warning'));

    let added = 0;
    for (const file of validation.valid) {
      try {
        await this.importOne(file);
        added++;
      } catch (e) {
        this.ui.showToast(`${file.name}: ${e.message}`, 'error');
      }
    }
    if (added) this.ui.showToast(`${added} document(s) added`, 'success');
  }

  async importOne(file) {
    const kind = FileHandler.classify(file);
    if (kind === 'image') {
      const bytes = await FileHandler.imageToPdfBytes(file);
      this.workspace.addDocument({ name: FileHandler.baseName(file.name) + '.pdf', bytes, pageCount: 1 });
      return;
    }

    let bytes = await FileHandler.readAsUint8Array(file);
    if (!(await this.looksLikePDF(bytes))) throw new Error('This file is not a valid PDF');

    let info;
    try { info = await PDFHelper.analyzeEncryption(bytes); }
    catch (e) { throw new Error(e.message); }

    if (info.encrypted && !info.needsPassword) {
      // Permissions-only: unlock silently so the document is editable.
      try {
        bytes = await PDFEncryptor.removeRestrictions(bytes);
        info = { encrypted: false, needsPassword: false };
        this.ui.showToast(`${file.name}: restrictions removed`, 'info');
      } catch (_) { /* fall through, keep locked */ }
    }

    let pageCount = null;
    if (!info.needsPassword) {
      try { pageCount = PDFHelper.getPageCount(await PDFHelper.loadPDF(bytes)); } catch (_) {}
    }

    this.workspace.addDocument({ name: file.name, bytes, pageCount, locked: info });
  }

  async looksLikePDF(bytes) {
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2D;
  }

  // ── Workspace rendering ───────────────────────────────────────────────────
  renderWorkspace() {
    const list = document.getElementById('docList');
    const summary = document.getElementById('ws-summary');
    const undoBtn = document.getElementById('ws-undo');
    const dlBtn = document.getElementById('ws-download');
    const clearBtn = document.getElementById('ws-clear');
    if (!list) return;

    const docs = this.workspace.documents;
    if (summary) summary.textContent = docs.length
      ? `${docs.length} document(s) · ${FileHandler.formatFileSize(this.workspace.totalSize)}`
      : 'No documents yet';
    if (undoBtn) undoBtn.disabled = !this.workspace.canUndo();
    if (dlBtn) dlBtn.disabled = !this.workspace.active || (this.workspace.active.locked && this.workspace.active.locked.needsPassword);
    if (clearBtn) clearBtn.disabled = !docs.length;

    if (!docs.length) {
      list.innerHTML = '<div class="empty-state"><i>No documents yet. Drop PDFs or images anywhere on this page.</i></div>';
      return;
    }

    list.innerHTML = docs.map((d, i) => {
      const active = d.id === this.workspace.activeId;
      const locked = d.locked && d.locked.needsPassword;
      const badge = locked ? '<span class="badge badge-locked" title="Password required">🔒 Locked</span>'
        : (d.pageCount != null ? `<span class="badge">${d.pageCount} pp</span>` : '');
      return `
      <div class="file-item ${active ? 'active' : ''}" data-id="${d.id}" data-idx="${i}" role="button" tabindex="0" aria-pressed="${active}">
        <div class="file-info">
          <span class="file-number">${i + 1}</span>
          <div class="file-details">
            <span class="file-name">${this.ui.escapeHtml(d.name)}</span>
            <span class="file-meta">${FileHandler.formatFileSize(d.size)} ${badge}</span>
          </div>
        </div>
        <div class="file-item-actions">
          ${locked ? `<button class="btn-mini unlock-btn" data-id="${d.id}" title="Unlock">Unlock</button>` : ''}
          <button class="btn-mini dl-btn" data-id="${d.id}" title="Download" ${locked ? 'disabled' : ''}>⬇</button>
          <button class="file-remove" data-id="${d.id}" title="Remove" aria-label="Remove ${this.ui.escapeHtml(d.name)}">×</button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.file-item').forEach(el => {
      const id = el.dataset.id;
      const select = (e) => {
        if (e.target.closest('button')) return;
        this.workspace.setActive(id);
      };
      el.addEventListener('click', select);
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.workspace.setActive(id); } });
    });
    list.querySelectorAll('.file-remove').forEach(b => b.addEventListener('click', () => this.workspace.removeDocument(b.dataset.id)));
    list.querySelectorAll('.dl-btn').forEach(b => b.addEventListener('click', () => this.downloadDoc(b.dataset.id)));
    list.querySelectorAll('.unlock-btn').forEach(b => b.addEventListener('click', () => this.unlockDoc(b.dataset.id)));

    if (window.Sortable && !list._sortable) {
      list._sortable = window.Sortable.create(list, {
        animation: 150, handle: '.file-number', ghostClass: 'drag-ghost',
        onEnd: (evt) => { if (evt.oldIndex !== evt.newIndex) this.workspace.reorder(evt.oldIndex, evt.newIndex); }
      });
    }
  }

  downloadDoc(id) {
    const doc = this.workspace.documents.find(d => d.id === id) || this.workspace.active;
    if (!doc) return;
    if (doc.locked && doc.locked.needsPassword) { this.ui.showToast('Unlock the document first', 'warning'); return; }
    FileHandler.downloadPDF(doc.bytes, doc.name);
  }

  async unlockDoc(id) {
    const doc = this.workspace.documents.find(d => d.id === id);
    if (!doc) return;
    const res = await this.ui.passwordDialog({ title: `Unlock ${doc.name}`, okText: 'Unlock' });
    if (!res) return;
    const progress = this.ui.showProgress('Unlocking…', { indeterminate: true });
    try {
      const bytes = await PDFEncryptor.decrypt(doc.bytes, res.password);
      const pageCount = PDFHelper.getPageCount(await PDFHelper.loadPDF(bytes));
      doc.bytes = bytes; doc.size = bytes.length; doc.pageCount = pageCount;
      doc.locked = { encrypted: false, needsPassword: false }; doc.history = [];
      this.workspace.setActive(id);
      this.ui.showToast('Document unlocked', 'success');
    } catch (e) {
      this.ui.showToast('Unlock failed: ' + e.message, 'error');
    } finally { progress.close(); }
  }

  /** Active doc that must be editable (unlocked). */
  requireActive() {
    const doc = this.workspace.active;
    if (!doc) { this.ui.showToast('Add a PDF first', 'warning'); return null; }
    if (doc.locked && doc.locked.needsPassword) { this.ui.showToast('Unlock this PDF first', 'warning'); return null; }
    return doc;
  }

  async run(label, fn, { indeterminate = true } = {}) {
    const progress = this.ui.showProgress(label, { indeterminate });
    try {
      await fn(progress);
    } catch (e) {
      this.ui.showToast(`${label.replace(/…$/, '')} failed: ${e.message}`, 'error');
    } finally {
      progress.close();
    }
  }

  // ── Tabs ────────────────────────────────────────────────────────────────
  setupTabs() {
    const btns = this.tabs.map(t => document.getElementById(`tab-${t}`));
    btns.forEach((btn, idx) => {
      if (!btn) return;
      btn.addEventListener('click', () => this.switchTab(this.tabs[idx]));
      btn.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = (idx + 1) % this.tabs.length;
        else if (e.key === 'ArrowLeft') next = (idx - 1 + this.tabs.length) % this.tabs.length;
        if (next !== null) { e.preventDefault(); const nb = document.getElementById(`tab-${this.tabs[next]}`); nb.focus(); this.switchTab(this.tabs[next]); }
      });
    });
  }

  switchTab(tab) {
    if (!this.tabs.includes(tab)) return;
    this.currentTab = tab;
    this.tabs.forEach(t => {
      const btn = document.getElementById(`tab-${t}`);
      const panel = document.getElementById(`tab-content-${t}`);
      if (btn) { btn.classList.toggle('active', t === tab); btn.setAttribute('aria-selected', t === tab ? 'true' : 'false'); btn.tabIndex = t === tab ? 0 : -1; }
      if (panel) panel.classList.toggle('hidden', t !== tab);
    });
    try { localStorage.setItem(CONFIG.STORAGE_KEYS.LAST_TAB, tab); } catch (_) {}
    if (location.hash !== `#${tab}`) history.replaceState(null, '', `#${tab}`);
  }

  restoreTab() {
    let tab = (location.hash || '').replace('#', '');
    const params = new URLSearchParams(location.search);
    if (params.get('tab')) tab = params.get('tab');
    if (!this.tabs.includes(tab)) { try { tab = localStorage.getItem(CONFIG.STORAGE_KEYS.LAST_TAB); } catch (_) {} }
    this.switchTab(this.tabs.includes(tab) ? tab : 'merge');
  }

  // ── Global actions ────────────────────────────────────────────────────────
  setupActions() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    on('ws-undo', () => { if (this.workspace.undo()) this.ui.showToast('Undone', 'info'); });
    on('ws-download', () => this.workspace.active && this.downloadDoc(this.workspace.active.id));
    on('ws-clear', () => this.workspace.clear());
  }

  setupTabHandlers() {
    const on = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    // Merge
    on('merge-action', () => this.doMerge());
    // Split
    on('split-range-action', () => this.doSplitRange());
    on('split-count-action', () => this.doSplitCount());
    on('split-individual-action', () => this.doSplitIndividual());
    // Encrypt
    on('encrypt-action', () => this.doEncrypt());
    // Decrypt
    on('decrypt-action', () => this.doDecrypt());
    on('remove-restrictions-action', () => this.doRemoveRestrictions());
    on('try-passwords-action', () => this.doTryPasswords());
    // Tools
    on('tool-editor-action', () => this.pageEditor.open());
    on('tool-delete-action', () => this.doDeletePages());
    on('tool-rotate-action', () => this.doRotate());
    on('tool-watermark-action', () => this.doWatermark());
    on('tool-pagenum-action', () => this.doPageNumbers());
    on('tool-metadata-action', () => this.doMetadata());
    on('tool-reverse-action', () => this.doReverse());
    on('tool-insert-action', () => this.doInsertBlank());
    on('tool-flatten-action', () => this.doFlatten());
    on('tool-optimize-action', () => this.doOptimize());
    on('tool-images-action', () => this.doExportImages());
  }

  // ── Operations ──────────────────────────────────────────────────────────
  async doMerge() {
    const docs = this.workspace.documents.filter(d => !(d.locked && d.locked.needsPassword));
    if (this.workspace.documents.some(d => d.locked && d.locked.needsPassword)) {
      this.ui.showToast('Locked documents are skipped — unlock them to include them', 'warning');
    }
    if (docs.length < 2) { this.ui.showToast('Add at least 2 unlocked PDFs to merge', 'warning'); return; }
    await this.run('Merging…', async (p) => {
      const bytes = await PDFMerger.merge(docs.map(d => ({ bytes: d.bytes })), { onProgress: pr => p.update(pr.percent) });
      const pageCount = PDFHelper.getPageCount(await PDFHelper.loadPDF(bytes));
      this.workspace.addDocument({ name: 'merged.pdf', bytes, pageCount });
      FileHandler.downloadPDF(bytes, 'merged.pdf');
      this.ui.showToast('Merged — added to your documents and downloaded', 'success');
    }, { indeterminate: false });
  }

  async doSplitRange() {
    const doc = this.requireActive(); if (!doc) return;
    const range = document.getElementById('split-range-input').value.trim();
    if (!range) { this.ui.showToast('Enter a page range (e.g. 1-5,7)', 'warning'); return; }
    await this.run('Extracting…', async () => {
      const bytes = await PDFSplitter.extractRange(doc.bytes, range);
      FileHandler.downloadPDF(bytes, `${FileHandler.baseName(doc.name)}_pages_${range.replace(/[^0-9-]+/g, '_')}.pdf`);
      this.ui.showToast('Range extracted', 'success');
    });
  }

  async doSplitCount() {
    const doc = this.requireActive(); if (!doc) return;
    const count = parseInt(document.getElementById('split-count-input').value, 10);
    if (!Number.isInteger(count) || count < 1) { this.ui.showToast('Enter a valid pages-per-file count', 'warning'); return; }
    await this.run('Splitting…', async (p) => {
      const parts = await PDFSplitter.splitByCount(doc.bytes, count, { onProgress: pr => p.update(pr.percent) });
      const base = FileHandler.baseName(doc.name);
      await FileHandler.downloadZip(parts.map(x => ({ name: `${base}_${x.from}-${x.to}.pdf`, bytes: x.bytes })), `${base}_split.zip`);
      this.ui.showToast(`Split into ${parts.length} files (ZIP)`, 'success');
    }, { indeterminate: false });
  }

  async doSplitIndividual() {
    const doc = this.requireActive(); if (!doc) return;
    await this.run('Splitting into pages…', async (p) => {
      const parts = await PDFSplitter.splitIntoPages(doc.bytes, { onProgress: pr => p.update(pr.percent) });
      const base = FileHandler.baseName(doc.name);
      await FileHandler.downloadZip(parts.map(x => ({ name: `${base}_page_${x.page}.pdf`, bytes: x.bytes })), `${base}_pages.zip`);
      this.ui.showToast(`Split into ${parts.length} pages (ZIP)`, 'success');
    }, { indeterminate: false });
  }

  async doEncrypt() {
    const doc = this.requireActive(); if (!doc) return;
    const res = await this.ui.passwordDialog({ title: 'Set a password', confirm: true, showPermissions: true, okText: 'Encrypt' });
    if (!res) return;
    await this.run('Encrypting…', async () => {
      const bytes = await PDFEncryptor.encrypt(doc.bytes, res.password, { permissions: res.permissions });
      FileHandler.downloadPDF(bytes, `${FileHandler.baseName(doc.name)}_encrypted.pdf`);
      this.ui.showToast('Encrypted (AES-256) and downloaded', 'success');
    });
  }

  async doDecrypt() {
    const doc = this.workspace.active;
    if (!doc) { this.ui.showToast('Add a PDF first', 'warning'); return; }
    const res = await this.ui.passwordDialog({ title: 'Remove password', okText: 'Remove' });
    if (!res) return;
    await this.run('Removing password…', async () => {
      const bytes = await PDFEncryptor.decrypt(doc.bytes, res.password);
      const pageCount = PDFHelper.getPageCount(await PDFHelper.loadPDF(bytes));
      this.workspace.replaceActive(bytes, { pageCount, locked: { encrypted: false, needsPassword: false }, name: `${FileHandler.baseName(doc.name)}_unlocked.pdf` });
      FileHandler.downloadPDF(bytes, this.workspace.active.name);
      this.ui.showToast('Password removed', 'success');
    });
  }

  async doRemoveRestrictions() {
    const doc = this.workspace.active;
    if (!doc) { this.ui.showToast('Add a PDF first', 'warning'); return; }
    await this.run('Removing restrictions…', async () => {
      let bytes;
      try { bytes = await PDFEncryptor.removeRestrictions(doc.bytes); }
      catch (_) { throw new Error('This PDF has an open password — use "Remove password" instead'); }
      const pageCount = PDFHelper.getPageCount(await PDFHelper.loadPDF(bytes));
      this.workspace.replaceActive(bytes, { pageCount, locked: { encrypted: false, needsPassword: false } });
      FileHandler.downloadPDF(bytes, `${FileHandler.baseName(doc.name)}_unrestricted.pdf`);
      this.ui.showToast('Restrictions removed (no password was needed)', 'success');
    });
  }

  async doTryPasswords() {
    const doc = this.workspace.active;
    if (!doc) { this.ui.showToast('Add a PDF first', 'warning'); return; }
    const text = await this.ui.textareaDialog({ title: 'Try a list of passwords', placeholder: 'One password per line', okText: 'Try all' });
    if (text === null) return;
    const candidates = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    await this.run('Trying passwords…', async (p) => {
      const found = await PDFEncryptor.tryPasswords(doc.bytes, candidates, { onProgress: pr => p.update(pr.percent) });
      if (!found) { this.ui.showToast('None of those passwords worked', 'warning'); return; }
      const pageCount = PDFHelper.getPageCount(await PDFHelper.loadPDF(found.bytes));
      this.workspace.replaceActive(found.bytes, { pageCount, locked: { encrypted: false, needsPassword: false } });
      this.ui.showToast(found.password === '' ? 'Unlocked (no user password set)' : `Unlocked with "${found.password}"`, 'success');
    }, { indeterminate: false });
  }

  async doDeletePages() {
    const doc = this.requireActive(); if (!doc) return;
    const pages = document.getElementById('delete-pages-input').value.trim();
    if (!pages) { this.ui.showToast('Enter pages to delete', 'warning'); return; }
    await this.run('Deleting pages…', async () => {
      const total = doc.pageCount || PDFHelper.getPageCount(await PDFHelper.loadPDF(doc.bytes));
      const indices = PDFHelper.parsePageRange(pages, total);
      const bytes = await PDFProcessor.deletePages(doc.bytes, indices);
      this.workspace.replaceActive(bytes, { pageCount: total - indices.length });
      this.ui.showToast('Pages deleted', 'success');
    });
  }

  async doRotate() {
    const doc = this.requireActive(); if (!doc) return;
    const deg = parseInt(document.getElementById('rotate-degrees').value, 10);
    await this.run('Rotating…', async () => {
      const bytes = await PDFProcessor.rotatePages(doc.bytes, [], deg);
      this.workspace.replaceActive(bytes);
      this.ui.showToast('Rotated', 'success');
    });
  }

  async doWatermark() {
    const doc = this.requireActive(); if (!doc) return;
    const text = document.getElementById('watermark-text').value.trim();
    if (!text) { this.ui.showToast('Enter watermark text', 'warning'); return; }
    const opacity = parseFloat(document.getElementById('watermark-opacity').value) || 0.25;
    await this.run('Adding watermark…', async () => {
      const res = await PDFProcessor.addWatermark(doc.bytes, text, { opacity });
      this.workspace.replaceActive(res.bytes);
      if (res.warning) this.ui.showToast(res.warning, 'warning');
      this.ui.showToast('Watermark added', 'success');
    });
  }

  async doPageNumbers() {
    const doc = this.requireActive(); if (!doc) return;
    const position = document.getElementById('pagenum-position').value;
    const format = document.getElementById('pagenum-format').value;
    const skipFirst = document.getElementById('pagenum-skipfirst').checked;
    await this.run('Adding page numbers…', async () => {
      const bytes = await PDFProcessor.addPageNumbers(doc.bytes, { position, format, skipFirst });
      this.workspace.replaceActive(bytes);
      this.ui.showToast('Page numbers added', 'success');
    });
  }

  async doMetadata() {
    const doc = this.requireActive(); if (!doc) return;
    let meta;
    try { meta = await PDFProcessor.getMetadata(doc.bytes); }
    catch (e) { this.ui.showToast('Could not read metadata: ' + e.message, 'error'); return; }

    const modal = this.ui.createModal('metadataModal', 'Metadata', { width: '560px' });
    const fields = ['title', 'author', 'subject', 'keywords', 'creator'];
    const inputs = {};
    const form = document.createElement('div');
    form.className = 'field-wrap';
    fields.forEach(f => {
      const label = document.createElement('label'); label.className = 'form-label'; label.textContent = f[0].toUpperCase() + f.slice(1);
      const input = document.createElement('input'); input.className = 'form-input'; input.value = meta[f] || '';
      inputs[f] = input;
      form.appendChild(label); form.appendChild(input);
    });
    const info = document.createElement('p'); info.className = 'text-muted'; info.textContent = `${meta.pageCount} page(s)`;
    form.appendChild(info);

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';
    buttons.appendChild(this.ui._btn('Strip all metadata', 'btn-danger', async () => {
      modal.close();
      await this.run('Removing metadata…', async () => {
        const bytes = await PDFProcessor.removeMetadata(doc.bytes);
        this.workspace.replaceActive(bytes);
        this.ui.showToast('Metadata removed', 'success');
      });
    }));
    buttons.appendChild(this.ui._btn('Save changes', 'btn-primary', async () => {
      const metadata = {}; fields.forEach(f => metadata[f] = inputs[f].value);
      modal.close();
      await this.run('Saving metadata…', async () => {
        const bytes = await PDFProcessor.setMetadata(doc.bytes, metadata);
        this.workspace.replaceActive(bytes);
        this.ui.showToast('Metadata updated', 'success');
      });
    }));
    modal.body.appendChild(form);
    modal.body.appendChild(buttons);
  }

  async doReverse() {
    const doc = this.requireActive(); if (!doc) return;
    await this.run('Reversing…', async () => {
      const bytes = await PDFProcessor.reversePages(doc.bytes);
      this.workspace.replaceActive(bytes);
      this.ui.showToast('Page order reversed', 'success');
    });
  }

  async doInsertBlank() {
    const doc = this.requireActive(); if (!doc) return;
    await this.run('Inserting blank page…', async () => {
      const bytes = await PDFProcessor.insertBlankPage(doc.bytes, -1);
      this.workspace.replaceActive(bytes, { pageCount: (doc.pageCount || 0) + 1 });
      this.ui.showToast('Blank page added at end', 'success');
    });
  }

  async doFlatten() {
    const doc = this.requireActive(); if (!doc) return;
    await this.run('Flattening form…', async () => {
      const bytes = await PDFProcessor.flattenForms(doc.bytes);
      this.workspace.replaceActive(bytes);
      this.ui.showToast('Form fields flattened', 'success');
    });
  }

  async doExportImages() {
    const doc = this.requireActive(); if (!doc) return;
    await this.run('Rendering pages…', async (p) => {
      const pngs = await PDFRender.pagesToPng(doc.bytes, 150, (i, n) => p.update((i / n) * 100));
      const base = FileHandler.baseName(doc.name);
      await FileHandler.downloadZip(pngs.map((b, i) => ({ name: `${base}_page_${i + 1}.png`, bytes: b })), `${base}_images.zip`);
      this.ui.showToast(`Exported ${pngs.length} page image(s)`, 'success');
    }, { indeterminate: false });
  }

  async doOptimize() {
    const doc = this.requireActive(); if (!doc) return;
    await this.run('Optimizing…', async () => {
      const res = await PDFProcessor.optimize(doc.bytes);
      this.workspace.replaceActive(res.bytes);
      const saved = res.before - res.after;
      this.ui.showToast(saved > 0 ? `Optimized — saved ${FileHandler.formatFileSize(saved)}` : 'Optimized (already compact)', 'success');
    });
  }
}

document.addEventListener('DOMContentLoaded', () => { window.pdfToolkit = new PDFToolkit(); });

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PDFToolkit;
}
