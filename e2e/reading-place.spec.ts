import { createHash } from 'node:crypto';
import { test, expect, type Page } from '@playwright/test';
import { strToU8, zipSync } from 'fflate';
import { BOOKS_URL } from './helpers/books';

// A long chapter whose figures load after the first layout, like the catalog books.
const PARAGRAPHS = 10;
const FIGURE = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600"><rect width="800" height="600" fill="#8ab"/></svg>`;
const sentence = 'Una riga di testo che occupa spazio, come in un vero capitolo del libro con le sue spiegazioni. ';

function chapter(): string {
  const parts = ['---\nchapter: 1\ntitle: Capitolo lungo\n---\n'];
  for (let i = 1; i <= PARAGRAPHS; i++) {
    // The last paragraphs are short, so the page cannot bring them up to the header.
    const lines = i >= PARAGRAPHS - 1 ? 2 : 14;
    parts.push(`## p${i} | Paragrafo ${i}\n`);
    for (let l = 0; l < lines; l++) parts.push(sentence.repeat(3) + '\n');
    if (i === PARAGRAPHS - 1) parts.push(`Continua con il [paragrafo finale](ref:chapter/1#p${PARAGRAPHS}).\n`);
    if (i < PARAGRAPHS - 1) parts.push(`:::image{src="assets/fig${i}.svg" alt="Figura ${i}" caption="Fig. 1.${i} — Figura"}\n:::\n`);
  }
  return parts.join('\n');
}

const CONFIG = {
  id: 'lungo',
  title: 'Libro lungo',
  subject: 'Fisica',
  authors: ['Ada Lovelace'],
  version: '1.0.0',
  specVersion: '1.2',
  sections: Object.fromEntries(
    ['smartbook', 'formulario', 'esercizi', 'esami', 'ide', 'grafici', 'risposte'].map((key) => [
      key,
      { enabled: key === 'smartbook' || key === 'esercizi', label: key === 'smartbook' ? 'Capitoli' : key === 'esercizi' ? 'Esercizi' : key },
    ]),
  ),
  chapters: [{ id: 'lungo', number: 1, title: 'Capitolo lungo', file: '01-lungo.md', printable: true }],
};

const EXERCISES = `---\ntype: esercizi\n---\n\n:::exercise{id="E1.1" chapter="1" difficulty="facile"}\n## Domanda\nQuanto fa 1 + 1?\n\n:::solution\nFa 2.\n:::\n:::\n`;

const PACKAGE = zipSync({
  'ptsb.json': strToU8(JSON.stringify({
    formatVersion: 1, packageType: 'smartbook', encrypted: false, access: 'public', createdAt: '2026-10-12T00:00:00Z',
  })),
  'smartbook.json': strToU8(JSON.stringify(CONFIG)),
  'chapters/01-lungo.md': strToU8(chapter()),
  'esercizi.md': strToU8(EXERCISES),
  ...Object.fromEntries(Array.from({ length: PARAGRAPHS }, (_, i) => [`assets/fig${i + 1}.svg`, strToU8(FIGURE)])),
});

async function serveBook(page: Page) {
  await page.route(`${BOOKS_URL}/catalog.json`, (route) => route.fulfill({
    json: {
      catalogVersion: 1,
      generatedAt: '2026-10-12T00:00:00Z',
      books: [{
        id: 'lungo', title: 'Libro lungo', subject: 'Fisica', authors: ['Ada Lovelace'], version: '1.0.0', specVersion: '1.2',
        chapters: 1, package: 'books/lungo@1.0.0.ptsb', bytes: PACKAGE.byteLength,
        sha256: createHash('sha256').update(PACKAGE).digest('hex'),
      }],
    },
  }));
  await page.route(`${BOOKS_URL}/books/**`, (route) =>
    route.fulfill({ body: Buffer.from(PACKAGE), contentType: 'application/octet-stream' }));
}

const savedParagraph = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('politost-last-read') ?? '{}').lungo?.paragraphId ?? 'top');

const headingTop = (page: Page, id: string) =>
  page.locator(`#${id}`).evaluate((el) => Math.round(el.getBoundingClientRect().top));

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test.describe(`The saved reading place at ${viewport.width}px`, () => {
    test.beforeEach(async ({ page }) => {
      await serveBook(page);
      await page.setViewportSize(viewport);
    });

    for (const target of ['p2', 'p6', `p${PARAGRAPHS - 1}`, `p${PARAGRAPHS}`]) {
      test(`landing on #${target} saves ${target}, even as the figures load`, async ({ page }) => {
        await page.goto(`/libro/lungo/capitolo/lungo#${target}`);
        await expect(page.locator('.paragraph-section')).toHaveCount(PARAGRAPHS);
        await expect.poll(() => savedParagraph(page)).toBe(target);
        // A figure above that only now takes its height must not push the target away.
        await page.locator('#p1 .paragraph-body').evaluate((el) => el.insertAdjacentHTML('afterbegin', '<div style="height:700px"></div>'));
        await page.waitForTimeout(1500);
        expect(await savedParagraph(page)).toBe(target);
        if (target !== `p${PARAGRAPHS - 1}` && target !== `p${PARAGRAPHS}`) {
          // Under the header, at the section's scroll margin.
          expect(Math.abs((await headingTop(page, target)) - 94)).toBeLessThanOrEqual(2);
        }
        if (viewport.width >= 1440) {
          await expect(page.locator('.sb-rail a[aria-current="location"]')).toHaveAttribute('href', `#${target}`);
        }
      });
    }

    test('moving between the last two paragraphs, which share the bottom of the page, saves each one', async ({ page }) => {
      const last = `p${PARAGRAPHS}`;
      const before = `p${PARAGRAPHS - 1}`;
      // Tall enough that neither of them can scroll up to the header.
      await page.setViewportSize({ width: viewport.width, height: 2600 });
      await page.goto(`/libro/lungo/capitolo/lungo#${before}`);
      await expect.poll(() => savedParagraph(page)).toBe(before);
      const atBottom = () => page.evaluate(() => Math.abs(document.documentElement.scrollHeight - window.innerHeight - window.scrollY) <= 1);
      await expect.poll(atBottom).toBe(true);

      // An in-text link to the next paragraph of the same chapter: the page stays at the bottom.
      await page.getByRole('button', { name: 'paragrafo finale' }).click();
      await expect(page).toHaveURL(new RegExp(`#${last}$`));
      expect(await atBottom()).toBe(true);
      await expect.poll(() => savedParagraph(page)).toBe(last);

      // Back and forward between the two hashes.
      await page.goBack();
      await expect(page).toHaveURL(new RegExp(`#${before}$`));
      await expect.poll(() => savedParagraph(page)).toBe(before);
      await page.goForward();
      await expect(page).toHaveURL(new RegExp(`#${last}$`));
      await expect.poll(() => savedParagraph(page)).toBe(last);
      if (viewport.width >= 1440) {
        await expect(page.locator('.sb-rail a[aria-current="location"]')).toHaveAttribute('href', `#${last}`);
        // The outline goes through its own path: it sets the paragraph it jumps to.
        await page.locator(`.sb-rail a[href="#${before}"]`).click();
        await expect.poll(() => savedParagraph(page)).toBe(before);
      }
    });

    test('going to Esercizi and back through Capitoli five times keeps the place', async ({ page }) => {
      await page.goto('/libro/lungo/capitolo/lungo#p6');
      await expect.poll(() => savedParagraph(page)).toBe('p6');
      const nav = page.getByRole('navigation', { name: 'Sezioni del libro' });
      for (let round = 1; round <= 5; round++) {
        await nav.getByRole('link', { name: 'Esercizi' }).click();
        await expect(page).toHaveURL(/\/esercizi/);
        await nav.getByRole('link', { name: 'Capitoli' }).click();
        await expect(page).toHaveURL(/\/capitolo\/lungo#p6$/);
        await page.waitForTimeout(1200);
        expect(await savedParagraph(page), `round ${round}`).toBe('p6');
      }
    });

    test('scrolling after a landing still moves the active paragraph', async ({ page }) => {
      await page.goto('/libro/lungo/capitolo/lungo#p6');
      await expect.poll(() => savedParagraph(page)).toBe('p6');
      await page.mouse.move(viewport.width / 2, viewport.height / 2);
      // The wheel lets go of the landing, then the page moves on as if the reader kept scrolling.
      await page.mouse.wheel(0, -100);
      // Every figure at its height first, so the scrolls below land where they aim.
      await page.evaluate(() => Promise.all([...document.images].map((img) => {
        img.loading = 'eager';
        return img.decode().catch(() => undefined);
      })));
      await page.locator('#p4').evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 200, behavior: 'instant' }));
      await expect.poll(() => savedParagraph(page)).toBe('p4');
      await page.locator('#p8').evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 200, behavior: 'instant' }));
      await expect.poll(() => savedParagraph(page)).toBe('p8');
      if (viewport.width >= 1440) {
        await expect(page.locator('.sb-rail a[aria-current="location"]')).toHaveAttribute('href', '#p8');
      }
    });
  });
}
