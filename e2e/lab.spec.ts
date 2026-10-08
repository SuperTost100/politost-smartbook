import { readFileSync } from 'node:fs';
import { test, expect, type Page } from '@playwright/test';
import { preparePlatformShell } from './helpers/platform';

// vite preview ignores public/_headers, so the deployed CSP is added here: the lab must work under it.
const CSP = /Content-Security-Policy: (.+)/.exec(readFileSync('public/_headers', 'utf8'))![1].trim();

test.use({ serviceWorkers: 'block' });

async function typeCode(page: Page, code: string) {
  await page.locator('.monaco-editor .view-lines').click();
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.press('Delete');
  await page.keyboard.insertText(code);
}

async function run(page: Page, code: string) {
  await typeCode(page, code);
  await page.getByRole('button', { name: 'Esegui' }).click();
  await expect(page.getByRole('button', { name: 'Esegui' })).toBeEnabled({ timeout: 60_000 });
  return page.locator('.sb-code-out pre');
}

test.describe('Lab', () => {
  test.beforeEach(async ({ page }) => {
    await preparePlatformShell(page);
    await page.route(/^http:\/\/127\.0\.0\.1:\d+\/(?!api\/)/, async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': CSP } });
    });
    await page.goto('/libro/esempio/laboratorio');
    await expect(page.locator('.monaco-editor')).toBeVisible({ timeout: 30_000 });
  });

  test('runs Python under the deployed CSP and points errors at the student code', async ({ page }) => {
    await expect(await run(page, 'print("ciao")')).toHaveText('ciao');

    const output = await run(page, 'x = 1\ny = x / 0');
    await expect(output).toContainText('File "<laboratorio>", line 2');
    await expect(output).toContainText('ZeroDivisionError: division by zero');
    await expect(output).not.toContainText('_pyodide');

    // Code runs as written: a multi-line string keeps its text.
    await expect(await run(page, 's = """a\nb"""\nprint(repr(s))')).toHaveText("'a\\nb'");
  });

  test('a script stuck in a loop is stopped and the next one runs', async ({ page }) => {
    await run(page, 'print("pronto")');
    await expect(await run(page, 'while True:\n    pass')).toContainText('Tempo scaduto');
    await expect(await run(page, 'print("di nuovo")')).toHaveText('di nuovo');
  });

  test('switching script stops a running one, so the next run does not wait behind it', async ({ page }) => {
    await run(page, 'print("pronto")');
    await typeCode(page, 'while True:\n    pass');
    await page.getByRole('button', { name: 'Esegui' }).click();
    await page.getByRole('button', { name: /Area del cerchio/ }).click();
    await page.getByRole('button', { name: 'Esegui' }).click();
    // Well under the 10 s timeout: the loop was stopped, not waited out.
    await expect(page.locator('.sb-code-out pre')).toContainText('r = 1 m', { timeout: 6_000 });
  });
});
