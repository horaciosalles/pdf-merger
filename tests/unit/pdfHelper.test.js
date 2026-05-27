// Unit tests for PDFHelper.parsePageRange (pure function — no pdf-lib required)
const path = require('path');
const fs = require('fs');

const code = fs.readFileSync(
  path.join(__dirname, '../../src/js/modules/pdfHelper.js'),
  'utf8'
);
// Provide a stub window so method bodies that reference window.PDFLib don't
// throw ReferenceError when the class is defined (they won't be called here).
const PDFHelper = new Function('window', `${code}; return PDFHelper;`)({
  PDFLib: {},
});

const parsePageRange = PDFHelper.parsePageRange.bind(PDFHelper);

describe('PDFHelper.parsePageRange', () => {
  describe('single pages', () => {
    test('"1" on 10-page doc → [0] (0-indexed)', () => {
      expect(parsePageRange('1', 10)).toEqual([0]);
    });

    test('"5" on 10-page doc → [4]', () => {
      expect(parsePageRange('5', 10)).toEqual([4]);
    });

    test('"10" on 10-page doc → [9] (last page)', () => {
      expect(parsePageRange('10', 10)).toEqual([9]);
    });

    test('"1" on 1-page doc → [0]', () => {
      expect(parsePageRange('1', 1)).toEqual([0]);
    });
  });

  describe('page ranges', () => {
    test('"1-5" → [0,1,2,3,4]', () => {
      expect(parsePageRange('1-5', 10)).toEqual([0, 1, 2, 3, 4]);
    });

    test('"3-7" → [2,3,4,5,6]', () => {
      expect(parsePageRange('3-7', 10)).toEqual([2, 3, 4, 5, 6]);
    });

    test('"1-10" covers all pages of a 10-page doc', () => {
      expect(parsePageRange('1-10', 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    test('single-page range "5-5" → [4]', () => {
      expect(parsePageRange('5-5', 10)).toEqual([4]);
    });
  });

  describe('comma-separated pages', () => {
    test('"1,3,5" → [0,2,4]', () => {
      expect(parsePageRange('1,3,5', 10)).toEqual([0, 2, 4]);
    });

    test('"2,4,6" → [1,3,5]', () => {
      expect(parsePageRange('2,4,6', 10)).toEqual([1, 3, 5]);
    });

    test('single entry "7" → [6]', () => {
      expect(parsePageRange('7', 10)).toEqual([6]);
    });
  });

  describe('mixed ranges and individual pages', () => {
    test('"1-3,7" → [0,1,2,6]', () => {
      expect(parsePageRange('1-3,7', 10)).toEqual([0, 1, 2, 6]);
    });

    test('"1,3-5,8" → [0,2,3,4,7]', () => {
      expect(parsePageRange('1,3-5,8', 10)).toEqual([0, 2, 3, 4, 7]);
    });

    test('"2-4,6,8-10" → [1,2,3,5,7,8,9]', () => {
      expect(parsePageRange('2-4,6,8-10', 10)).toEqual([1, 2, 3, 5, 7, 8, 9]);
    });
  });

  describe('deduplication', () => {
    test('overlapping ranges "1-3,2-4" deduplicates to [0,1,2,3]', () => {
      expect(parsePageRange('1-3,2-4', 5)).toEqual([0, 1, 2, 3]);
    });

    test('duplicate single pages "1,1,1" deduplicate to [0]', () => {
      expect(parsePageRange('1,1,1', 5)).toEqual([0]);
    });

    test('page also included in a range deduplicates', () => {
      const result = parsePageRange('1-5,3', 10);
      const unique = [...new Set(result)];
      expect(result).toEqual(unique);
    });
  });

  describe('whitespace handling', () => {
    test('spaces around commas are trimmed', () => {
      expect(parsePageRange('1, 3, 5', 10)).toEqual([0, 2, 4]);
    });

    test('spaces around dashes are trimmed', () => {
      expect(parsePageRange('1 - 5', 10)).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('invalid inputs — should throw', () => {
    test('throws for page 0 (1-indexed; 0 is invalid)', () => {
      expect(() => parsePageRange('0', 10)).toThrow();
    });

    test('throws for page number exceeding total', () => {
      expect(() => parsePageRange('11', 10)).toThrow();
    });

    test('throws for reversed range "5-1"', () => {
      expect(() => parsePageRange('5-1', 10)).toThrow();
    });

    test('throws for negative page number', () => {
      expect(() => parsePageRange('-1', 10)).toThrow();
    });

    test('throws for range end beyond total "8-12" on 10-page doc', () => {
      expect(() => parsePageRange('8-12', 10)).toThrow();
    });

    test('throws for range start of 0', () => {
      expect(() => parsePageRange('0-5', 10)).toThrow();
    });
  });
});
