import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { advertisingAllowed, analyticsPage, googleConfig, PROMOTIONS, type TcData } from './monetization.ts';
import { parseAnalyticsChoice, privacySnapshot, saveAnalyticsChoice } from './privacyPreferences.ts';

const books = [
  { id: 'public', source: 'remote', access: 'public' },
  { id: 'private', source: 'uploaded', access: 'public' },
  { id: 'paid', source: 'cloud', access: 'licensed' },
];

describe('monetization privacy boundaries', () => {
  it('keeps Google off without valid IDs and confirmed CMP configuration', () => {
    assert.deepEqual(googleConfig({}), { analyticsId: '', publisherId: '' });
    assert.equal(googleConfig({ VITE_ADSENSE_CLIENT: 'ca-pub-1234567890123456' }).publisherId, '');
    assert.equal(googleConfig({ VITE_GA4_ID: 'G-ABC123' }).analyticsId, 'G-ABC123');
    assert.equal(googleConfig({ VITE_GA4_ID: 'G-X&inject=1' }).analyticsId, '');
    assert.equal(googleConfig({ VITE_ADSENSE_CLIENT: 'ca-pub-1234567890123456', VITE_GOOGLE_CMP_ENABLED: 'true' }).publisherId, 'ca-pub-1234567890123456');
  });

  it('allows only catalog and known public book pages into analytics', () => {
    assert.equal(analyticsPage('/', books)?.page_path, '/');
    assert.deepEqual(analyticsPage('/libro/public/capitolo/intro', books), { page_path: '/libro/public/capitolo/intro', page_title: 'Libro pubblico' });
    for (const path of ['/libro/private/capitolo/secret', '/libro/paid/capitolo/intro', '/libro/unknown/capitolo/intro', '/auth', '/libro/public/stampa/capitolo/intro', '/libro/%ZZ/capitolo/intro']) {
      assert.equal(analyticsPage(path, books), null, path);
    }
  });

  it('fails closed for loading, absent, refused or ambiguous advertising consent', () => {
    const consent: TcData = {
      gdprApplies: true, cmpStatus: 'loaded', eventStatus: 'useractioncomplete',
      vendor: { consents: { 755: true } },
      purpose: { consents: { 1: true }, legitimateInterests: { 2: true, 7: true, 9: true, 10: true } },
    };
    assert.equal(advertisingAllowed(consent, true), true);
    assert.equal(advertisingAllowed(consent, false), false);
    assert.equal(advertisingAllowed({ ...consent, eventStatus: 'cmpuishown' }, true), false);
    assert.equal(advertisingAllowed({ ...consent, gdprApplies: undefined }, true), false);
    assert.equal(advertisingAllowed({ ...consent, vendor: { consents: { 755: false } } }, true), false);
    assert.equal(advertisingAllowed({ ...consent, purpose: { consents: { 1: false } } }, true), false);
    assert.equal(advertisingAllowed({ ...consent, purpose: { consents: { 1: true } } }, true), false);
  });

  it('expires analytics consent and rejects corrupt or future preferences', () => {
    const now = 1_000_000_000_000;
    assert.equal(parseAnalyticsChoice(JSON.stringify({ analytics: true, savedAt: now }), now), true);
    assert.equal(parseAnalyticsChoice(JSON.stringify({ analytics: false, savedAt: now }), now), false);
    for (const raw of ['broken', 'null', '{}', JSON.stringify({ analytics: 'true', savedAt: now }), JSON.stringify({ analytics: true, savedAt: now + 1 }), JSON.stringify({ analytics: true, savedAt: now - 180 * 86400000 })]) {
      assert.equal(parseAnalyticsChoice(raw, now), null);
    }
  });

  it('retains a refusal when storage can be read but writes are blocked', () => {
    const storage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    const browser = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: () => null,
      setItem: () => { throw new Error('Quota exceeded'); },
    } });
    Object.defineProperty(globalThis, 'window', { configurable: true, value: new EventTarget() });
    try {
      saveAnalyticsChoice(false);
      assert.equal(parseAnalyticsChoice(privacySnapshot()), false);
    } finally {
      if (storage) Object.defineProperty(globalThis, 'localStorage', storage);
      else Reflect.deleteProperty(globalThis, 'localStorage');
      if (browser) Object.defineProperty(globalThis, 'window', browser);
      else Reflect.deleteProperty(globalThis, 'window');
    }
  });

  it('includes each approved first-party promotion exactly once', () => {
    assert.deepEqual(PROMOTIONS.map((item) => item.href), ['https://politost.it/pyxis/', 'https://t.me/politost_community', 'https://www.tiktok.com/@politost']);
  });
});
