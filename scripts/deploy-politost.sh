#!/usr/bin/env bash
# Build the reader for politost.it/reader and deploy it as the Worker politost-reader.
# Needs wrangler logged in to the Politost Cloudflare account (or CLOUDFLARE_API_TOKEN).
set -euo pipefail
cd "$(dirname "$0")/.."

export VITE_BASE_PATH=/reader
export VITE_BOOKS_URL=https://books.politost.it
unset VITE_PLATFORM_ENABLED VITE_API_URL

npm run build

site=deploy/politost/site
rm -rf "$site"
mkdir -p "$site/reader"
cp -R dist/. "$site/reader/"
# Workers read _headers from the root of the assets directory.
mv "$site/reader/_headers" "$site/_headers"

npx --yes wrangler@4 deploy --config deploy/politost/wrangler.jsonc
