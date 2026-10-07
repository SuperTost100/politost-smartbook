import { Previewer } from 'pagedjs';
import { paginateSlices, slicePrintChapters } from './chapterSlices';
import katexCssUrl from 'katex/dist/katex.min.css?url';
import { getPrintFontsUrl, getPrintStylesheetUrls, PRINT_FONT_FACES } from './styles';
import {
  ensurePrintHandlers,
  setPrintHandlerOptions,
  type PrintHandlerOptions,
} from './printHandler';

const previewers = new WeakMap<HTMLIFrameElement, Previewer>();
const previewToken = new WeakMap<HTMLIFrameElement, symbol>();

function yieldToPaint(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

/** Remove Paged.js styles leaked into the parent document from a prior session. */
export function cleanupLeakedPagedStyles(): void {
  document.querySelectorAll('style[data-pagedjs-inserted-styles]').forEach((el) => el.remove());
  document.querySelectorAll('head > style').forEach((el) => {
    if (el.textContent?.includes('--pagedjs-width')) el.remove();
  });
}

/** Wait for images and fonts before pagination (per-image timeout avoids hangs). */
export async function waitForPrintAssets(
  root: HTMLElement,
  options?: { timeoutMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 8000;
  const images = Array.from(root.querySelectorAll('img'));
  const ownerWindow = root.ownerDocument.defaultView ?? window;

  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const timer = ownerWindow.setTimeout(resolve, timeoutMs);
          const done = () => {
            ownerWindow.clearTimeout(timer);
            resolve();
          };
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        }),
    ),
  );

  // Load the design-system faces explicitly: the print stylesheets are only attached by Paged.js later,
  // so pagination would otherwise measure text in fallback fonts.
  const fonts = root.ownerDocument.fonts;
  if (fonts) {
    await Promise.all(PRINT_FONT_FACES.map((face) => fonts.load(face).catch(() => [])));
    await fonts.ready;
  }
  await new Promise<void>((r) =>
    ownerWindow.requestAnimationFrame(() => ownerWindow.requestAnimationFrame(() => r())),
  );
}

export function teardownPagedPreview(iframe?: HTMLIFrameElement | null): void {
  if (!iframe) return;

  previewToken.delete(iframe);
  previewers.get(iframe)?.polisher.destroy();
  previewers.delete(iframe);

  if (iframe.contentWindow) {
    iframe.contentWindow.__pagedPreviewer = undefined;
  }

  cleanupLeakedPagedStyles();
}

function preparePrintClone(source: HTMLElement): HTMLElement {
  const clone = source.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('img').forEach((img) => {
    img.loading = 'eager';
    img.decoding = 'sync';
  });
  return clone;
}

export async function runPagedPreview(
  iframe: HTMLIFrameElement,
  contentEl: HTMLElement,
  renderRoot: HTMLElement,
  handlerOptions?: PrintHandlerOptions,
): Promise<void> {
  teardownPagedPreview(iframe);

  ensurePrintHandlers();
  setPrintHandlerOptions(handlerOptions ?? {});

  const stylesheets = getPrintStylesheetUrls(
    new URL(katexCssUrl, window.location.href).href,
  );

  const token = Symbol();
  previewToken.set(iframe, token);
  const aborted = () => previewToken.get(iframe) !== token;

  // ponytail: one Paged.js preview per chapter, then pages are concatenated.
  // Page numbers restart on each chapter. A single chunker would keep one counter.
  const slices = slicePrintChapters(contentEl);
  const doc = contentEl.ownerDocument;
  const combined = slices.length > 1 ? doc.createElement('div') : null;
  if (combined) combined.className = 'pagedjs_pages';

  await paginateSlices(
    slices,
    async (slice) => {
      if (aborted()) return false;
      const previewer = new Previewer();
      previewers.set(iframe, previewer);
      if (iframe.contentWindow) {
        iframe.contentWindow.__pagedPreviewer = previewer;
      }
      const target = combined ? doc.createElement('div') : renderRoot;
      // Paged.js measures offsetParent bounds, so each chapter target must be attached.
      if (combined) renderRoot.appendChild(target);
      try {
        await previewer.preview(slice, stylesheets, target);
        if (aborted()) return false;
        if (combined) {
          const area = target.querySelector('.pagedjs_pages');
          if (area) {
            while (area.firstChild) combined.appendChild(area.firstChild);
          }
        }
        return true;
      } finally {
        if (combined) {
          target.remove();
          previewer.polisher.destroy();
          if (previewers.get(iframe) === previewer) previewers.delete(iframe);
        }
      }
    },
    yieldToPaint,
  );

  if (aborted()) return;
  if (combined) renderRoot.replaceChildren(combined);

  renderRoot.querySelectorAll('.print-root, .print-flow').forEach((el) => el.remove());
}

export function triggerBrowserPrint(iframe: HTMLIFrameElement): void {
  iframe.contentWindow?.print();
}

export function resizeIframeToContent(iframe: HTMLIFrameElement): void {
  const pages = iframe.contentDocument?.querySelector('.pagedjs_pages');
  if (pages instanceof HTMLElement) {
    iframe.style.height = `${pages.offsetHeight + 16}px`;
  }
}

export interface IframePrintShell {
  mount: HTMLElement;
  renderRoot: HTMLElement;
}

export function resetIframeShell(iframe: HTMLIFrameElement): IframePrintShell {
  const doc = iframe.contentDocument;
  if (!doc) throw new Error('Iframe not ready');

  doc.open();
  doc.write(
    '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"></head><body></body></html>',
  );
  doc.close();

  const fontsLink = doc.createElement('link');
  fontsLink.rel = 'stylesheet';
  fontsLink.href = getPrintFontsUrl();
  doc.head.appendChild(fontsLink);

  const renderRoot = doc.createElement('div');
  renderRoot.className = 'paged-render-root';
  doc.body.appendChild(renderRoot);

  const mount = doc.createElement('div');
  mount.id = 'print-root';
  renderRoot.appendChild(mount);

  return { mount, renderRoot };
}

/**
 * Render React in the iframe, clone the print root, unmount React,
 * paginate `.print-flow`, then remove the source flow from the DOM.
 */
export async function paginateReactInIframe(
  iframe: HTMLIFrameElement,
  render: (mount: HTMLElement) => { unmount: () => void },
  handlerOptions?: PrintHandlerOptions,
): Promise<void> {
  const { mount, renderRoot } = resetIframeShell(iframe);
  const { unmount } = render(mount);

  await waitForPrintAssets(renderRoot);
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );

  const printRoot = iframe.contentDocument?.querySelector('.print-root');
  const flow = printRoot?.querySelector('.print-flow');
  if (!printRoot || !flow) throw new Error('Print flow not found');

  const clone = preparePrintClone(printRoot as HTMLElement);
  unmount();

  const flowClone = clone.querySelector('.print-flow');
  if (!flowClone) throw new Error('Print flow not found');

  renderRoot.replaceChildren(flowClone);

  await runPagedPreview(iframe, flowClone as HTMLElement, renderRoot, handlerOptions);
  cleanupLeakedPagedStyles();
  resizeIframeToContent(iframe);
}
