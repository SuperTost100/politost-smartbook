import { Previewer } from 'pagedjs';
import katexCssUrl from 'katex/dist/katex.min.css?url';
import { getPrintStylesheetUrls } from './styles';
import {
  ensurePrintHandlers,
  setPrintHandlerOptions,
  type PrintHandlerOptions,
} from './printHandler';

const previewers = new WeakMap<HTMLIFrameElement, Previewer>();

/** Remove leaked Paged.js styles from prior broken sessions in the parent document */
export function cleanupLeakedPagedStyles(): void {
  document.querySelectorAll('style[data-pagedjs-inserted-styles]').forEach((el) => el.remove());
  document.querySelectorAll('head > style').forEach((el) => {
    if (el.textContent?.includes('--pagedjs-width')) {
      el.remove();
    }
  });
}

/** Wait for images and fonts; times out per image so lazy/off-screen assets cannot hang forever */
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

  await root.ownerDocument.fonts?.ready;
  await new Promise<void>((r) =>
    ownerWindow.requestAnimationFrame(() => ownerWindow.requestAnimationFrame(() => r())),
  );
}

export function teardownPagedPreview(iframe?: HTMLIFrameElement | null): void {
  if (!iframe) return;

  const previewer = previewers.get(iframe);
  previewer?.polisher.destroy();
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

/** Remove pre-pagination source after Paged.js (running heads already captured via string-set) */
function removePaginatedSource(renderRoot: HTMLElement): void {
  renderRoot.querySelectorAll('.print-root').forEach((el) => el.remove());
  renderRoot.querySelectorAll('.print-flow').forEach((el) => el.remove());
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

  const previewer = new Previewer();
  previewers.set(iframe, previewer);
  if (iframe.contentWindow) {
    iframe.contentWindow.__pagedPreviewer = previewer;
  }

  await previewer.preview(contentEl, stylesheets, renderRoot);
  removePaginatedSource(renderRoot);
}

export function triggerBrowserPrint(iframe: HTMLIFrameElement): void {
  iframe.contentWindow?.print();
}

/** Match iframe height to paginated page stack for PDF-like preview scrolling */
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

/** Reset iframe document and return React mount point + Paged.js render root */
export function resetIframeShell(iframe: HTMLIFrameElement): IframePrintShell {
  const doc = iframe.contentDocument;
  if (!doc) throw new Error('Iframe not ready');

  doc.open();
  doc.write(
    '<!DOCTYPE html><html lang="it"><head><meta charset="UTF-8"></head><body></body></html>',
  );
  doc.close();

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
 * paginate only `.print-flow`, then remove the source flow from the DOM.
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

  const meta = clone.querySelector('.print-meta');
  const flowClone = clone.querySelector('.print-flow');
  if (!flowClone) throw new Error('Print flow not found');

  renderRoot.replaceChildren();
  if (meta) renderRoot.appendChild(meta);
  renderRoot.appendChild(flowClone);

  const flowEl = renderRoot.querySelector('.print-flow');
  if (!flowEl) throw new Error('Print flow not found after flatten');

  await runPagedPreview(iframe, flowEl as HTMLElement, renderRoot, handlerOptions);
  cleanupLeakedPagedStyles();
  resizeIframeToContent(iframe);
}
