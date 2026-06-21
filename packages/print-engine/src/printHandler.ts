import { Handler, registerHandlers } from 'pagedjs';
import { dedupePagedChunks } from './dedupePages';

export interface PrintHandlerOptions {
  watermarkLabel?: string;
  bookId?: string;
}

let currentOptions: PrintHandlerOptions = {};
let handlersRegistered = false;

function injectWatermark(pageElement: HTMLElement, options: PrintHandlerOptions): void {
  if (!options.watermarkLabel) return;

  const target =
    pageElement.querySelector('.pagedjs_pagebox') ??
    pageElement.querySelector('.pagedjs_area') ??
    pageElement;

  const overlay = pageElement.ownerDocument.createElement('div');
  overlay.className = 'print-watermark';
  overlay.setAttribute('aria-hidden', 'true');
  if (options.bookId) overlay.setAttribute('data-ptsb-book', options.bookId);

  const grid = pageElement.ownerDocument.createElement('div');
  grid.className = 'print-watermark-grid';
  for (let i = 0; i < 9; i++) {
    const span = pageElement.ownerDocument.createElement('span');
    span.textContent = options.watermarkLabel;
    grid.appendChild(span);
  }
  overlay.appendChild(grid);
  target.appendChild(overlay);
}

export function setPrintHandlerOptions(options: PrintHandlerOptions): void {
  currentOptions = options;
}

export function ensurePrintHandlers(): void {
  if (handlersRegistered) return;

  class PrintFinalizeHandler extends Handler {
    afterRendered(pages: Array<{ element: HTMLElement }>) {
      const renderRoot = pages[0]?.element.closest('.paged-render-root');
      const pagesContainer = renderRoot?.querySelector('.pagedjs_pages');

      if (pagesContainer instanceof HTMLElement) {
        dedupePagedChunks(pagesContainer);
      }

      if (renderRoot instanceof HTMLElement) {
        renderRoot.querySelectorAll('.print-root, .print-flow').forEach((el) => el.remove());
      }

      for (const page of pages) {
        injectWatermark(page.element, currentOptions);
      }
    }
  }

  registerHandlers(PrintFinalizeHandler);
  handlersRegistered = true;
}
