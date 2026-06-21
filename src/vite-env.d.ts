/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}

interface Window {
  __pagedPreviewer?: {
    polisher: { destroy: () => void };
  };
}

declare module 'pagedjs' {
  export class Handler {
    constructor(chunker?: unknown, polisher?: unknown, caller?: unknown);
  }
  export function registerHandlers(...handlers: Array<new (...args: unknown[]) => Handler>): void;
  export class Previewer {
    polisher: { destroy: () => void };
    preview(
      content: string | HTMLElement,
      stylesheets?: string[],
      renderTo?: HTMLElement,
    ): Promise<unknown>;
  }
}
