import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { strToU8, zipSync } from 'fflate';
import { test, expect, type Page } from '@playwright/test';

const chapter = '/libro/esempio/capitolo/benvenuto';
const consent = {
  gdprApplies: true, cmpStatus: 'loaded', eventStatus: 'useractioncomplete', listenerId: 42,
  vendor: { consents: { 755: true } },
  purpose: { consents: { 1: true }, legitimateInterests: { 2: true, 7: true, 9: true, 10: true } },
};

test.beforeEach(async ({ page }) => {
  const header = readFileSync('public/_headers', 'utf8').split('\n').find((line) => line.trim().startsWith('Content-Security-Policy:'))!;
  const csp = header.trim().slice('Content-Security-Policy:'.length).trim();
  await page.route(/^http:\/\/127\.0\.0\.1:\d+\//, async (route) => {
    if (!route.request().isNavigationRequest()) return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'content-security-policy': csp } });
  });
});

async function mockGoogle(page: Page, blockAds = false) {
  const requests: string[] = [];
  await page.route(/https:\/\/.*(?:google|doubleclick|gstatic|googleusercontent)/, async (route) => {
    const url = route.request().url();
    requests.push(url);
    if (url.includes('fundingchoicesmessages')) {
      await route.fulfill({ contentType: 'text/javascript', body: `window.__tcfapi = (command, version, callback) => {
        if (command === 'addEventListener') window.__testConsent = callback;
      }; window.googlefc.showRevocationMessage = () => { window.__testRevoked = true; };` });
    } else if (url.includes('adsbygoogle') && blockAds) await route.abort('blockedbyclient');
    else await route.fulfill({ contentType: 'text/javascript', body: '/* mocked Google service */' });
  });
  return requests;
}

async function grantAds(page: Page) {
  await expect.poll(() => page.evaluate(() => typeof (window as unknown as { __testConsent?: unknown }).__testConsent)).toBe('function');
  await page.evaluate((data) => {
    (window as unknown as { __testConsent: (value: unknown, success: boolean) => void }).__testConsent(data, true);
  }, consent);
}

test('analytics waits for opt-in, strips URL details, tracks navigation once and stops on revocation', async ({ page }) => {
  const requests = await mockGoogle(page);
  await page.goto('/?private=secret#sensitive');
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(requests).toEqual([]);
  await page.getByRole('button', { name: 'Accetta statistiche', exact: true }).click();
  await expect.poll(() => requests.filter((url) => url.includes('googletagmanager')).length).toBe(1);
  const events = await page.evaluate(() => JSON.stringify(window.dataLayer));
  expect(events).not.toMatch(/secret|sensitive|private=/);
  expect((JSON.parse(events) as unknown[][]).filter((event) => event[0] === 'event' && event[1] === 'page_view')).toHaveLength(1);
  await page.getByRole('link', { name: 'Apri Guida di esempio' }).click();
  await expect(page.locator('.smartbook-view')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window.dataLayer as unknown[][]).filter((event) => event[0] === 'event' && event[1] === 'page_view').length)).toBe(2);
  await page.getByRole('complementary', { name: 'Promozione PoliTost' }).getByRole('button', { name: 'Preferenze privacy' }).click();
  await page.evaluate(() => { document.cookie = 'politost_reader_ga=owned; path=/'; document.cookie = '_ga=other-app; path=/'; });
  const reload = page.waitForEvent('load');
  await page.getByRole('button', { name: 'Rifiuta statistiche', exact: true }).click();
  await reload;
  await expect(page.locator('.smartbook-view')).toBeVisible();
  expect(await page.locator('#politost-ga4').count()).toBe(0);
  expect(await page.evaluate(() => document.cookie)).toContain('_ga=other-app');
  expect(await page.evaluate(() => document.cookie)).not.toContain('politost_reader_ga');
  expect(requests.filter((url) => url.includes('googletagmanager'))).toHaveLength(1);
});

test('rejecting statistics keeps GA off through navigation and reload', async ({ page }) => {
  const requests = await mockGoogle(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Rifiuta statistiche', exact: true }).click();
  await page.getByRole('link', { name: 'Apri Guida di esempio' }).click();
  await expect(page.locator('.smartbook-view')).toBeVisible();
  await page.reload();
  await expect(page.locator('.smartbook-view')).toBeVisible();
  expect(requests.some((url) => /googletagmanager|adsbygoogle/.test(url))).toBe(false);
});

test('advertising waits for certified CMP signals and unloads on return to the catalog', async ({ page }) => {
  const requests = await mockGoogle(page);
  await page.goto(chapter);
  await page.getByRole('button', { name: 'Rifiuta statistiche', exact: true }).click();
  await expect(page.locator('.reader-support')).toBeVisible();
  expect(requests.some((url) => url.includes('adsbygoogle'))).toBe(false);
  await grantAds(page);
  await expect(page.locator('#politost-adsense')).toHaveAttribute('data-overlays', 'collapsed-bottom');
  await expect.poll(() => requests.filter((url) => url.includes('adsbygoogle')).length).toBe(1);
  const reload = page.waitForEvent('load');
  await page.locator('.sb-header-brand').click();
  await reload;
  await expect(page.getByRole('link', { name: 'Apri Guida di esempio' })).toBeVisible();
  expect(await page.locator('#politost-adsense').count()).toBe(0);
  await expect(page.locator('.reader-support')).toHaveCount(0);
});

test('blocked ads keep the promotion available without changing the chapter', async ({ page }) => {
  await mockGoogle(page, true);
  await page.goto(chapter);
  await page.getByRole('button', { name: 'Rifiuta statistiche', exact: true }).click();
  await grantAds(page);
  await expect(page.locator('.reader-support')).toBeVisible();
  await expect(page.locator('.reader-support a')).toHaveAttribute('href', 'https://politost.it/pyxis/');
  await expect(page).toHaveURL(new RegExp(chapter));
});

test('a visible native anchor takes the place of the first-party promotion', async ({ page }) => {
  await mockGoogle(page);
  await page.goto(chapter);
  await page.getByRole('button', { name: 'Rifiuta statistiche', exact: true }).click();
  await grantAds(page);
  await page.evaluate(() => {
    const ad = document.createElement('ins');
    ad.className = 'adsbygoogle';
    ad.style.cssText = 'position:fixed;bottom:0;left:0;width:100%;height:50px';
    ad.appendChild(document.createElement('iframe'));
    document.body.appendChild(ad);
  });
  await expect(page.locator('.reader-support')).toHaveCount(0);
  expect(await page.locator('ins.adsbygoogle').count()).toBe(1);
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('ins.adsbygoogle')).toBeHidden();
  await page.emulateMedia({ media: 'screen' });
  await expect(page.locator('ins.adsbygoogle')).toBeVisible();
  await page.locator('ins.adsbygoogle').evaluate((node) => { (node as HTMLElement).style.display = 'none'; });
  await expect(page.locator('.reader-support')).toHaveCount(0);
});


test('imported books retain promotions but unload analytics without sending their identifiers', async ({ page }) => {
  const requests = await mockGoogle(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Accetta statistiche', exact: true }).click();
  await expect(page.locator('#politost-ga4')).toHaveCount(1);
  const config = JSON.parse(readFileSync('src/content/esempio/smartbook.json', 'utf8'));
  config.id = 'private-sentinel';
  config.title = 'Private sentinel book';
  const entries: Record<string, Uint8Array> = {
    'smartbook.json': strToU8(JSON.stringify(config)),
    'assets/cosa-trovi.svg': new Uint8Array(readFileSync('src/content/esempio/assets/cosa-trovi.svg')),
    'ptsb.json': strToU8(JSON.stringify({ formatVersion: 1, packageType: 'smartbook', encrypted: false, access: 'public', createdAt: '2026-10-19T00:00:00Z' })),
  };
  for (const chapter of config.chapters) entries[`chapters/${chapter.file}`] = strToU8(readFileSync(`src/content/esempio/chapters/${chapter.file}`, 'utf8'));
  await page.locator('input[type="file"]').setInputFiles({ name: 'personal.ptsb', mimeType: 'application/octet-stream', buffer: Buffer.from(zipSync(entries)) });
  await page.getByRole('link', { name: 'Apri Private sentinel book' }).click();
  await expect(page.locator('.smartbook-view')).toBeVisible();
  await expect(page.locator('.reader-support')).toBeVisible();
  await expect(page.locator('#politost-ga4')).toHaveCount(0);
  expect(requests.filter((url) => url.includes('googletagmanager'))).toHaveLength(1);
  expect(requests.join(' ')).not.toContain('private-sentinel');
});

test('advertising consent withdrawal stops the runtime with a fresh document', async ({ page }) => {
  const requests = await mockGoogle(page);
  await page.goto(chapter);
  await page.getByRole('button', { name: 'Rifiuta statistiche', exact: true }).click();
  await grantAds(page);
  await expect(page.locator('#politost-adsense')).toHaveCount(1);
  const reload = page.waitForEvent('load');
  await page.evaluate((data) => {
    (window as unknown as { __testConsent: (value: unknown, success: boolean) => void }).__testConsent({ ...data, vendor: { consents: { 755: false } } }, true);
  }, consent);
  await reload;
  await expect(page.locator('.smartbook-view')).toBeVisible();
  expect(await page.locator('#politost-adsense').count()).toBe(0);
  expect(requests.filter((url) => url.includes('adsbygoogle'))).toHaveLength(1);
});


test('a delayed remote catalog starts analytics on a direct book link and unloads pending CMP on exit', async ({ page }) => {
  const requests = await mockGoogle(page);
  const config = JSON.parse(readFileSync('src/content/esempio/smartbook.json', 'utf8'));
  config.id = 'remote-direct';
  config.title = 'Remote direct book';
  const entries: Record<string, Uint8Array> = {
    'smartbook.json': strToU8(JSON.stringify(config)),
    'assets/cosa-trovi.svg': new Uint8Array(readFileSync('src/content/esempio/assets/cosa-trovi.svg')),
    'ptsb.json': strToU8(JSON.stringify({ formatVersion: 1, packageType: 'smartbook', encrypted: false, access: 'public', createdAt: '2026-10-19T00:00:00Z' })),
  };
  for (const chapter of config.chapters) entries[`chapters/${chapter.file}`] = strToU8(readFileSync(`src/content/esempio/chapters/${chapter.file}`, 'utf8'));
  const pkg = zipSync(entries);
  let releaseCatalog: () => void = () => undefined;
  const catalogReady = new Promise<void>((resolve) => { releaseCatalog = resolve; });
  await page.route('https://books.e2e.invalid/catalog.json', async (route) => {
    await catalogReady;
    await route.fulfill({ json: { catalogVersion: 1, generatedAt: '2026-10-19T00:00:00Z', books: [{
      id: config.id, title: config.title, subject: config.subject, version: config.version, specVersion: config.specVersion,
      chapters: config.chapters.length, package: 'books/remote-direct.ptsb', bytes: pkg.byteLength, sha256: createHash('sha256').update(pkg).digest('hex'),
    }] } });
  });
  await page.route('https://books.e2e.invalid/books/**', (route) => route.fulfill({ body: Buffer.from(pkg), contentType: 'application/octet-stream' }));
  await page.goto('/libro/remote-direct/capitolo/benvenuto');
  await page.getByRole('button', { name: 'Accetta statistiche', exact: true }).click();
  expect(requests.some((url) => url.includes('googletagmanager'))).toBe(false);
  releaseCatalog();
  await expect(page.locator('.smartbook-view')).toBeVisible();
  await expect(page.locator('#politost-ga4')).toHaveCount(1);
  await expect(page.locator('#politost-google-cmp')).toHaveCount(1);
  const events = await page.evaluate(() => JSON.stringify(window.dataLayer));
  expect(events).toContain('/libro/remote-direct/capitolo/benvenuto');
  const reload = page.waitForEvent('load');
  await page.locator('.sb-header-brand').click();
  await reload;
  await expect(page.locator('#politost-google-cmp')).toHaveCount(0);
  await expect(page.locator('#politost-adsense')).toHaveCount(0);
});


test('dismissal still unloads late ads when session storage is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get: () => { throw new DOMException('Blocked', 'SecurityError'); } });
  });
  const requests = await mockGoogle(page);
  await page.goto(chapter);
  await page.getByRole('button', { name: 'Rifiuta statistiche', exact: true }).click();
  await grantAds(page);
  await expect(page.locator('#politost-adsense')).toHaveCount(1);
  const reload = page.waitForEvent('load');
  await page.getByRole('button', { name: 'Chiudi la promozione per questa sessione' }).click();
  await reload;
  await expect(page.locator('.smartbook-view')).toBeVisible();
  await grantAds(page);
  await expect(page.locator('.reader-support')).toHaveCount(0);
  expect(requests.filter((url) => url.includes('adsbygoogle'))).toHaveLength(1);
});
