import { expect, type Page } from '@playwright/test';

export interface PrintRoute {
  name: string;
  url: string;
  /** Assert chapter body: paragraphs + KaTeX */
  expectChapterContent?: boolean;
}

export const PRINT_ROUTES: PrintRoute[] = [
  {
    name: 'esempio / nel-libro',
    url: '/libro/esempio/stampa/capitolo/nel-libro',
    expectChapterContent: true,
  },
  {
    name: 'esempio / formulario',
    url: '/libro/esempio/stampa/formulario',
  },
  {
    name: 'esempio / esercizi',
    url: '/libro/esempio/stampa/esercizi',
  },
];

async function assertUniqueFormulaIds(page: Page): Promise<void> {
  const duplicates = await page.locator('.print-sheet').evaluate((sheet) => {
    const counts = new Map<string, number>();
    for (const el of sheet.querySelectorAll('.numbered-formula[data-formula-id]')) {
      const id = el.getAttribute('data-formula-id');
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 1);
  });
  expect(duplicates).toEqual([]);
}

/** The preview is the printable sheet itself: opener, body, and KaTeX that renders once. */
export async function assertPrintPreview(page: Page, route: PrintRoute): Promise<void> {
  const sheet = page.locator('.print-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.print-opener-title')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Stampa o salva PDF' })).toBeEnabled();

  if (route.expectChapterContent) {
    await expect(sheet.locator('.content-paragraph').first()).toBeVisible();
    await expect(sheet.locator('.katex').first()).toBeVisible();
    // KaTeX ships MathML for screen readers; its CSS must hide it, or every formula prints twice.
    const mathml = sheet.locator('.katex-mathml').first();
    if (await mathml.count()) {
      const box = await mathml.boundingBox();
      expect(box === null || (box.width <= 1 && box.height <= 1)).toBe(true);
    }
    await assertUniqueFormulaIds(page);
  }
}

/** In print media only the sheet is visible. */
export async function assertPrintMediaHidesChrome(page: Page): Promise<void> {
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.print-toolbar')).toBeHidden();
  await expect(page.locator('.print-sheet')).toBeVisible();
  await page.emulateMedia({ media: 'screen' });
}
