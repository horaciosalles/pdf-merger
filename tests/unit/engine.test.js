/**
 * Engine tests — exercise the real PDF operations against real encrypted
 * fixtures (RC4-40/128, AES-128, AES-256, and permissions-only files).
 * These are the tests that would have caught the previously non-functional
 * encrypt/decrypt implementation.
 */
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '../..');
const LIB = path.join(ROOT, 'src/lib/pdf-lib.min.js');
const FX = path.join(ROOT, 'tests/fixtures');

global.window = { PDFLib: require(LIB) };

function loadClass(file, returnName, extraNames = [], extraValues = []) {
  const code = fs.readFileSync(path.join(ROOT, 'src/js/modules', file), 'utf8');
  const names = ['window', 'module', ...extraNames];
  const fn = new Function(...names, `${code}; return ${returnName};`);
  return fn(global.window, undefined, ...extraValues);
}

const PDFHelper = loadClass('pdfHelper.js', 'PDFHelper');
const PDFMerger = loadClass('merger.js', 'PDFMerger', ['PDFHelper'], [PDFHelper]);
const PDFSplitter = loadClass('splitter.js', 'PDFSplitter', ['PDFHelper'], [PDFHelper]);
const PDFEncryptor = loadClass('encryptor.js', 'PDFEncryptor', ['PDFHelper'], [PDFHelper]);
const PDFProcessor = loadClass('processor.js', 'PDFProcessor', ['PDFHelper'], [PDFHelper]);

const bytes = (name) => new Uint8Array(fs.readFileSync(path.join(FX, name)));
const pagesOf = async (b) => (await PDFHelper.loadPDF(b)).getPageCount();

const HANDLERS = [
  ['restricted_r2.pdf', 'RC4-40 permissions-only'],
  ['restricted_r3.pdf', 'RC4-128 permissions-only'],
  ['restricted_r4.pdf', 'AES-128 permissions-only'],
  ['restricted_r6.pdf', 'AES-256 permissions-only'],
  ['user_r2.pdf', 'RC4-40 user password'],
  ['user_r3.pdf', 'RC4-128 user password'],
  ['user_r4.pdf', 'AES-128 user password'],
  ['user_r6.pdf', 'AES-256 user password']
];

describe('encryption analysis', () => {
  test('plain PDF is not encrypted', async () => {
    expect(await PDFHelper.analyzeEncryption(bytes('plain.pdf'))).toEqual({ encrypted: false, needsPassword: false });
  });
  test.each(HANDLERS.filter(h => h[0].startsWith('restricted')))('%s is encrypted but needs no password', async (file) => {
    expect(await PDFHelper.analyzeEncryption(bytes(file))).toEqual({ encrypted: true, needsPassword: false });
  });
  test.each(HANDLERS.filter(h => h[0].startsWith('user')))('%s requires a password', async (file) => {
    expect(await PDFHelper.analyzeEncryption(bytes(file))).toEqual({ encrypted: true, needsPassword: true });
  });
});

describe('decrypt / unlock', () => {
  test.each(HANDLERS.filter(h => h[0].startsWith('restricted')))('removeRestrictions unlocks %s with no password', async (file) => {
    const out = await PDFEncryptor.removeRestrictions(bytes(file));
    expect((await PDFHelper.analyzeEncryption(out)).encrypted).toBe(false);
    expect(await pagesOf(out)).toBe(3);
  });

  test.each(HANDLERS.filter(h => h[0].startsWith('user')))('decrypt opens %s with the user password', async (file) => {
    const out = await PDFEncryptor.decrypt(bytes(file), 'user123');
    expect((await PDFHelper.analyzeEncryption(out)).encrypted).toBe(false);
  });

  test('decrypt opens with the owner password too', async () => {
    const out = await PDFEncryptor.decrypt(bytes('user_r6.pdf'), 'owner456');
    expect((await PDFHelper.analyzeEncryption(out)).encrypted).toBe(false);
  });

  test('wrong password is rejected', async () => {
    await expect(PDFEncryptor.decrypt(bytes('user_r6.pdf'), 'nope')).rejects.toThrow(/incorrect/i);
  });

  test('tryPasswords finds the right one in a list', async () => {
    const found = await PDFEncryptor.tryPasswords(bytes('user_r3.pdf'), ['a', 'user123', 'b']);
    expect(found).not.toBeNull();
    expect(found.password).toBe('user123');
  });

  test('tryPasswords returns null when none match', async () => {
    expect(await PDFEncryptor.tryPasswords(bytes('user_r3.pdf'), ['a', 'b'])).toBeNull();
  });
});

describe('encrypt', () => {
  test('produces a file that needs the password and rejects wrong ones', async () => {
    const enc = await PDFEncryptor.encrypt(bytes('plain.pdf'), 'secret', { permissions: { copying: false } });
    expect(await PDFHelper.analyzeEncryption(enc)).toEqual({ encrypted: true, needsPassword: true });
    const back = await PDFEncryptor.decrypt(enc, 'secret');
    expect(await pagesOf(back)).toBe(3);
    await expect(PDFEncryptor.decrypt(enc, 'wrong')).rejects.toThrow();
  });

  test('empty password is rejected', async () => {
    await expect(PDFEncryptor.encrypt(bytes('plain.pdf'), '')).rejects.toThrow(/empty/i);
  });
});

describe('merge', () => {
  test('merges two documents into one', async () => {
    const out = await PDFMerger.merge([{ bytes: bytes('plain.pdf') }, { bytes: bytes('plain.pdf') }]);
    expect(await pagesOf(out)).toBe(6);
  });
  test('refuses fewer than two', async () => {
    await expect(PDFMerger.merge([{ bytes: bytes('plain.pdf') }])).rejects.toThrow(/at least 2/i);
  });
});

describe('split', () => {
  test('extractRange returns the requested pages', async () => {
    expect(await pagesOf(await PDFSplitter.extractRange(bytes('plain.pdf'), '1-2'))).toBe(2);
  });
  test('splitIntoPages returns one PDF per page', async () => {
    const parts = await PDFSplitter.splitIntoPages(bytes('plain.pdf'));
    expect(parts).toHaveLength(3);
  });
  test('splitByCount chunks correctly', async () => {
    const parts = await PDFSplitter.splitByCount(bytes('plain.pdf'), 2);
    expect(parts.map(p => `${p.from}-${p.to}`)).toEqual(['1-2', '3-3']);
  });
});

describe('page operations', () => {
  const plain = () => bytes('plain.pdf');
  test('delete pages', async () => expect(await pagesOf(await PDFProcessor.deletePages(plain(), [0]))).toBe(2));
  test('delete-all is refused', async () => await expect(PDFProcessor.deletePages(plain(), [0, 1, 2])).rejects.toThrow(/all pages/i));
  test('duplicate pages', async () => expect(await pagesOf(await PDFProcessor.duplicatePages(plain(), [0]))).toBe(4));
  test('reverse keeps page count', async () => expect(await pagesOf(await PDFProcessor.reversePages(plain()))).toBe(3));
  test('insert blank page', async () => expect(await pagesOf(await PDFProcessor.insertBlankPage(plain()))).toBe(4));
  test('rotate all pages succeeds', async () => expect((await PDFProcessor.rotatePages(plain(), [], 90)).length).toBeGreaterThan(0));
  test('rebuild (reorder + rotate) preserves count', async () => {
    const model = [{ src: 2, rotate: 90 }, { src: 0, rotate: 0 }, { src: 1, rotate: 180 }];
    expect(await pagesOf(await PDFProcessor.rebuild(plain(), model))).toBe(3);
  });
});

describe('content & metadata', () => {
  test('watermark flags unsupported characters', async () => {
    const res = await PDFProcessor.addWatermark(bytes('plain.pdf'), 'OK ✓ 漢', {});
    expect(res.warning).toMatch(/not supported/i);
    expect(res.bytes.length).toBeGreaterThan(0);
  });
  test('watermark with plain ASCII has no warning', async () => {
    const res = await PDFProcessor.addWatermark(bytes('plain.pdf'), 'DRAFT', {});
    expect(res.warning).toBeUndefined();
  });
  test('page numbers render', async () => {
    expect((await PDFProcessor.addPageNumbers(bytes('plain.pdf'), { skipFirst: true })).length).toBeGreaterThan(0);
  });
  test('removeMetadata clears title and author', async () => {
    const before = await PDFProcessor.getMetadata(bytes('plain.pdf'));
    expect(before.title).toMatch(/Secret/);
    const cleaned = await PDFProcessor.removeMetadata(bytes('plain.pdf'));
    const after = await PDFProcessor.getMetadata(cleaned);
    expect(after.title).toBe('');
    expect(after.author).toBe('');
  });
  test('setMetadata writes new values', async () => {
    const out = await PDFProcessor.setMetadata(bytes('plain.pdf'), { title: 'New Title', author: 'Me' });
    const meta = await PDFProcessor.getMetadata(out);
    expect(meta.title).toBe('New Title');
    expect(meta.author).toBe('Me');
  });
});
