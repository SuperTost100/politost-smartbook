import { useEffect } from 'react';
import * as CookieConsent from 'vanilla-cookieconsent';
import 'vanilla-cookieconsent/dist/cookieconsent.css';
import '../styles/cookieconsent.css';

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
              'Il cookie di sessione è necessario per l\'accesso. Il tema chiaro o scuro si salva solo se accetti i cookie funzionali. ' +
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
                description: 'Cookie di sessione e memoria della scelta. Sempre attivi.',
                linkedCategory: 'necessary',
              },
              {
                title: 'Funzionali',
                description: 'Salva il tema chiaro o scuro su questo browser. Senza consenso il tema vale solo per la visita in corso.',
                linkedCategory: 'functional',
              },
              {
                title: 'Analitici',
                description: 'Spento. Questa versione non carica strumenti di statistica.',
                linkedCategory: 'analytics',
              },
            ],
          },
        },
      },
    },
  });
}

export function hasFunctionalConsent(): boolean {
  try {
    const raw = localStorage.getItem('cc_cookie');
    if (!raw) return false;
    const data = JSON.parse(raw) as { categories?: unknown };
    return Array.isArray(data.categories) && data.categories.includes('functional');
  } catch {
    return false;
  }
}

export function openCookiePreferences(): void {
  CookieConsent.showPreferences();
}

export function CookieConsentInit() {
  useEffect(() => {
    initCookieConsent();
  }, []);
  return null;
}
