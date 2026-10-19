/**
 * UI Manager Module
 * Toasts, modals, progress, and input dialogs. All dialogs are keyboard
 * accessible and always settle their promise (cancel/escape/backdrop → null).
 */

class UIManager {
  constructor() {
    this.animationMs = (typeof CONFIG !== 'undefined' && CONFIG.ANIMATION_DURATION) || 250;
    this.toastMs = (typeof CONFIG !== 'undefined' && CONFIG.TOAST_DURATION) || 4000;
    this._lastFocus = null;
  }

  // ── Toasts ────────────────────────────────────────────────────────────────
  getToastContainer() {
    let c = document.getElementById('toast-container');
    if (!c) {
      c = document.createElement('div');
      c.id = 'toast-container';
      c.className = 'toast-container';
      c.setAttribute('aria-live', 'polite');
      c.setAttribute('aria-atomic', 'false');
      document.body.appendChild(c);
    }
    return c;
  }

  /** Errors stay until dismissed; other toasts auto-dismiss. */
  showToast(message, type = 'info', duration) {
    const persist = type === 'error';
    const ms = duration !== undefined ? duration : (persist ? 0 : this.toastMs);

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

    const text = document.createElement('span');
    text.className = 'toast-text';
    text.textContent = message;
    toast.appendChild(text);

    const close = document.createElement('button');
    close.className = 'toast-close';
    close.setAttribute('aria-label', 'Dismiss');
    close.innerHTML = '&times;';
    const dismiss = () => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), this.animationMs);
    };
    close.addEventListener('click', dismiss);
    toast.appendChild(close);

    this.getToastContainer().appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    if (ms > 0) setTimeout(dismiss, ms);
    return { dismiss };
  }

  // ── Modal ─────────────────────────────────────────────────────────────────
  createModal(id, title, options = {}) {
    const { width = '460px', closable = true, onClose = null } = options;
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    this._lastFocus = document.activeElement;

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', title);

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.width = width;

    const header = document.createElement('div');
    header.className = 'modal-header';
    const h = document.createElement('h3');
    h.textContent = title;
    header.appendChild(h);

    const body = document.createElement('div');
    body.className = 'modal-body';

    content.appendChild(header);
    content.appendChild(body);
    modal.appendChild(backdrop);
    modal.appendChild(content);

    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      document.removeEventListener('keydown', onKey, true);
      modal.classList.remove('show');
      setTimeout(() => modal.remove(), this.animationMs);
      if (this._lastFocus && this._lastFocus.focus) { try { this._lastFocus.focus(); } catch (_) {} }
      if (onClose) onClose();
    };
    const onKey = (e) => {
      if (e.key === 'Escape' && closable) { e.stopPropagation(); close(); }
    };

    if (closable) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.setAttribute('aria-label', 'Close');
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', close);
      header.appendChild(closeBtn);
      backdrop.addEventListener('click', close);
      document.addEventListener('keydown', onKey, true);
    }

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('show'));

    return {
      element: modal, body,
      show: () => modal.classList.add('show'),
      close
    };
  }

  // ── Progress ──────────────────────────────────────────────────────────────
  showProgress(title = 'Processing…', { indeterminate = false } = {}) {
    const modal = this.createModal('progressModal', title, { closable: false });
    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    const fill = document.createElement('div');
    fill.className = 'progress-fill' + (indeterminate ? ' indeterminate' : '');
    bar.appendChild(fill);
    const txt = document.createElement('div');
    txt.className = 'progress-text';
    txt.textContent = indeterminate ? 'Working…' : '0%';
    modal.body.appendChild(bar);
    modal.body.appendChild(txt);

    return {
      update: (percent) => {
        if (indeterminate) return;
        const p = Math.max(0, Math.min(100, Math.round(percent)));
        fill.style.width = `${p}%`;
        txt.textContent = `${p}%`;
      },
      setLabel: (t) => { txt.textContent = t; },
      close: () => modal.close()
    };
  }

  // ── Password dialog ───────────────────────────────────────────────────────
  /**
   * @param {object} opts { title, confirm (require re-type), showPermissions }
   * @returns {Promise<null|{password, permissions?}>}
   */
  passwordDialog(opts = {}) {
    const { title = 'Enter Password', confirm = false, showPermissions = false, okText = 'OK' } = opts;
    return new Promise((resolve) => {
      let settled = false;
      const done = (val) => { if (settled) return; settled = true; modal.close(); resolve(val); };
      const modal = this.createModal('passwordModal', title, { onClose: () => done(null) });

      const wrap = document.createElement('div');
      wrap.className = 'field-wrap';
      const input = this._pwField('Password');
      wrap.appendChild(input.group);

      let confirmInput = null;
      if (confirm) {
        confirmInput = this._pwField('Confirm password');
        wrap.appendChild(confirmInput.group);
      }

      const err = document.createElement('div');
      err.className = 'form-error';
      err.setAttribute('aria-live', 'polite');
      wrap.appendChild(err);

      let permBoxes = {};
      if (showPermissions) {
        const fs = document.createElement('fieldset');
        fs.className = 'perm-fieldset';
        const lg = document.createElement('legend');
        lg.textContent = 'Allow recipients to:';
        fs.appendChild(lg);
        [['printing', 'Print'], ['copying', 'Copy text'], ['modifying', 'Edit'], ['annotating', 'Annotate']]
          .forEach(([key, label]) => {
            const id = `perm-${key}`;
            const row = document.createElement('label');
            row.className = 'perm-row';
            row.htmlFor = id;
            const cb = document.createElement('input');
            cb.type = 'checkbox'; cb.id = id; cb.checked = key === 'printing';
            permBoxes[key] = cb;
            row.appendChild(cb);
            row.appendChild(document.createTextNode(' ' + label));
            fs.appendChild(row);
          });
        wrap.appendChild(fs);
      }

      const buttons = document.createElement('div');
      buttons.className = 'modal-buttons';
      const cancel = this._btn('Cancel', 'btn-secondary', () => done(null));
      const ok = this._btn(okText, 'btn-primary', () => {
        const pw = input.input.value;
        if (!pw) { err.textContent = 'Password cannot be empty.'; input.input.focus(); return; }
        if (confirm && pw !== confirmInput.input.value) { err.textContent = 'Passwords do not match.'; confirmInput.input.focus(); return; }
        const result = { password: pw };
        if (showPermissions) {
          result.permissions = {};
          Object.keys(permBoxes).forEach(k => { result.permissions[k] = permBoxes[k].checked; });
        }
        done(result);
      });
      buttons.appendChild(cancel);
      buttons.appendChild(ok);

      modal.body.appendChild(wrap);
      modal.body.appendChild(buttons);

      const submitOnEnter = (e) => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } };
      input.input.addEventListener('keydown', submitOnEnter);
      if (confirmInput) confirmInput.input.addEventListener('keydown', submitOnEnter);
      setTimeout(() => input.input.focus(), 50);
    });
  }

  _pwField(placeholder) {
    const group = document.createElement('div');
    group.className = 'pw-field';
    const input = document.createElement('input');
    input.type = 'password';
    input.className = 'form-input';
    input.placeholder = placeholder;
    input.autocomplete = 'off';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pw-toggle';
    toggle.setAttribute('aria-label', 'Show password');
    toggle.textContent = '👁';
    toggle.addEventListener('click', () => {
      input.type = input.type === 'password' ? 'text' : 'password';
      toggle.setAttribute('aria-label', input.type === 'password' ? 'Show password' : 'Hide password');
    });
    group.appendChild(input);
    group.appendChild(toggle);
    return { group, input };
  }

  _btn(label, cls, onClick) {
    const b = document.createElement('button');
    b.className = `btn ${cls}`;
    b.textContent = label;
    b.addEventListener('click', onClick);
    return b;
  }

  /** Multiline textarea prompt → string|null. */
  textareaDialog(opts = {}) {
    const { title = 'Enter text', placeholder = '', okText = 'OK' } = opts;
    return new Promise((resolve) => {
      let settled = false;
      const done = (v) => { if (settled) return; settled = true; modal.close(); resolve(v); };
      const modal = this.createModal('textareaModal', title, { onClose: () => done(null) });
      const ta = document.createElement('textarea');
      ta.className = 'form-input'; ta.rows = 5; ta.placeholder = placeholder;
      const buttons = document.createElement('div');
      buttons.className = 'modal-buttons';
      buttons.appendChild(this._btn('Cancel', 'btn-secondary', () => done(null)));
      buttons.appendChild(this._btn(okText, 'btn-primary', () => done(ta.value)));
      modal.body.appendChild(ta);
      modal.body.appendChild(buttons);
      setTimeout(() => ta.focus(), 50);
    });
  }

  escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return String(text).replace(/[&<>"']/g, m => map[m]);
  }

  formatFileSize(bytes) { return FileHandler.formatFileSize(bytes); }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIManager;
}
