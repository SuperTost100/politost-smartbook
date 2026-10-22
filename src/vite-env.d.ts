/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_PLATFORM_ENABLED?: string;
  readonly VITE_BASE_PATH?: string;
  readonly VITE_BOOKS_URL?: string;
  readonly VITE_GA4_ID?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_GOOGLE_CMP_ENABLED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module 'monaco-editor/esm/vs/editor/edcore.main.js' {
  export * from 'monaco-editor';
}

declare module 'plotly.js/dist/plotly-cartesian.min.js' {
  const Plotly: {
    toImage(
      figure: { data: unknown[]; layout?: unknown; config?: unknown },
      options: { format: 'png'; width: number; height: number; scale?: number },
    ): Promise<string>;
  };
  export default Plotly;
}
