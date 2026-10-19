/**
 * Workspace Module
 * The single source of truth for loaded documents. Supports per-document undo
 * history and selection, and notifies listeners on any change so the UI can
 * re-render. Operations elsewhere mutate the workspace through replaceActive()
 * / addDocument(), which keeps chaining (watermark → numbers → encrypt) and
 * Undo working across all tabs.
 */

class Workspace {
  constructor() {
    this.documents = [];
    this.activeId = null;
    this.listeners = new Set();
    this._seq = 0;
  }

  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { this.listeners.forEach(fn => { try { fn(this); } catch (e) { console.error(e); } }); }

  get totalSize() { return this.documents.reduce((s, d) => s + (d.size || 0), 0); }
  get names() { return new Set(this.documents.map(d => d.name)); }
  get active() { return this.documents.find(d => d.id === this.activeId) || null; }

  setActive(id) { this.activeId = id; this.emit(); }

  /**
   * @param {object} doc { name, bytes, pageCount, size, locked }
   */
  addDocument(doc) {
    const id = `doc_${++this._seq}`;
    const entry = {
      id,
      name: doc.name,
      originalName: doc.name,
      bytes: doc.bytes,
      pageCount: doc.pageCount ?? null,
      size: doc.size ?? (doc.bytes ? doc.bytes.length : 0),
      locked: doc.locked || { encrypted: false, needsPassword: false },
      history: []
    };
    this.documents.push(entry);
    if (!this.activeId) this.activeId = id;
    this.emit();
    return entry;
  }

  removeDocument(id) {
    const i = this.documents.findIndex(d => d.id === id);
    if (i === -1) return;
    this.documents.splice(i, 1);
    if (this.activeId === id) {
      this.activeId = this.documents.length ? this.documents[Math.max(0, i - 1)].id : null;
    }
    this.emit();
  }

  clear() { this.documents = []; this.activeId = null; this.emit(); }

  reorder(fromIndex, toIndex) {
    if (fromIndex === toIndex) return;
    const [moved] = this.documents.splice(fromIndex, 1);
    this.documents.splice(toIndex, 0, moved);
    this.emit();
  }

  /** Replace the active document's content, pushing an undo snapshot. */
  replaceActive(bytes, meta = {}) {
    const doc = this.active;
    if (!doc) return null;
    doc.history.push({ bytes: doc.bytes, name: doc.name, pageCount: doc.pageCount, size: doc.size, locked: doc.locked });
    const max = (typeof CONFIG !== 'undefined' && CONFIG.MAX_HISTORY) || 15;
    if (doc.history.length > max) doc.history.shift();

    doc.bytes = bytes;
    doc.size = bytes.length;
    if (meta.name) doc.name = meta.name;
    if (meta.pageCount !== undefined) doc.pageCount = meta.pageCount;
    if (meta.locked !== undefined) doc.locked = meta.locked;
    this.emit();
    return doc;
  }

  canUndo(id = this.activeId) {
    const doc = this.documents.find(d => d.id === id);
    return !!(doc && doc.history.length);
  }

  undo(id = this.activeId) {
    const doc = this.documents.find(d => d.id === id);
    if (!doc || !doc.history.length) return false;
    const prev = doc.history.pop();
    doc.bytes = prev.bytes;
    doc.name = prev.name;
    doc.pageCount = prev.pageCount;
    doc.size = prev.size;
    doc.locked = prev.locked;
    this.emit();
    return true;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Workspace;
}
