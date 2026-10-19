// Unit tests for FileHandler (pure static methods — no DOM/browser required)
const path = require('path');
const fs = require('fs');

const code = fs.readFileSync(path.join(__dirname, '../../src/js/modules/fileHandler.js'), 'utf8');
const FileHandler = new Function(`${code}; return FileHandler;`)();

const makePDF = (name, size = 1024) => ({ name, type: 'application/pdf', size });

describe('FileHandler', () => {
  describe('formatFileSize', () => {
    test('0 bytes → "0 B"', () => expect(FileHandler.formatFileSize(0)).toBe('0 B'));
    test('1 KB → "1 KB"', () => expect(FileHandler.formatFileSize(1024)).toBe('1 KB'));
    test('1 MB → "1 MB"', () => expect(FileHandler.formatFileSize(1048576)).toBe('1 MB'));
    test('1 GB → "1 GB"', () => expect(FileHandler.formatFileSize(1024 ** 3)).toBe('1 GB'));
    test('1500 bytes → "1.46 KB"', () => expect(FileHandler.formatFileSize(1500)).toBe('1.46 KB'));
  });

  describe('extensionOf / classify', () => {
    test('extensionOf lowercases', () => expect(FileHandler.extensionOf('A.PDF')).toBe('.pdf'));
    test('classify pdf', () => expect(FileHandler.classify({ name: 'a.pdf', type: 'application/pdf' })).toBe('pdf'));
    test('classify image', () => expect(FileHandler.classify({ name: 'a.png', type: 'image/png' })).toBe('image'));
    test('classify unknown', () => expect(FileHandler.classify({ name: 'a.txt', type: 'text/plain' })).toBe(null));
  });

  describe('baseName', () => {
    test('strips extension', () => expect(FileHandler.baseName('report.v2.pdf')).toBe('report.v2'));
    test('handles no extension', () => expect(FileHandler.baseName('report')).toBe('report'));
  });

  describe('isValidPDF', () => {
    test('accepts .pdf with application/pdf', () => expect(FileHandler.isValidPDF({ name: 'doc.pdf', type: 'application/pdf' })).toBe(true));
    test('accepts .pdf with empty type', () => expect(FileHandler.isValidPDF({ name: 'doc.pdf', type: '' })).toBe(true));
    test('accepts uppercase .PDF', () => expect(FileHandler.isValidPDF({ name: 'R.PDF', type: 'application/pdf' })).toBe(true));
    test('rejects .txt', () => expect(FileHandler.isValidPDF({ name: 'n.txt', type: 'text/plain' })).toBe(false));
    test('rejects empty name', () => expect(FileHandler.isValidPDF({ name: '', type: 'application/pdf' })).toBe(false));
    test('returns a real boolean for invalid input', () => expect(FileHandler.isValidPDF({ name: undefined, type: 'application/pdf' })).toBe(false));
  });

  describe('isValidFileSize', () => {
    test('within limit', () => expect(FileHandler.isValidFileSize({ size: 100 }, 1000)).toBe(true));
    test('at limit', () => expect(FileHandler.isValidFileSize({ size: 1000 }, 1000)).toBe(true));
    test('over limit', () => expect(FileHandler.isValidFileSize({ size: 1001 }, 1000)).toBe(false));
    test('default 500MB ok', () => expect(FileHandler.isValidFileSize({ size: 500 * 1024 * 1024 })).toBe(true));
  });

  describe('validateFiles', () => {
    test('all valid PDFs', () => {
      const r = FileHandler.validateFiles([makePDF('a.pdf'), makePDF('b.pdf')]);
      expect(r.valid).toHaveLength(2);
      expect(r.invalid).toHaveLength(0);
    });
    test('rejects non-PDF by default', () => {
      const r = FileHandler.validateFiles([makePDF('a.pdf'), { name: 'b.txt', type: 'text/plain', size: 10 }]);
      expect(r.valid).toHaveLength(1);
      expect(r.invalid[0].reason).toMatch(/valid PDF/i);
    });
    test('accepts images when acceptImages is on', () => {
      const r = FileHandler.validateFiles([{ name: 'p.png', type: 'image/png', size: 10 }], { acceptImages: true });
      expect(r.valid).toHaveLength(1);
    });
    test('rejects over size limit', () => {
      const r = FileHandler.validateFiles([makePDF('big.pdf', 20 * 1024 * 1024)], { maxSize: 10 * 1024 * 1024 });
      expect(r.invalid[0].reason).toMatch(/exceed/i);
    });
    test('rejects duplicate names within a batch', () => {
      const r = FileHandler.validateFiles([makePDF('r.pdf'), makePDF('r.pdf')]);
      expect(r.valid).toHaveLength(1);
      expect(r.invalid[0].reason).toMatch(/already|duplicate/i);
    });
    test('rejects names already in the workspace', () => {
      const r = FileHandler.validateFiles([makePDF('r.pdf')], { existingNames: new Set(['r.pdf']) });
      expect(r.valid).toHaveLength(0);
      expect(r.invalid[0].reason).toMatch(/already/i);
    });
    test('allowDuplicates keeps both', () => {
      const r = FileHandler.validateFiles([makePDF('r.pdf'), makePDF('r.pdf')], { allowDuplicates: true });
      expect(r.valid).toHaveLength(2);
    });
    test('enforces total size budget', () => {
      const r = FileHandler.validateFiles([makePDF('a.pdf', 800), makePDF('b.pdf', 800)], { maxTotalSize: 1000 });
      expect(r.valid).toHaveLength(1);
      expect(r.invalid[0].reason).toMatch(/total size/i);
    });
    test('enforces maxFiles', () => {
      const r = FileHandler.validateFiles([makePDF('a.pdf'), makePDF('b.pdf'), makePDF('c.pdf')], { maxFiles: 2 });
      expect(r.errors[0]).toMatch(/maximum.*2/i);
    });
  });
});
