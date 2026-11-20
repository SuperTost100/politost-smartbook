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

    test('leaving the chapter while its page is still changing keeps the landed paragraph', async ({ page }) => {
      // While the reader presses a tab, the chapter collapses for a moment, as a figure or a section
      // still loading can make it: the scroll clamps to the bottom and only the last paragraph is on screen.
      await page.addInitScript(() => {
        window.addEventListener('pointerdown', () => {
          const sections = [...document.querySelectorAll<HTMLElement>('.paragraph-section')].slice(0, -1);
          for (const section of sections) section.style.display = 'none';
          setTimeout(() => sections.forEach((section) => section.style.removeProperty('display')), 600);
        }, true);
      });
      await page.goto('/libro/lungo/capitolo/lungo#p6');
      await expect.poll(() => savedParagraph(page)).toBe('p6');
      const nav = page.getByRole('navigation', { name: 'Sezioni del libro' });
      for (let round = 1; round <= 5; round++) {
        // A press as long as a person's, so the page has time to report what it shows.
        await nav.getByRole('link', { name: 'Esercizi' }).click({ delay: 300 });
        await expect(page).toHaveURL(/\/esercizi/);
        expect(await savedParagraph(page), `leaving, round ${round}`).toBe('p6');
        await nav.getByRole('link', { name: 'Capitoli' }).click();
        await expect(page).toHaveURL(/\/capitolo\/lungo#p6$/, { timeout: 2000 });
        await expect.poll(() => savedParagraph(page)).toBe('p6');
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

for (const key of ['End', 'Control+End']) {
  test(`one press of ${key} reaches the end of a chapter whose paragraphs are not laid out yet`, async ({ page }) => {
    await serveBook(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/libro/lungo/capitolo/lungo');
    await expect(page.locator('#p1')).toBeVisible();
    await page.keyboard.press(key);
    const atBottom = () => page.evaluate(() => Math.abs(document.documentElement.scrollHeight - window.innerHeight - window.scrollY) <= 1);
    await expect.poll(atBottom).toBe(true);
    // And it stays there once every paragraph has its real height.
    await page.waitForTimeout(1500);
    expect(await atBottom()).toBe(true);
    await expect(page.getByRole('link', { name: /Capitolo|Esercizi|Libreria/ }).last()).toBeInViewport();
  });
}

// Paragraphs of many one-line blocks, whose estimated heights are far from the real ones: on the way
// back to such a chapter the same scroll offset shows other text.
const TALL = {
  ...CONFIG,
  id: 'alto',
  title: 'Libro alto',
  chapters: [
    { id: 'alto', number: 1, title: 'Capitolo alto', file: '01-alto.md', printable: true },
    { id: 'altro', number: 2, title: 'Un altro capitolo alto', file: '02-altro.md', printable: true },
  ],
};
const tallChapter = (n = 1) => {
  const parts = [`---\nchapter: ${n}\ntitle: Capitolo ${n}\n---\n`];
  for (let i = 1; i <= 12; i++) {
    parts.push(`## p${i} | Paragrafo ${i}\n`);
    for (let l = 1; l <= 60; l++) {
      parts.push(`Riga ${l} del paragrafo ${i}.\n`);
      // Numbered formulas cut the paragraph into pieces that appear one at a time.
      if (l % 15 === 0) parts.push(`:::formula{id="${n}.${i * 10 + l / 15}" label="Formula ${l / 15}"}\n$$y = ${l}x$$\n:::\n`);
    }
  }
  return parts.join('\n');
};
const TALL_PACKAGE = zipSync({
  'smartbook.json': strToU8(JSON.stringify(TALL)),
  'chapters/01-alto.md': strToU8(tallChapter()),
  'chapters/02-altro.md': strToU8(tallChapter(2)),
  'esercizi.md': strToU8(EXERCISES),
});

async function serveTallBook(page: Page) {
  await page.route(`${BOOKS_URL}/catalog.json`, (route) => route.fulfill({
    json: {
      catalogVersion: 1,
      generatedAt: '2026-10-12T00:00:00Z',
      books: [{
        id: 'alto', title: 'Libro alto', subject: 'Fisica', authors: ['Ada Lovelace'], version: '1.0.0', specVersion: '1.2',
        chapters: 2, package: 'books/alto@1.0.0.ptsb', bytes: TALL_PACKAGE.byteLength,
        sha256: createHash('sha256').update(TALL_PACKAGE).digest('hex'),
      }],
    },
  }));
  await page.route(`${BOOKS_URL}/books/**`, (route) =>
    route.fulfill({ body: Buffer.from(TALL_PACKAGE), contentType: 'application/octet-stream' }));
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 375, height: 812 }]) {
  test(`back to a chapter at ${viewport.width}px shows the same text at the same place`, async ({ page }) => {
    await serveTallBook(page);
    await page.setViewportSize(viewport);
    await page.goto('/libro/alto/capitolo/alto');
    await expect(page.locator('.paragraph-section')).toHaveCount(12);
    // Read down the chapter as a reader would, so the paragraphs above take their real heights.
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    for (let i = 0; i < 40; i++) await page.mouse.wheel(0, 400);
    await page.waitForTimeout(500);
    const probe = page.getByText('Riga 30 del paragrafo 7.', { exact: true });
    await probe.evaluate((el) => window.scrollBy({ top: el.getBoundingClientRect().top - 300, behavior: 'instant' }));
    await page.waitForTimeout(600);
    const before = await probe.evaluate((el) => Math.round(el.getBoundingClientRect().top));

    await page.getByRole('navigation', { name: 'Sezioni del libro' }).getByRole('link', { name: 'Esercizi' }).click();
    await expect(page).toHaveURL(/\/esercizi/);
    await expect(page.locator('.esercizi-view')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/capitolo\/alto$/);
    // Once the chapter has filled in, and still a moment later.
    await page.waitForTimeout(2500);
    expect(await probe.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(before);
    await page.waitForTimeout(1000);
    expect(await probe.evaluate((el) => Math.round(el.getBoundingClientRect().top))).toBe(before);
  });
}

test.describe('Returns to a chapter', () => {
  test.beforeEach(async ({ page }) => {
    await serveTallBook(page);
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  const readDown = async (page: Page, wheels: number) => {
    await expect(page.locator('.paragraph-section')).toHaveCount(12);
    await page.mouse.move(720, 450);
    for (let i = 0; i < wheels; i++) await page.mouse.wheel(0, 400);
    await page.waitForTimeout(600);
  };
  const headingTop = (page: Page, id: string) => page.locator(`#${id}`).evaluate((el) => Math.round(el.getBoundingClientRect().top));

  test("a direct load of another chapter in the same tab lands on its own hash, not on the first chapter's place", async ({ page }) => {
    // Both loads are the first entry of their document, whose history key is the same.
    await page.goto('/libro/alto/capitolo/alto');
    await readDown(page, 40);
    await page.goto('/libro/alto/capitolo/altro#p3');
    await expect.poll(() => headingTop(page, 'p3')).toBe(94);
  });

  test('back to a chapter that the reader had scrolled back to the top opens at the top', async ({ page }) => {
    await page.goto('/libro/alto/capitolo/alto');
    await readDown(page, 30);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await page.waitForTimeout(600);
    await page.getByRole('navigation', { name: 'Sezioni del libro' }).getByRole('link', { name: 'Esercizi' }).click();
    await expect(page.locator('.esercizi-view')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/\/capitolo\/alto$/);
    await page.waitForTimeout(1500);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  });
});

test('a landing in one chapter does not name a paragraph of the next chapter', async ({ page }) => {
  // Paragraph ids repeat in every chapter (p1, p2, …), so a landing kept past its chapter would point into the new one.
  await page.setViewportSize({ width: 1440, height: 900 });
  const saved = () =>
    page.evaluate(() => {
      const place = JSON.parse(localStorage.getItem('politost-last-read') ?? '{}').esempio;
      return place ? `${place.chapterId}:${place.paragraphId ?? 'top'}` : 'none';
    });

  await page.goto('/libro/esempio/capitolo/nel-libro');
  // The outline on the right lands on a paragraph without changing the address.
  await page.locator('.sb-rail').getByText('Collegamenti tra le parti').click();
  await expect.poll(saved).toBe('nel-libro:p3');

  // A click on the chapter index is not a scroll, so the landing is still held when the chapter changes.
  await page.locator('.sb-toc a[href$="/capitolo/prova-tu"]').click();
  await expect(page).toHaveURL(/\/capitolo\/prova-tu$/);
  await expect.poll(saved).toBe('prova-tu:top');
});

test('a hash that is not valid percent encoding opens the chapter at the top', async ({ page }) => {
  await page.goto('/libro/esempio/capitolo/nel-libro#%');
  await expect(page.locator('.chapter-content')).toBeVisible();
  await expect(page.getByText('Non riesco a mostrare questa pagina')).toHaveCount(0);
});
