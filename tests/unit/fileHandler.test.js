// Unit tests for FileHandler (pure static methods only — no DOM required)
const path = require('path');
const fs = require('fs');

const code = fs.readFileSync(
  path.join(__dirname, '../../src/js/modules/fileHandler.js'),
  'utf8'
);
const FileHandler = new Function(`${code}; return FileHandler;`)();

// Helper: create a minimal mock File-like object
const makePDF = (name, size = 1024) => ({
  name,
  type: 'application/pdf',
  size,
});

describe('FileHandler', () => {
  describe('formatFileSize', () => {
    test('0 bytes → "0 B"', () => {
      expect(FileHandler.formatFileSize(0)).toBe('0 B');
    });

    test('1 KB (1024 bytes) → "1 KB"', () => {
      expect(FileHandler.formatFileSize(1024)).toBe('1 KB');
    });

    test('1 MB (1048576 bytes) → "1 MB"', () => {
      expect(FileHandler.formatFileSize(1048576)).toBe('1 MB');
    });

    test('1 GB → "1 GB"', () => {
      expect(FileHandler.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    test('1500 bytes → "1.46 KB"', () => {
      expect(FileHandler.formatFileSize(1500)).toBe('1.46 KB');
    });

    test('500 MB → "500 MB"', () => {
      expect(FileHandler.formatFileSize(500 * 1024 * 1024)).toBe('500 MB');
    });

    test('1.5 MB → "1.5 MB"', () => {
      expect(FileHandler.formatFileSize(1.5 * 1024 * 1024)).toBe('1.5 MB');
    });
  });

  describe('isValidPDF', () => {
    test('accepts .pdf with application/pdf type', () => {
      expect(FileHandler.isValidPDF({ name: 'doc.pdf', type: 'application/pdf' })).toBe(true);
    });

    test('accepts .pdf with empty type (OS/browser variation)', () => {
      expect(FileHandler.isValidPDF({ name: 'doc.pdf', type: '' })).toBe(true);
    });

    test('accepts uppercase .PDF extension', () => {
      expect(FileHandler.isValidPDF({ name: 'REPORT.PDF', type: 'application/pdf' })).toBe(true);
    });

    test('accepts mixed-case .Pdf extension', () => {
      expect(FileHandler.isValidPDF({ name: 'file.Pdf', type: 'application/pdf' })).toBe(true);
    });

    test('rejects .txt file', () => {
      expect(FileHandler.isValidPDF({ name: 'note.txt', type: 'text/plain' })).toBe(false);
    });

    test('rejects .jpg file', () => {
      expect(FileHandler.isValidPDF({ name: 'photo.jpg', type: 'image/jpeg' })).toBe(false);
    });

    test('rejects .docx file', () => {
      expect(FileHandler.isValidPDF({ name: 'resume.docx', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })).toBe(false);
    });

    test('rejects empty file name', () => {
      expect(FileHandler.isValidPDF({ name: '', type: 'application/pdf' })).toBe(false);
    });

    test('rejects undefined file name', () => {
      expect(FileHandler.isValidPDF({ name: undefined, type: 'application/pdf' })).toBe(false);
    });

    test('rejects file named "pdf" without extension', () => {
      expect(FileHandler.isValidPDF({ name: 'pdf', type: 'application/pdf' })).toBe(false);
    });
  });

  describe('isValidFileSize', () => {
    test('accepts file well within limit', () => {
      expect(FileHandler.isValidFileSize({ size: 100 }, 1000)).toBe(true);
    });

    test('accepts file exactly at limit', () => {
      expect(FileHandler.isValidFileSize({ size: 1000 }, 1000)).toBe(true);
    });

    test('rejects file 1 byte over limit', () => {
      expect(FileHandler.isValidFileSize({ size: 1001 }, 1000)).toBe(false);
    });

    test('accepts zero-byte file', () => {
      expect(FileHandler.isValidFileSize({ size: 0 }, 1000)).toBe(true);
    });

    test('default limit allows exactly 500 MB', () => {
      expect(FileHandler.isValidFileSize({ size: 500 * 1024 * 1024 })).toBe(true);
    });

    test('default limit rejects 500 MB + 1 byte', () => {
      expect(FileHandler.isValidFileSize({ size: 500 * 1024 * 1024 + 1 })).toBe(false);
    });
  });

  describe('validateFiles', () => {
    test('returns all files as valid when they are all good PDFs', () => {
      const files = [makePDF('a.pdf'), makePDF('b.pdf'), makePDF('c.pdf')];
      const result = FileHandler.validateFiles(files);
      expect(result.valid).toHaveLength(3);
      expect(result.invalid).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    test('returns empty valid array for empty input', () => {
      const result = FileHandler.validateFiles([]);
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    test('rejects non-PDF files with a reason', () => {
      const files = [
        makePDF('good.pdf'),
        { name: 'bad.txt', type: 'text/plain', size: 100 },
      ];
      const result = FileHandler.validateFiles(files);
      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].file).toBe('bad.txt');
      expect(result.invalid[0].reason).toMatch(/valid PDF/i);
    });

    test('rejects files over the custom size limit', () => {
      const files = [makePDF('large.pdf', 20 * 1024 * 1024)];
      const result = FileHandler.validateFiles(files, { maxSize: 10 * 1024 * 1024 });
      expect(result.valid).toHaveLength(0);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].reason).toMatch(/exceed/i);
    });

    test('rejects duplicate file names by default', () => {
      const files = [makePDF('report.pdf'), makePDF('report.pdf')];
      const result = FileHandler.validateFiles(files);
      expect(result.valid).toHaveLength(1);
      expect(result.invalid).toHaveLength(1);
      expect(result.invalid[0].reason).toMatch(/duplicate/i);
    });

    test('allows duplicate names when allowDuplicates is true', () => {
      const files = [makePDF('report.pdf'), makePDF('report.pdf')];
      const result = FileHandler.validateFiles(files, { allowDuplicates: true });
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(0);
    });

    test('enforces maxFiles limit and reports error', () => {
      const files = [makePDF('a.pdf'), makePDF('b.pdf'), makePDF('c.pdf')];
      const result = FileHandler.validateFiles(files, { maxFiles: 2 });
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(/maximum.*2/i);
      expect(result.valid).toHaveLength(0);
    });

    test('handles mixed valid/invalid files', () => {
      const files = [
        makePDF('ok.pdf'),
        { name: 'bad.png', type: 'image/png', size: 500 },
        makePDF('also-ok.pdf'),
        makePDF('too-big.pdf', 2 * 1024 * 1024),
      ];
      const result = FileHandler.validateFiles(files, { maxSize: 1 * 1024 * 1024 });
      expect(result.valid).toHaveLength(2);
      expect(result.invalid).toHaveLength(2);
    });

    test('valid array contains the actual file objects', () => {
      const file = makePDF('test.pdf');
      const result = FileHandler.validateFiles([file]);
      expect(result.valid[0]).toBe(file);
    });
  });
});
