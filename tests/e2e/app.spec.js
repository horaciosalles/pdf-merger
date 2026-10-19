// Playwright E2E tests — real user flows against real fixture PDFs.
const { test, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const FX = (name) => path.join(__dirname, '..', 'fixtures', name);

async function addFiles(page, ...names) {
  await page.setInputFiles('#fileInput', names.map(FX));
}

async function fillPassword(page, pw, confirm) {
  const inputs = page.locator('#passwordModal input[type="password"], #passwordModal input[type="text"]');
  await inputs.nth(0).fill(pw);
  if (confirm !== undefined) await inputs.nth(1).fill(confirm);
}

test.describe('PDF Toolkit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { try { localStorage.clear(); } catch (_) {} });
    await page.goto('/');
  });

  // ── Shell ────────────────────────────────────────────────────────────────
  test('loads with title, header and privacy footer', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF Toolkit/);
    await expect(page.locator('header h1')).toContainText('PDF Toolkit');
    await expect(page.locator('footer')).toContainText('No data is sent');
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.reload();
    await page.waitForTimeout(300);
    expect(errors).toEqual([]);
  });

  test('single shared dropzone and document list (no duplicate IDs)', async ({ page }) => {
    await expect(page.locator('#dropzone')).toBeVisible();
    const dupes = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
      return ids.filter((id, i) => ids.indexOf(id) !== i);
    });
    expect(dupes).toEqual([]);
  });

  // ── Tabs ─────────────────────────────────────────────────────────────────
  test.describe('tabs', () => {
    test('five tabs, Merge active by default', async ({ page }) => {
      for (const t of ['merge', 'split', 'encrypt', 'decrypt', 'tools']) {
        await expect(page.locator(`#tab-${t}`)).toBeVisible();
      }
      await expect(page.locator('#tab-merge')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#tab-content-merge')).toBeVisible();
      await expect(page.locator('#tab-content-split')).toBeHidden();
    });

    test('click switches panel and updates aria-selected', async ({ page }) => {
      await page.click('#tab-tools');
      await expect(page.locator('#tab-content-tools')).toBeVisible();
      await expect(page.locator('#tab-tools')).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('#tab-merge')).toHaveAttribute('aria-selected', 'false');
    });

    test('arrow keys move between tabs', async ({ page }) => {
      await page.focus('#tab-merge');
      await page.keyboard.press('ArrowRight');
      await expect(page.locator('#tab-content-split')).toBeVisible();
      await page.keyboard.press('ArrowLeft');
      await expect(page.locator('#tab-content-merge')).toBeVisible();
    });

    test('?tab= shortcut and #hash open the right tab', async ({ page }) => {
      await page.goto('/?tab=encrypt');
      await expect(page.locator('#tab-content-encrypt')).toBeVisible();
      await page.goto('/#tools');
      await expect(page.locator('#tab-content-tools')).toBeVisible();
    });

    test('Ctrl+A is no longer hijacked inside inputs', async ({ page }) => {
      await page.click('#tab-split');
      await page.fill('#split-range-input', '1-3');
      await page.focus('#split-range-input');
      await page.keyboard.press('Control+a');
      const selected = await page.evaluate(() => {
        const el = document.getElementById('split-range-input');
        return el.selectionEnd - el.selectionStart;
      });
      expect(selected).toBe(3);
    });
  });

  // ── Importing ────────────────────────────────────────────────────────────
  test.describe('importing', () => {
    test('adds a PDF and shows page count', async ({ page }) => {
      await addFiles(page, 'plain.pdf');
      await expect(page.locator('.file-item')).toHaveCount(1);
      await expect(page.locator('.file-item')).toContainText('3 pp');
    });

    test('rejects the same file added twice', async ({ page }) => {
      await addFiles(page, 'plain.pdf');
      await addFiles(page, 'plain.pdf');
      await expect(page.locator('.file-item')).toHaveCount(1);
      await expect(page.locator('.toast')).toContainText(['Already added']);
    });

    test('permissions-only PDF is auto-unlocked on import', async ({ page }) => {
      await addFiles(page, 'restricted_r6.pdf');
      await expect(page.locator('.file-item')).toContainText('3 pp');
      await expect(page.locator('.badge-locked')).toHaveCount(0);
    });

    test('password PDF shows Locked badge and unlocks with the password', async ({ page }) => {
      await addFiles(page, 'user_r4.pdf');
      await expect(page.locator('.badge-locked')).toBeVisible();
      await page.click('.unlock-btn');
      await fillPassword(page, 'user123');
      await page.click('#passwordModal .btn-primary');
      await expect(page.locator('.badge-locked')).toHaveCount(0);
      await expect(page.locator('.file-item')).toContainText('3 pp');
    });

    test('wrong password shows an error and keeps the file locked', async ({ page }) => {
      await addFiles(page, 'user_r4.pdf');
      await page.click('.unlock-btn');
      await fillPassword(page, 'wrong');
      await page.click('#passwordModal .btn-primary');
      await expect(page.locator('.toast-error')).toContainText(/incorrect/i);
      await expect(page.locator('.badge-locked')).toBeVisible();
    });

    test('Escape closes the password dialog cleanly', async ({ page }) => {
      await addFiles(page, 'user_r4.pdf');
      await page.click('.unlock-btn');
      await expect(page.locator('#passwordModal')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.locator('#passwordModal')).toHaveCount(0);
    });
  });

  // ── Merge ────────────────────────────────────────────────────────────────
  test('merge downloads a combined PDF and adds it to the workspace', async ({ page }) => {
    await addFiles(page, 'plain.pdf', 'restricted_r4.pdf');
    await expect(page.locator('.file-item')).toHaveCount(2);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#merge-action')]);
    expect(dl.suggestedFilename()).toBe('merged.pdf');
    await expect(page.locator('.file-item')).toHaveCount(3);
    await expect(page.locator('.file-item').nth(2)).toContainText('6 pp');
  });

  // ── Split ────────────────────────────────────────────────────────────────
  test('split into pages produces one ZIP', async ({ page }) => {
    await addFiles(page, 'plain.pdf');
    await page.click('#tab-split');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#split-individual-action')]);
    expect(dl.suggestedFilename()).toBe('plain_pages.zip');
  });

  test('extract range names output after the source', async ({ page }) => {
    await addFiles(page, 'plain.pdf');
    await page.click('#tab-split');
    await page.fill('#split-range-input', '2-end');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#split-range-action')]);
    expect(dl.suggestedFilename()).toMatch(/^plain_pages_.*\.pdf$/);
  });

  // ── Encrypt ──────────────────────────────────────────────────────────────
  test('encrypt validates confirmation and downloads an encrypted file', async ({ page }) => {
    await addFiles(page, 'plain.pdf');
    await page.click('#tab-encrypt');
    await page.click('#encrypt-action');
    await fillPassword(page, 'abc', 'xyz');
    await page.click('#passwordModal .btn-primary');
    await expect(page.locator('#passwordModal .form-error')).toContainText(/match/i);
    await fillPassword(page, 'abc', 'abc');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#passwordModal .btn-primary')]);
    const body = fs.readFileSync(await dl.path()).toString('latin1');
    expect(body.startsWith('%PDF-')).toBe(true);
    expect(body).toContain('/Encrypt');
  });

  // ── Unlock tab ───────────────────────────────────────────────────────────
  test('try-passwords unlocks with the right candidate', async ({ page }) => {
    await addFiles(page, 'user_r3.pdf');
    await page.click('#tab-decrypt');
    await page.click('#try-passwords-action');
    await page.fill('#textareaModal textarea', 'nope\nuser123\nother');
    await page.click('#textareaModal .btn-primary');
    await expect(page.locator('.toast-success').last()).toContainText('user123');
    await expect(page.locator('.badge-locked')).toHaveCount(0);
  });

  // ── Tools / workspace ────────────────────────────────────────────────────
  test('delete pages then undo restores page count', async ({ page }) => {
    await addFiles(page, 'plain.pdf');
    await page.click('#tab-tools');
    await page.fill('#delete-pages-input', '1');
    await page.click('#tool-delete-action');
    await expect(page.locator('.file-item')).toContainText('2 pp');
    await page.click('#ws-undo');
    await expect(page.locator('.file-item')).toContainText('3 pp');
  });

  test('metadata dialog renders malicious title as text, not HTML', async ({ page }) => {
    await addFiles(page, 'plain.pdf');
    await page.click('#tab-tools');
    await page.click('#tool-metadata-action');
    const title = page.locator('#metadataModal input').first();
    await expect(title).toHaveValue('Secret <script>alert(1)</script>');
    expect(await page.locator('#metadataModal script').count()).toBe(0);
  });

  test('page editor renders thumbnails and applies a delete', async ({ page }) => {
    await addFiles(page, 'plain.pdf');
    await page.click('#tab-tools');
    await page.click('#tool-editor-action');
    await expect(page.locator('.pe-card')).toHaveCount(3, { timeout: 15000 });
    await page.locator('.pe-card').first().click();
    await page.click('.pe-toolbar .btn-danger');
    await expect(page.locator('.pe-card')).toHaveCount(2);
    await page.click('#pageEditorModal .modal-buttons .btn-primary');
    await expect(page.locator('.file-item')).toContainText('2 pp');
  });

  test('export pages as PNG produces a ZIP', async ({ page }) => {
    await addFiles(page, 'plain.pdf');
    await page.click('#tab-tools');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#tool-images-action')]);
    expect(dl.suggestedFilename()).toBe('plain_images.zip');
  });

  test('chained edits then download keeps the original name', async ({ page }) => {
    await addFiles(page, 'plain.pdf');
    await page.click('#tab-tools');
    await page.fill('#watermark-text', 'DRAFT');
    await page.click('#tool-watermark-action');
    await expect(page.locator('.toast-success').last()).toContainText('Watermark');
    await page.click('#tool-pagenum-action');
    await expect(page.locator('.toast-success').last()).toContainText('Page numbers');
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#ws-download')]);
    expect(dl.suggestedFilename()).toBe('plain.pdf');
  });
});

// ── file:// mode (the app must work without a server) ──────────────────────
test('works from file:// including the pdf.js page editor', async ({ page }) => {
  const url = 'file:///' + path.join(__dirname, '..', '..', 'index.html').replace(/\\/g, '/');
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.setInputFiles('#fileInput', [FX('plain.pdf')]);
  await expect(page.locator('.file-item')).toContainText('3 pp');
  await page.click('#tab-tools');
  await page.click('#tool-editor-action');
  await expect(page.locator('.pe-card')).toHaveCount(3, { timeout: 20000 });
  expect(errors).toEqual([]);
});
