// Unit tests for CONFIG
// Uses new Function() to load vanilla JS source (no ES module exports)
const path = require('path');
const fs = require('fs');

const code = fs.readFileSync(
  path.join(__dirname, '../../src/js/config.js'),
  'utf8'
);
const CONFIG = new Function(`${code}; return CONFIG;`)();

describe('CONFIG', () => {
  describe('file size limits', () => {
    test('MAX_FILE_SIZE is 500 MB', () => {
      expect(CONFIG.MAX_FILE_SIZE).toBe(500 * 1024 * 1024);
    });

    test('MAX_TOTAL_SIZE is 2 GB', () => {
      expect(CONFIG.MAX_TOTAL_SIZE).toBe(2 * 1024 * 1024 * 1024);
    });

    test('MAX_FILE_SIZE is less than MAX_TOTAL_SIZE', () => {
      expect(CONFIG.MAX_FILE_SIZE).toBeLessThan(CONFIG.MAX_TOTAL_SIZE);
    });
  });

  describe('encryption settings', () => {
    test('algorithm is AES-256', () => {
      expect(CONFIG.ENCRYPTION.ALGORITHM).toBe('AES-256');
    });

    test('key length is 256', () => {
      expect(CONFIG.ENCRYPTION.KEY_LENGTH).toBe(256);
    });

    test('padding is PKCS7', () => {
      expect(CONFIG.ENCRYPTION.PADDING).toBe('PKCS7');
    });
  });

  describe('feature flags', () => {
    const features = [
      'MERGE', 'SPLIT', 'ENCRYPT', 'DECRYPT', 'PAGE_TOOLS',
      'COMPRESSION', 'METADATA', 'WATERMARK', 'PAGE_NUMBER',
      'BATCH_PROCESS', 'WORKER',
    ];

    features.forEach(feature => {
      test(`${feature} feature flag is enabled`, () => {
        expect(CONFIG.FEATURES[feature]).toBe(true);
      });
    });
  });

  describe('UI settings', () => {
    test('TOAST_DURATION is 3000ms', () => {
      expect(CONFIG.TOAST_DURATION).toBe(3000);
    });

    test('ANIMATION_DURATION is 300ms', () => {
      expect(CONFIG.ANIMATION_DURATION).toBe(300);
    });
  });

  describe('storage keys', () => {
    test('USER_PREFERENCES key is pdfToolkit_preferences', () => {
      expect(CONFIG.STORAGE_KEYS.USER_PREFERENCES).toBe('pdfToolkit_preferences');
    });

    test('RECENT_FILES key is pdfToolkit_recentFiles', () => {
      expect(CONFIG.STORAGE_KEYS.RECENT_FILES).toBe('pdfToolkit_recentFiles');
    });

    test('CACHE key is pdfToolkit_cache', () => {
      expect(CONFIG.STORAGE_KEYS.CACHE).toBe('pdfToolkit_cache');
    });
  });

  describe('compression presets', () => {
    test('HIGH preset: quality 0.95, 300 DPI', () => {
      expect(CONFIG.COMPRESSION_PRESETS.HIGH).toEqual({ quality: 0.95, imageDPI: 300 });
    });

    test('MEDIUM preset: quality 0.75, 150 DPI', () => {
      expect(CONFIG.COMPRESSION_PRESETS.MEDIUM).toEqual({ quality: 0.75, imageDPI: 150 });
    });

    test('LOW preset: quality 0.5, 72 DPI', () => {
      expect(CONFIG.COMPRESSION_PRESETS.LOW).toEqual({ quality: 0.5, imageDPI: 72 });
    });
  });

  describe('default permissions', () => {
    test('printing is allowed by default', () => {
      expect(CONFIG.PERMISSIONS.PRINT).toBe(true);
    });

    test('copying is allowed by default', () => {
      expect(CONFIG.PERMISSIONS.COPY).toBe(true);
    });

    test('editing is allowed by default', () => {
      expect(CONFIG.PERMISSIONS.EDIT).toBe(true);
    });

    test('form filling is allowed by default', () => {
      expect(CONFIG.PERMISSIONS.FORM_FILL).toBe(true);
    });
  });
});
