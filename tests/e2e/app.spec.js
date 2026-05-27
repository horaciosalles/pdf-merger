// Playwright E2E tests for PDF Toolkit UI
const { test, expect } = require('@playwright/test');

test.describe('PDF Toolkit', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  // ── Page load ────────────────────────────────────────────────────────────
  test('loads with correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/PDF Toolkit/);
  });

  test('shows app heading in header', async ({ page }) => {
    await expect(page.locator('header h1')).toContainText('PDF Toolkit');
  });

  test('shows privacy notice in header', async ({ page }) => {
    await expect(page.locator('header')).toContainText('100% Private');
  });

  test('shows footer privacy statement', async ({ page }) => {
    await expect(page.locator('footer')).toContainText('100% Private');
    await expect(page.locator('footer')).toContainText('No data is sent');
  });

  // ── Tab navigation ────────────────────────────────────────────────────────
  test.describe('tab navigation', () => {
    test('all five tab buttons are visible', async ({ page }) => {
      for (const tab of ['merge', 'split', 'encrypt', 'decrypt', 'tools']) {
        await expect(page.locator(`#tab-${tab}`)).toBeVisible();
      }
    });

    test('Merge tab is active by default', async ({ page }) => {
      await expect(page.locator('#tab-merge')).toHaveClass(/active/);
    });

    test('Merge content is visible on load', async ({ page }) => {
      await expect(page.locator('#tab-content-merge')).toBeVisible();
    });

    test('non-Merge tab content is hidden on load', async ({ page }) => {
      for (const tab of ['split', 'encrypt', 'decrypt', 'tools']) {
        await expect(page.locator(`#tab-content-${tab}`)).not.toBeVisible();
      }
    });

    test('clicking Split switches to Split content', async ({ page }) => {
      await page.click('#tab-split');
      await expect(page.locator('#tab-content-split')).toBeVisible();
      await expect(page.locator('#tab-content-merge')).not.toBeVisible();
    });

    test('clicking Encrypt switches to Encrypt content', async ({ page }) => {
      await page.click('#tab-encrypt');
      await expect(page.locator('#tab-content-encrypt')).toBeVisible();
    });

    test('clicking Decrypt switches to Decrypt content', async ({ page }) => {
      await page.click('#tab-decrypt');
      await expect(page.locator('#tab-content-decrypt')).toBeVisible();
    });

    test('clicking Tools switches to Tools content', async ({ page }) => {
      await page.click('#tab-tools');
      await expect(page.locator('#tab-content-tools')).toBeVisible();
    });

    test('clicked tab button gains active class', async ({ page }) => {
      await page.click('#tab-split');
      await expect(page.locator('#tab-split')).toHaveClass(/active/);
      await expect(page.locator('#tab-merge')).not.toHaveClass(/active/);
    });

    test('switching tabs back shows previous content again', async ({ page }) => {
      await page.click('#tab-split');
      await page.click('#tab-merge');
      await expect(page.locator('#tab-content-merge')).toBeVisible();
      await expect(page.locator('#tab-content-split')).not.toBeVisible();
    });
  });

  // ── Merge tab ─────────────────────────────────────────────────────────────
  test.describe('Merge tab', () => {
    test('shows "Merge PDFs" heading', async ({ page }) => {
      await expect(page.locator('#tab-content-merge h2')).toContainText('Merge PDFs');
    });

    test('shows file drop zone', async ({ page }) => {
      await expect(page.locator('#tab-content-merge .dropzone')).toBeVisible();
    });

    test('drop zone has helpful text', async ({ page }) => {
      await expect(page.locator('#tab-content-merge .dropzone')).toContainText('Drop PDF files here');
    });

    test('shows Merge PDFs action button', async ({ page }) => {
      await expect(page.locator('#merge-action')).toBeVisible();
      await expect(page.locator('#merge-action')).toContainText('Merge PDFs');
    });
  });

  // ── Split tab ─────────────────────────────────────────────────────────────
  test.describe('Split tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('#tab-split');
    });

    test('shows "Split PDFs" heading', async ({ page }) => {
      await expect(page.locator('#tab-content-split h2')).toContainText('Split PDFs');
    });

    test('shows file drop zone', async ({ page }) => {
      await expect(page.locator('#tab-content-split .dropzone')).toBeVisible();
    });

    test('shows "Split Into Pages" button', async ({ page }) => {
      await expect(page.locator('#split-individual-action')).toBeVisible();
    });

    test('shows page-range input with correct placeholder', async ({ page }) => {
      await expect(page.locator('#split-range-input')).toBeVisible();
      await expect(page.locator('#split-range-input')).toHaveAttribute('placeholder', 'e.g., 1-5,7,10-15');
    });

    test('shows "Extract Range" button', async ({ page }) => {
      await expect(page.locator('#split-range-action')).toBeVisible();
    });

    test('shows pages-per-file number input', async ({ page }) => {
      await expect(page.locator('#split-count-input')).toBeVisible();
      await expect(page.locator('#split-count-input')).toHaveAttribute('type', 'number');
    });

    test('shows "Split by Count" button', async ({ page }) => {
      await expect(page.locator('#split-count-action')).toBeVisible();
    });

    test('count input has sensible default value', async ({ page }) => {
      const value = await page.locator('#split-count-input').inputValue();
      expect(parseInt(value, 10)).toBeGreaterThan(0);
    });
  });

  // ── Encrypt tab ───────────────────────────────────────────────────────────
  test.describe('Encrypt tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('#tab-encrypt');
    });

    test('shows "Encrypt PDF" heading', async ({ page }) => {
      await expect(page.locator('#tab-content-encrypt h2')).toContainText('Encrypt PDF');
    });

    test('shows file drop zone', async ({ page }) => {
      await expect(page.locator('#tab-content-encrypt .dropzone')).toBeVisible();
    });

    test('shows encrypt action button', async ({ page }) => {
      await expect(page.locator('#encrypt-action')).toBeVisible();
    });

    test('encrypt button text references password', async ({ page }) => {
      const text = await page.locator('#encrypt-action').innerText();
      expect(text.toLowerCase()).toMatch(/password|encrypt/);
    });
  });

  // ── Decrypt tab ───────────────────────────────────────────────────────────
  test.describe('Decrypt tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('#tab-decrypt');
    });

    test('shows "Decrypt PDF" heading', async ({ page }) => {
      await expect(page.locator('#tab-content-decrypt h2')).toContainText('Decrypt PDF');
    });

    test('shows file drop zone', async ({ page }) => {
      await expect(page.locator('#tab-content-decrypt .dropzone')).toBeVisible();
    });

    test('shows decrypt action button', async ({ page }) => {
      await expect(page.locator('#decrypt-action')).toBeVisible();
    });

    test('decrypt button text references password', async ({ page }) => {
      const text = await page.locator('#decrypt-action').innerText();
      expect(text.toLowerCase()).toMatch(/password|decrypt/);
    });
  });

  // ── Tools tab ─────────────────────────────────────────────────────────────
  test.describe('Tools tab', () => {
    test.beforeEach(async ({ page }) => {
      await page.click('#tab-tools');
    });

    test('shows "PDF Tools" heading', async ({ page }) => {
      await expect(page.locator('#tab-content-tools h2')).toContainText('PDF Tools');
    });

    test('shows file drop zone', async ({ page }) => {
      await expect(page.locator('#tab-content-tools .dropzone')).toBeVisible();
    });

    test('Delete Pages: shows input and button', async ({ page }) => {
      await expect(page.locator('#delete-pages-input')).toBeVisible();
      await expect(page.locator('#tool-delete-action')).toBeVisible();
    });

    test('Delete Pages: input has correct placeholder', async ({ page }) => {
      await expect(page.locator('#delete-pages-input')).toHaveAttribute('placeholder', 'e.g., 1-5,7,10-15');
    });

    test('Rotate Pages: shows angle select and button', async ({ page }) => {
      await expect(page.locator('#rotate-degrees')).toBeVisible();
      await expect(page.locator('#tool-rotate-action')).toBeVisible();
    });

    test('Rotate Pages: dropdown has 90°, 180°, 270° options', async ({ page }) => {
      for (const val of ['90', '180', '270']) {
        await expect(page.locator(`#rotate-degrees option[value="${val}"]`)).toBeAttached();
      }
    });

    test('Watermark: shows text input and button', async ({ page }) => {
      await expect(page.locator('#watermark-text')).toBeVisible();
      await expect(page.locator('#tool-watermark-action')).toBeVisible();
    });

    test('Page Numbers: shows Add Page Numbers button', async ({ page }) => {
      await expect(page.locator('#tool-pagenum-action')).toBeVisible();
    });

    test('Metadata: shows View Metadata button', async ({ page }) => {
      await expect(page.locator('#tool-metadata-action')).toBeVisible();
    });
  });

  // ── Toast container ───────────────────────────────────────────────────────
  test('toast container element exists in DOM', async ({ page }) => {
    await expect(page.locator('#toast-container')).toBeAttached();
  });
});
