import { expect, test } from '@playwright/test';
import { preparePlatformShell } from './helpers/platform';

// A figure made by the Smart Builder is transparent with dark ink (data-sb-ink="dark" on its root). The reader shows every
// figure on the figure plate, which is light in both themes, so dark ink stays readable in dark mode and the figure
// needs no theme filter. This test fails if the plate turns dark or a filter inverts the picture onto it.
const MARKED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 120" width="240" height="120" role="img" data-sb-ink="dark"><title>Marked figure</title><path d="M20 100H220M20 100V20" stroke="#111827" stroke-width="2" fill="none"/><path d="M20 90C80 10 140 110 220 30" stroke="#C2410C" stroke-width="2.5" fill="none"/></svg>`;

const luminance = (rgb: string) => {
  const [r, g, b] = (rgb.match(/\d+(?:\.\d+)?/g) ?? ['0', '0', '0']).slice(0, 3).map((v) => {
    const c = Number(v) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

for (const theme of ['light', 'dark']) {
  test(`a transparent dark-ink figure is readable on the figure plate in ${theme} mode`, async ({ page }) => {
    await preparePlatformShell(page);
    await page.addInitScript((t) => localStorage.setItem('politost-theme', t), theme);
    await page.goto('/libro/esempio/capitolo/nel-libro');
    const frame = page.locator('.sb-figure-frame').first();
    const img = frame.locator('img');
    await expect(img).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    // The example book's figure is bundled, so its file is swapped for a marked one in the page.
    await img.evaluate((el, svg) => { (el as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent(svg)}`; }, MARKED_SVG);
    await expect.poll(() => img.evaluate((el) => (el as HTMLImageElement).naturalWidth)).toBe(240);

    const plate = await frame.evaluate((el) => getComputedStyle(el).backgroundColor);
    const ink = 0.0097; // luminance of #111827
    const contrast = (luminance(plate) + 0.05) / (ink + 0.05);
    expect(contrast, `plate ${plate}`).toBeGreaterThan(7);
    await expect(img).toHaveCSS('filter', 'none');
    if (process.env.FIGURE_SHOTS) await frame.screenshot({ path: `${process.env.FIGURE_SHOTS}/reader-marked-figure-${theme}.png` });
  });
}
