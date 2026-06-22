import { useEffect, useRef, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  cleanupLeakedPagedStyles,
  paginateReactInIframe,
  teardownPagedPreview,
} from './pagedRunner';
import type { PrintHandlerOptions } from './printHandler';

interface PrintFrameProps {
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  paginationKey: string;
  content: ReactElement;
  handlerOptions?: PrintHandlerOptions;
  onPaginatingChange?: (paginating: boolean) => void;
  onError?: (message: string | null) => void;
}

export function PrintFrame({
  iframeRef,
  paginationKey,
  content,
  handlerOptions,
  onPaginatingChange,
  onError,
}: PrintFrameProps) {
  const generationRef = useRef(0);
  const iframeRootRef = useRef<Root | null>(null);
  const contentRef = useRef(content);
  contentRef.current = content;

  useEffect(() => {
    cleanupLeakedPagedStyles();
    return () => {
      iframeRootRef.current?.unmount();
      iframeRootRef.current = null;
      teardownPagedPreview(iframeRef.current);
    };
  }, [iframeRef]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const gen = ++generationRef.current;
    let cancelled = false;

    const paginate = async () => {
      onPaginatingChange?.(true);
      onError?.(null);

      try {
        await paginateReactInIframe(iframe, (mount) => {
          iframeRootRef.current?.unmount();
          const root = createRoot(mount);
          iframeRootRef.current = root;
          root.render(contentRef.current);
          return {
            unmount: () => {
              root.unmount();
              if (iframeRootRef.current === root) iframeRootRef.current = null;
            },
          };
        }, handlerOptions);
      } catch (err) {
        if (!cancelled && gen === generationRef.current) {
          onError?.(err instanceof Error ? err.message : 'Impaginazione fallita');
        }
      } finally {
        if (!cancelled && gen === generationRef.current) {
          onPaginatingChange?.(false);
        }
      }
    };

    void paginate();

    return () => {
      cancelled = true;
      teardownPagedPreview(iframe);
    };
  }, [iframeRef, paginationKey, handlerOptions, onPaginatingChange, onError]);

  return (
    <iframe
      ref={iframeRef}
      className="print-preview-frame"
      title="Anteprima di stampa"
    />
  );
}
