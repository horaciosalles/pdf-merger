/**
 * UI Manager Module
 * Handles UI state, DOM manipulation, and user interactions
 */

import CONFIG from '../config.js';

class UIManager {
  constructor() {
    this.state = {
      currentTab: 'merge',
      selectedFiles: [],
      isProcessing: false,
      recentFiles: this.loadRecentFiles()
    };

    this.tabs = ['merge', 'split', 'encrypt', 'decrypt', 'tools'];
    this.initializeEventListeners();
  }

  /**
   * Initialize all event listeners
   */
  initializeEventListeners() {
    // Tab navigation
    this.tabs.forEach(tab => {
      const tabBtn = document.getElementById(`tab-${tab}`);
      if (tabBtn) {
        tabBtn.addEventListener('click', () => this.switchTab(tab));
      }
    });

    // Global drag-drop prevention
    window.addEventListener('dragover', e => e.preventDefault());
    window.addEventListener('drop', e => e.preventDefault());
  }

  /**
   * Switch active tab
   */
  switchTab(tabName) {
    if (!this.tabs.includes(tabName)) return;

    this.state.currentTab = tabName;

    // Update tab buttons
    this.tabs.forEach(tab => {
      const btn = document.getElementById(`tab-${tab}`);
      const content = document.getElementById(`tab-content-${tab}`);
      if (btn && content) {
        btn.classList.toggle('active', tab === tabName);
        content.classList.toggle('hidden', tab !== tabName);
      }
    });
  }

  /**
   * Show progress indicator
   */
  showProgress(title = 'Processing...', maxValue = 100) {
    const modal = this.createModal('progressModal', title);
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar';
    progressBar.innerHTML = `
      <div class="progress-fill" style="width: 0%"></div>
    `;
    const percentText = document.createElement('div');
    percentText.className = 'progress-text';
    percentText.textContent = '0%';

    modal.body.appendChild(progressBar);
    modal.body.appendChild(percentText);

    return {
      update: (value) => {
        const percent = Math.round((value / maxValue) * 100);
        progressBar.querySelector('.progress-fill').style.width = `${percent}%`;
        percentText.textContent = `${percent}%`;
      },
      close: () => modal.close()
    };
  }

  /**
   * Show toast notification
   */
  showToast(message, type = 'info', duration = CONFIG.TOAST_DURATION) {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    const container = document.getElementById('toast-container') || this.createToastContainer();
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), CONFIG.ANIMATION_DURATION);
    }, duration);
  }

  /**
   * Create toast container if needed
   */
  createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  /**
   * Create modal dialog
   */
  createModal(id, title, options = {}) {
    const {
      width = '500px',
      closable = true
    } = options;

    // Remove existing modal if present
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = id;
    modal.className = 'modal hidden';

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.addEventListener('click', () => {
      if (closable) {
        modal.classList.add('hidden');
        backdrop.remove();
      }
    });

    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.width = width;

    const header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = `<h3>${title}</h3>`;

    if (closable) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'modal-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
        backdrop.remove();
      });
      header.appendChild(closeBtn);
    }

    const body = document.createElement('div');
    body.className = 'modal-body';

    content.appendChild(header);
    content.appendChild(body);

    modal.appendChild(backdrop);
    modal.appendChild(content);
    document.body.appendChild(modal);

    return {
      element: modal,
      body: body,
      show: () => modal.classList.remove('hidden'),
      close: () => {
        modal.classList.add('hidden');
        setTimeout(() => modal.remove(), CONFIG.ANIMATION_DURATION);
      }
    };
  }

  /**
   * Show file upload dialog (for password input, options, etc.)
   */
  createPasswordInput(title = 'Enter Password') {
    const modal = this.createModal('passwordModal', title);
    
    const input = document.createElement('input');
    input.type = 'password';
    input.className = 'form-input';
    input.placeholder = 'Enter password';

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';

    const okBtn = document.createElement('button');
    okBtn.className = 'btn btn-primary';
    okBtn.textContent = 'OK';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-secondary';
    cancelBtn.textContent = 'Cancel';

    buttons.appendChild(okBtn);
    buttons.appendChild(cancelBtn);

    modal.body.appendChild(input);
    modal.body.appendChild(buttons);
    modal.show();

    return new Promise((resolve) => {
      okBtn.addEventListener('click', () => {
        modal.close();
        resolve(input.value);
      });
      cancelBtn.addEventListener('click', () => {
        modal.close();
        resolve(null);
      });
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          okBtn.click();
        }
      });
    });
  }

  /**
   * Update file list display
   */
  updateFileList(files, containerId = 'fileList') {
    const container = document.getElementById(containerId);
    if (!container) return;

    this.state.selectedFiles = files;

    if (files.length === 0) {
      container.innerHTML = '<div class="empty-state"><i>No files selected</i></div>';
      return;
    }

    container.innerHTML = files.map((f, i) => `
      <div class="file-item" data-idx="${i}">
        <div class="file-info">
          <span class="file-number">${i + 1}</span>
          <div class="file-details">
            <span class="file-name">${this.escapeHtml(f.name)}</span>
            <span class="file-size">${this.formatFileSize(f.size)}</span>
          </div>
        </div>
        <button class="file-remove" data-idx="${i}" title="Remove file">
          <span>×</span>
        </button>
      </div>
    `).join('');

    // Add event listeners
    container.querySelectorAll('.file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        files.splice(idx, 1);
        this.updateFileList(files, containerId);
      });
    });
  }

  /**
   * Format file size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Set processing state
   */
  setProcessing(isProcessing) {
    this.state.isProcessing = isProcessing;
    const buttons = document.querySelectorAll('.action-btn');
    buttons.forEach(btn => {
      btn.disabled = isProcessing;
      btn.textContent = isProcessing ? 'Processing...' : btn.dataset.originalText || btn.textContent;
    });
  }

  /**
   * Save to recent files
   */
  saveRecentFile(filename) {
    const recent = this.loadRecentFiles();
    recent.unshift(filename);
    const trimmed = recent.slice(0, 5);
    localStorage.setItem(CONFIG.STORAGE_KEYS.RECENT_FILES, JSON.stringify(trimmed));
    this.state.recentFiles = trimmed;
  }

  /**
   * Load recent files from storage
   */
  loadRecentFiles() {
    try {
      const recent = localStorage.getItem(CONFIG.STORAGE_KEYS.RECENT_FILES);
      return recent ? JSON.parse(recent) : [];
    } catch (e) {
      return [];
    }
  }

  /**
   * Save user preferences
   */
  savePreferences(prefs) {
    localStorage.setItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(prefs));
  }

  /**
   * Load user preferences
   */
  loadPreferences() {
    try {
      const prefs = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_PREFERENCES);
      return prefs ? JSON.parse(prefs) : {};
    } catch (e) {
      return {};
    }
  }
}

export default UIManager;
