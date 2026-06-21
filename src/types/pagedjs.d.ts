declare module 'pagedjs' {
  export class Handler {
    afterRendered?(pages: Array<{ element: HTMLElement }>): void;
  }

  export function registerHandlers(handler: typeof Handler): void;

  export class Previewer {
    polisher: { destroy(): void };
    preview(
      content: HTMLElement,
      stylesheets: string[],
      renderTo?: HTMLElement,
    ): Promise<void>;
  }
}
