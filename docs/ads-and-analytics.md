# Reader ads and analytics

The reader shows a dismissible bottom promotion inside every book. It alternates Pyxis, the PoliTost Telegram group and TikTok @politost when a book opens, and keeps that choice while reading. There are no promotions on the catalog, legal pages, print previews or printed output. Google services are disabled by default.

## Activate Google services

1. Create a GA4 web stream for the production reader. Turn off **all enhanced measurement**, including browser history page views, outbound clicks, file downloads and form interactions. The reader sends its own sanitized events. Disable Google signals and advertising personalization. Set event retention to 2 months.
2. Apply for AdSense with the production domain. Wait for site approval. Configure the site's Auto ads to use only regular bottom anchor ads. Disable collapsible anchors, vignettes, side rails, ad intents and in-page automatic ads. The approved `data-overlays="collapsed-bottom"` script parameter enforces the regular bottom anchor position; other formats must be disabled in the account.
3. In AdSense Privacy & messaging, publish Google's certified European regulations message. Include reject and manage-options controls. Configure it for all visitors, so the reader receives explicit TCF consent signals rather than assuming consent outside Europe. The reader fails closed when those signals are absent. In particular, a CMP response with `gdprApplies=false` does not enable ads. Verify the worldwide message behavior with Google before activation; visitors without explicit TCF consent continue to see PoliTost promotions. Keep the Google-generated privacy-options entry point enabled.
4. Add the public configuration values to the build environment. `VITE_GA4_ID` is the stream's `G-…` measurement ID. `VITE_ADSENSE_CLIENT` is the approved `ca-pub-…` publisher ID. Set `VITE_GOOGLE_CMP_ENABLED=true` only after publishing and testing the consent message. These identifiers are public, not API credentials. See [the environment example](../.env.example).
5. Add the exact `ads.txt` record provided by AdSense to **the root of politost.it**. This repository serves `/reader`, so `/reader/ads.txt` would not authorize the root domain. No invented publisher ID or record is included here.
6. Add AdSense page exclusions for every non-reader page on the shared domain, including the exact `/reader/` catalog URL, legal/account/docs pages and print routes. Do not exclude all of `/reader/`, because that would exclude every book. The code loads the ad script only inside books; exclusions are an additional account-level protection. Other apps on politost.it must keep their own ad settings under review.
7. Build a tailnet preview and verify the real CMP and Google configuration before production. Tost must approve that preview before deployment. Google approval, consent-message delivery, actual anchor appearance, advertiser demand and final CSP compatibility cannot be verified using placeholder IDs.

If Google rejects the domain, the CMP is blocked, consent is refused, or no anchor appears, the reader continues to show the PoliTost promotion. No reading is gated on advertising or statistics.

## Consent and data

Analytics has its own opt-in, separate from account terms and advertising. The reader does not load `gtag.js` before that opt-in. It sends `page_view` for the catalog and known public builtin/remote book routes, `chapter_complete` when the chapter end enters the viewport, and `promotion_click` for the approved destinations. Reaching the end is a reading-progress signal, not proof that the chapter was read.

Queries, hashes, referrers, document titles, account routes and imported/licensed book identifiers are excluded from Analytics. Do not enable GA4 enhanced measurement later without reviewing those boundaries. On withdrawal or navigation to an excluded page, the app reloads to unload the Analytics runtime. It deletes accessible Analytics cookies when consent is withdrawn. Data already received by Google is not deleted by this action.

The Google consent manager itself contacts Google before advertising consent to present and remember choices. The ad-delivery script is loaded only after a completed CMP event with Google vendor consent, purpose 1 storage consent and the required purpose 2, 7, 9 and 10 consent/legitimate-interest signals. Google evaluates personalization and publisher restrictions from the full consent string. A CMP loading error or missing signal never grants consent.

AdSense can receive page URLs and inspect book context, including imported books. Excluding imported titles from Analytics does not make the ad-delivery script private. The reader does not upload the imported `.ptsb` file to Google.

## Navigation and fallback limits

Google does not document a teardown API or fill callback for Auto ads anchors. The app reloads the document when leaving a book after the Google CMP or AdSense has started, including navigation to print. It does not remove, restyle, refresh or hide Google's generated ad elements.

The first-party promotion yields when a visible fixed Google ad container is detected. This is a markup-dependent observation, not an official fill API or a reliable ad-block detector. Recheck it with actual anchors before activation and whenever Google changes their markup. Some blockers may also hide first-party promotions. Native anchor dismissal is managed by Google. After a native anchor appears, the first-party promotion remains suppressed for that document, so closing the native anchor does not reveal another banner. First-party dismissal lasts for the tab's session and unloads any pending ad runtime.

The CSP generator adds Google origins only for configured services and keeps script restrictions intact. Test the actual messages and ads against production response headers. Do not add unrestricted script sources or `unsafe-eval` to silence failures.

## Files and storage

`src/lib/monetization.ts` contains destinations, configuration validation, safe analytics routes and the consent gate. `GoogleAdvertising`, `PrivacyControls` and `ReaderSupport` own the browser integration. The reader's existing design tokens style the promotion.

`politost-privacy-v1` remembers the Analytics choice for 180 days. Session storage holds promotion rotation and dismissal. Neither requires contacting the promoted platforms. GA4 cookies use a reader-specific prefix and are limited to the reader’s host and base path, capped at 180 days without renewal; Google's CMP and ad cookie durations are managed by Google.

Both public-reader and platform privacy/cookie texts describe the optional services. Account acceptance versions are unchanged; platform operators must coordinate any server-side legal-version update with their platform release.
