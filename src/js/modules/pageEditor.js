/**
 * Page Editor Module
 * Visual page grid: drag to reorder, multi-select, rotate / delete / duplicate
 * / extract selected pages. Commits all changes in a single rebuild so one
 * Undo reverts the whole editing session.
 */

class PageEditor {
  constructor(ui, workspace) {
    this.ui = ui;
    this.workspace = workspace;
  }

  /** Open the editor for the active document. */
  async open() {
    const doc = this.workspace.active;
    if (!doc) { this.ui.showToast('Add a PDF first', 'warning'); return; }
    if (doc.locked && doc.locked.needsPassword) { this.ui.showToast('Unlock this PDF before editing pages', 'warning'); return; }
    if (!PDFRender.available()) { this.ui.showToast('Page preview renderer is unavailable', 'error'); return; }

    const progress = this.ui.showProgress('Rendering pages…', { indeterminate: false });
    let thumbs;
    try {
      thumbs = await PDFRender.allThumbnails(doc.bytes, 150, '', (i, _url) => {
        progress.update(((i + 1) / (doc.pageCount || 1)) * 100);
      });
    } catch (e) {
      progress.close();
      this.ui.showToast('Could not render pages: ' + e.message, 'error');
      return;
    }
    progress.close();

    // Working model: ordered list of { src, rotate, thumb }
    this.model = thumbs.map((t, i) => ({ src: i, rotate: 0, thumb: t }));
    this.selection = new Set();
    this._renderModal(doc);
  }

  _renderModal(doc) {
    const modal = this.ui.createModal('pageEditorModal', `Edit pages — ${doc.name}`, { width: '92vw' });
    modal.element.classList.add('page-editor-modal');
    this.modal = modal;

    const toolbar = document.createElement('div');
    toolbar.className = 'pe-toolbar';
    const mk = (label, cls, fn, title) => {
      const b = document.createElement('button');
      b.className = `btn ${cls} btn-sm`;
      b.textContent = label;
      if (title) b.title = title;
      b.addEventListener('click', fn);
      return b;
    };
    toolbar.appendChild(mk('Select all', 'btn-secondary', () => this._selectAll()));
    toolbar.appendChild(mk('Clear', 'btn-secondary', () => this._clearSelection()));
    toolbar.appendChild(mk('⟲ Left', 'btn-secondary', () => this._rotateSelected(270), 'Rotate selected 90° left'));
    toolbar.appendChild(mk('⟳ Right', 'btn-secondary', () => this._rotateSelected(90), 'Rotate selected 90° right'));
    toolbar.appendChild(mk('Duplicate', 'btn-secondary', () => this._duplicateSelected()));
    toolbar.appendChild(mk('Delete', 'btn-danger', () => this._deleteSelected()));
    const spacer = document.createElement('div'); spacer.style.flex = '1';
    toolbar.appendChild(spacer);
    this.countLabel = document.createElement('span');
    this.countLabel.className = 'pe-count';
    toolbar.appendChild(this.countLabel);

    const grid = document.createElement('div');
    grid.className = 'pe-grid';
    this.grid = grid;

    const footer = document.createElement('div');
    footer.className = 'modal-buttons';
    footer.appendChild(this.ui._btn('Extract selected to new PDF', 'btn-secondary', () => this._extractSelected()));
    footer.appendChild(this.ui._btn('Cancel', 'btn-secondary', () => modal.close()));
    footer.appendChild(this.ui._btn('Apply changes', 'btn-primary', () => this._apply()));

    modal.body.appendChild(toolbar);
    modal.body.appendChild(grid);
    modal.body.appendChild(footer);

    this._renderGrid();

    if (window.Sortable) {
      this.sortable = window.Sortable.create(grid, {
        animation: 150,
        ghostClass: 'pe-ghost',
        onEnd: (evt) => {
          const [moved] = this.model.splice(evt.oldIndex, 1);
          this.model.splice(evt.newIndex, 0, moved);
          this._renderGrid();
        }
      });
    }
  }

  _renderGrid() {
    this.grid.innerHTML = '';
    this.model.forEach((pg, i) => {
      const card = document.createElement('div');
      card.className = 'pe-card' + (this.selection.has(i) ? ' selected' : '');
      card.dataset.idx = i;

      const img = document.createElement('img');
      img.src = pg.thumb;
      img.alt = `Page ${i + 1}`;
      img.style.transform = `rotate(${pg.rotate}deg)`;
      img.draggable = false;

      const num = document.createElement('span');
      num.className = 'pe-num';
      num.textContent = i + 1;

      card.appendChild(img);
      card.appendChild(num);
      card.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.selection.has(i)) this.selection.delete(i);
        else this.selection.add(i);
        this._renderGrid();
      });
      this.grid.appendChild(card);
    });
    this.countLabel.textContent = `${this.model.length} page(s), ${this.selection.size} selected`;
  }

  _selectedIndices() { return [...this.selection].sort((a, b) => a - b); }
  _selectAll() { this.model.forEach((_, i) => this.selection.add(i)); this._renderGrid(); }
  _clearSelection() { this.selection.clear(); this._renderGrid(); }

  _requireSelection() {
    if (this.selection.size === 0) { this.ui.showToast('Select one or more pages first', 'warning'); return false; }
    return true;
  }

  _rotateSelected(deg) {
    if (!this._requireSelection()) return;
    this._selectedIndices().forEach(i => { this.model[i].rotate = (((this.model[i].rotate + deg) % 360) + 360) % 360; });
    this._renderGrid();
  }

  _duplicateSelected() {
    if (!this._requireSelection()) return;
    // Insert copies after the last selected index, preserving order.
    const sel = this._selectedIndices();
    const copies = sel.map(i => ({ ...this.model[i] }));
    const insertAt = sel[sel.length - 1] + 1;
    this.model.splice(insertAt, 0, ...copies);
    this.selection.clear();
    this._renderGrid();
  }

  _deleteSelected() {
    if (!this._requireSelection()) return;
    if (this.selection.size >= this.model.length) { this.ui.showToast('Cannot delete every page', 'warning'); return; }
    this.model = this.model.filter((_, i) => !this.selection.has(i));
    this.selection.clear();
    this._renderGrid();
  }

  async _extractSelected() {
    if (!this._requireSelection()) return;
    const doc = this.workspace.active;
    const indices = this._selectedIndices().map(i => this.model[i].src);
    try {
      const bytes = await PDFProcessor.extractPages(doc.bytes, indices);
      const pageCount = indices.length;
      this.workspace.addDocument({ name: `${FileHandler.baseName(doc.name)}_extracted.pdf`, bytes, pageCount });
      this.ui.showToast(`Extracted ${pageCount} page(s) to a new document`, 'success');
      this.modal.close();
    } catch (e) {
      this.ui.showToast('Extract failed: ' + e.message, 'error');
    }
  }

  async _apply() {
    const doc = this.workspace.active;
    const model = this.model.map(m => ({ src: m.src, rotate: m.rotate }));
    const progress = this.ui.showProgress('Applying changes…', { indeterminate: true });
    try {
      const bytes = await PDFProcessor.rebuild(doc.bytes, model);
      this.workspace.replaceActive(bytes, { pageCount: model.length });
      progress.close();
      this.modal.close();
      this.ui.showToast('Pages updated', 'success');
    } catch (e) {
      progress.close();
      this.ui.showToast('Could not apply changes: ' + e.message, 'error');
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PageEditor;
}
