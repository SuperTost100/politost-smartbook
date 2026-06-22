import { useEffect } from 'react';
import * as CookieConsent from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';

export function initCookieConsent(): void {
  CookieConsent.run({
    hideFromBots: false,
    cookie: {
      useLocalStorage: true,
    },
    categories: {
      necessary: { enabled: true, readOnly: true },
      functional: { enabled: false },
      analytics: { enabled: false },
    },
    language: {
      default: 'it',
      translations: {
        it: {
          consentModal: {
            title: 'Utilizziamo i cookie',
            description:
              'Usiamo cookie necessari per la sessione e, con il tuo consenso, per preferenze come il tema. ' +
              '<a href="/privacy" class="cc-link">Privacy</a> · <a href="/cookie" class="cc-link">Cookie</a>',
            acceptAllBtn: 'Accetta tutti',
            acceptNecessaryBtn: 'Solo necessari',
            showPreferencesBtn: 'Gestisci preferenze',
          },
          preferencesModal: {
            title: 'Preferenze cookie',
            acceptAllBtn: 'Accetta tutti',
            acceptNecessaryBtn: 'Solo necessari',
            savePreferencesBtn: 'Salva',
            sections: [
              {
                title: 'Necessari',
                description: 'Cookie di sessione e consenso — sempre attivi.',
                linkedCategory: 'necessary',
              },
              {
                title: 'Funzionali',
                description: 'Preferenza tema chiaro/scuro (localStorage).',
                linkedCategory: 'functional',
              },
              {
                title: 'Analitici',
                description: 'Nessun tracker in questa versione.',
                linkedCategory: 'analytics',
              },
            ],
          },
        },
      },
    },
    onConsent: ({ cookie }) => {
      if (!cookie.categories.includes('functional')) {
        /* tema resta ma rispettiamo opt-out futuro */
      }
    },
  });
}

export function CookieConsentInit() {
  useEffect(() => {
    initCookieConsent();
  }, []);
  return null;
}
