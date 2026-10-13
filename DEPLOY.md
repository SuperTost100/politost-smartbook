# Deploy the standalone reader

Follow [Self-Hosting](docs/Self-Hosting.md). Build with `npm ci && npm run build` and publish `dist/` as a static site with SPA fallback. The default build requires no API, database or OAuth configuration.

The public site at `politost.it/reader` deploys with `npm run deploy:politost`. See [The public PoliTost site](docs/Self-Hosting.md#the-public-politost-site).

Private platform integrations must explicitly enable `VITE_PLATFORM_ENABLED=true` and configure `VITE_API_URL` before building. Maintain backend deployment settings in the private platform repository.
