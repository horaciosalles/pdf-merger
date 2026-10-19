/**
 * PDF Toolkit Configuration
 * Central settings. Loaded as a plain global (no ES modules) so the app
 * works directly from file:// without a build step.
 */

const CONFIG = {
  // File size limits (in bytes)
  MAX_FILE_SIZE: 500 * 1024 * 1024,      // 500 MB per file
  MAX_TOTAL_SIZE: 2 * 1024 * 1024 * 1024, // 2 GB across the workspace

  // Accepted input types (PDF plus images that can be converted to PDF pages)
  ACCEPTED_PDF_EXT: ['.pdf'],
  ACCEPTED_IMAGE_EXT: ['.jpg', '.jpeg', '.png'],

  // Encryption: @cantoo/pdf-lib writes AES-256 (PDF 2.0, revision 6).
  ENCRYPTION: {
    ALGORITHM: 'AES-256',
    KEY_LENGTH: 256
  },

  // UI timings (ms)
  TOAST_DURATION: 4000,
  ANIMATION_DURATION: 250,

  // Undo history depth for the workspace
  MAX_HISTORY: 15,

  // Thumbnail render width (px) for the page editor / previews
  THUMBNAIL_WIDTH: 150,

  // Feature flags
  FEATURES: {
    MERGE: true,
    SPLIT: true,
    ENCRYPT: true,
    DECRYPT: true,
    PAGE_TOOLS: true,
    METADATA: true,
    WATERMARK: true,
    PAGE_NUMBER: true,
    IMAGES_TO_PDF: true,
    PAGE_EDITOR: true
  },

  // Local storage keys
  STORAGE_KEYS: {
    USER_PREFERENCES: 'pdfToolkit_preferences',
    LAST_TAB: 'pdfToolkit_lastTab'
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
