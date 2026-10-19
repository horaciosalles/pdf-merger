// Unit tests for CONFIG
const path = require('path');
const fs = require('fs');

const code = fs.readFileSync(path.join(__dirname, '../../src/js/config.js'), 'utf8');
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
  });

  describe('accepted file types', () => {
    test('accepts .pdf', () => {
      expect(CONFIG.ACCEPTED_PDF_EXT).toContain('.pdf');
    });
    test('accepts common image formats', () => {
      expect(CONFIG.ACCEPTED_IMAGE_EXT).toEqual(expect.arrayContaining(['.jpg', '.png']));
    });
  });

  describe('feature flags', () => {
    ['MERGE', 'SPLIT', 'ENCRYPT', 'DECRYPT', 'PAGE_TOOLS', 'METADATA',
     'WATERMARK', 'PAGE_NUMBER', 'IMAGES_TO_PDF', 'PAGE_EDITOR'].forEach(f => {
      test(`${f} is enabled`, () => {
        expect(CONFIG.FEATURES[f]).toBe(true);
      });
    });
  });

  describe('UI settings', () => {
    test('TOAST_DURATION is positive', () => {
      expect(CONFIG.TOAST_DURATION).toBeGreaterThan(0);
    });
    test('MAX_HISTORY allows undo', () => {
      expect(CONFIG.MAX_HISTORY).toBeGreaterThan(0);
    });
  });

  describe('storage keys', () => {
    test('USER_PREFERENCES key defined', () => {
      expect(CONFIG.STORAGE_KEYS.USER_PREFERENCES).toBe('pdfToolkit_preferences');
    });
    test('LAST_TAB key defined', () => {
      expect(CONFIG.STORAGE_KEYS.LAST_TAB).toBe('pdfToolkit_lastTab');
    });
  });
});
