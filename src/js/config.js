/**
 * PDF Toolkit Configuration
 * All configuration settings for the application
 */

const CONFIG = {
  // File size limits (in bytes)
  MAX_FILE_SIZE: 500 * 1024 * 1024, // 500 MB
  MAX_TOTAL_SIZE: 2 * 1024 * 1024 * 1024, // 2 GB
  
  // Compression presets
  COMPRESSION_PRESETS: {
    HIGH: { quality: 0.95, imageDPI: 300 },
    MEDIUM: { quality: 0.75, imageDPI: 150 },
    LOW: { quality: 0.5, imageDPI: 72 }
  },
  
  // Encryption settings
  ENCRYPTION: {
    ALGORITHM: 'AES-256',
    KEY_LENGTH: 256,
    PADDING: 'PKCS7'
  },
  
  // Permissions for encryption
  PERMISSIONS: {
    PRINT: true,
    COPY: true,
    EDIT: true,
    FORM_FILL: true
  },
  
  // UI timeouts
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: 300,
  
  // Feature flags
  FEATURES: {
    MERGE: true,
    SPLIT: true,
    ENCRYPT: true,
    DECRYPT: true,
    PAGE_TOOLS: true,
    COMPRESSION: true,
    METADATA: true,
    WATERMARK: true,
    PAGE_NUMBER: true,
    BATCH_PROCESS: true,
    WORKER: true
  },
  
  // Worker configuration
  WORKER_ENABLED: typeof(Worker) !== 'undefined',
  WORKER_PATH: './src/js/workers/pdfWorker.js',
  
  // Local storage keys
  STORAGE_KEYS: {
    USER_PREFERENCES: 'pdfToolkit_preferences',
    RECENT_FILES: 'pdfToolkit_recentFiles',
    CACHE: 'pdfToolkit_cache'
  }
};

// CONFIG is a global variable — no export needed
