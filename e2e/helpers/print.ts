import { expect, type Page } from '@playwright/test';

export interface PrintRoute {
  name: string;
  url: string;
  minPages: number;
  /** Assert chapter body: paragraphs + KaTeX in iframe */
  expectChapterContent?: boolean;
}

export const PRINT_ROUTES: PrintRoute[] = [
  {
    name: 'esempio / nel-libro',
    url: '/libro/esempio/stampa/capitolo/nel-libro',
    minPages: 1,
    expectChapterContent: true,
  },
  {
    name: 'esempio / formulario',
    url: '/libro/esempio/stampa/formulario',
    minPages: 1,
  },
  {
    name: 'esempio / esercizi',
    url: '/libro/esempio/stampa/esercizi',
    minPages: 1,
  },
];

export async function waitForPrintPagination(page: Page): Promise<void> {
  // Wait for the shell loading screen to vanish (paginating state = false)
  await page.waitForFunction(
    () => !document.querySelector('.print-loading-screen'),
    { timeout: 30_000 },
  );

  // Also wait for the iframe to contain the paginated output
  const iframe = page.frameLocator('.print-preview-frame');
  await iframe.locator('.pagedjs_pages').waitFor({ timeout: 30_000 });

  const errorLocator = page.locator('.print-error-card[role="alert"]');
  if (await errorLocator.count()) {
    const errorText = await errorLocator.textContent();
    if (errorText?.trim()) {
      throw new Error(errorText.trim());
    }
  }
}

async function assertNoSourceLeak(iframe: ReturnType<Page['frameLocator']>): Promise<void> {
  await expect(iframe.locator('.print-flow')).toHaveCount(0);
  await expect(iframe.locator('.print-root')).toHaveCount(0);
}

async function assertUniqueFormulaIds(iframe: ReturnType<Page['frameLocator']>): Promise<void> {
  const duplicates = await iframe.locator('.pagedjs_pages').evaluate((pagesRoot) => {
    const counts = new Map<string, number>();
    for (const el of pagesRoot.querySelectorAll('[data-formula-id]')) {
      const id = el.getAttribute('data-formula-id');
      if (!id) continue;
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return [...counts.entries()].filter(([, count]) => count > 1);
  });
  expect(duplicates).toEqual([]);
}

async function assertPrintDocumentContent(
  iframe: ReturnType<Page['frameLocator']>,
  route: PrintRoute,
): Promise<void> {
  await expect(iframe.locator('.print-brand-block').first()).toBeVisible();
  await expect(iframe.locator('.content-paragraph').first()).toBeVisible();
  await expect(iframe.locator('.katex').first()).toBeVisible();
  await assertUniqueFormulaIds(iframe);
}

export async function assertPrintPreview(page: Page, route: PrintRoute): Promise<number> {
  await waitForPrintPagination(page);

  const iframe = page.frameLocator('.print-preview-frame');
  await iframe.locator('.pagedjs_pages').waitFor({ timeout: 30_000 });

  await expect(iframe.locator('.pagedjs_pages')).toHaveCount(1);
  await assertNoSourceLeak(iframe);

  const pageCount = await iframe.locator('.pagedjs_page').count();
  expect(pageCount).toBeGreaterThanOrEqual(route.minPages);

  if (route.expectChapterContent) {
    await assertPrintDocumentContent(iframe, route);
  } else {
    await expect(iframe.locator('.print-brand-block').first()).toBeVisible();
  }

  await expect(page.locator('.pagedjs_pages')).toHaveCount(0);

  const leaked = await page.evaluate(
    () => document.querySelectorAll('[data-pagedjs-inserted-styles]').length,
  );
  expect(leaked).toBe(0);

  return pageCount;
}

export async function assertNoParentStyleLeakage(page: Page): Promise<void> {
  const leaked = await page.evaluate(
    () => document.querySelectorAll('[data-pagedjs-inserted-styles]').length,
  );
  expect(leaked).toBe(0);
}
