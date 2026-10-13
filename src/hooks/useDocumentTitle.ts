import { useEffect } from 'react';

const APP_TITLE = 'PoliTost Smartbook';

/** "Formulario · Fisica 1 · PoliTost Smartbook"; without a title, the app name alone. */
export function useDocumentTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${APP_TITLE}` : APP_TITLE;
  }, [title]);
}
