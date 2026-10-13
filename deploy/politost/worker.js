// The reader at politost.it/reader. Static files are served before this code runs, except the
// paths in run_worker_first (wrangler.jsonc): the library, the book pages and the sitemap.
//
// Search engines and AI crawlers don't run the app's JavaScript. For a book page the Worker
// therefore sends the app's HTML with the page already in it: title, description, canonical,
// JSON-LD and the text, all rendered by the books repo at build time (books.politost.it/pages/).
// In the browser the app replaces that text with its own view. When the books site can't be
// reached, the Worker sends the plain app, which loads books by itself as before.
const ORIGIN = 'https://politost.it';
const READER = '/reader';
const APP_TITLE = 'PoliTost Smartbook';
const OG_IMAGE = `${ORIGIN}/assets/img/og-it.png`;
const SIGNAL = 'search=yes, ai-input=yes, ai-train=no';
const ORGANIZATION = { '@type': 'Organization', '@id': `${ORIGIN}/#organization`, name: 'PoliTost', url: `${ORIGIN}/` };
const LIBRARY_DESCRIPTION =
  "I libri di testo interattivi di PoliTost: capitoli, formulario, esercizi con soluzione e prove d'esame. Gratis, nel browser, senza account.";
// The app's own routes outside /libro (src/App.tsx). Anything else under /reader is a 404.
const APP_ROUTES = new Set(['/termini', '/privacy', '/cookie', '/docs', '/auth', '/auth/callback', '/auth/accept-terms', '/redeem']);
// Book routes the app has but that are not worth indexing: interactive, little text.
const UNINDEXED = /^(laboratorio|grafici|stampa(\/.*)?)$/;

const escape = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

// True when the Accept header names text/markdown and ranks it at least as high as HTML.
function wantsMarkdown(accept) {
  const q = {};
  for (const part of (accept ?? '').toLowerCase().split(',')) {
    const [type, ...params] = part.trim().split(';');
    const weight = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    q[type.trim()] = weight ? Number(weight.slice(2)) || 0 : 1;
  }
  const html = q['text/html'] ?? q['text/*'] ?? q['*/*'] ?? 0;
  return (q['text/markdown'] ?? 0) > 0 && q['text/markdown'] >= html;
}

async function books(env, path, ttl, as = 'json') {
  const response = await fetch(`${env.BOOKS_URL}/${path}`, { cf: { cacheTtl: ttl, cacheEverything: true } });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return as === 'json' ? response.json() : response.text();
}

/**
 * Every published book with its pages, from the one file the books build writes, so a request
 * costs one subrequest however many books there are. Throws when the books site is down.
 */
async function library(env) {
  const data = await books(env, 'library.json', 300);
  return (data.books ?? []).filter((meta) => typeof meta.folder === 'string' && Array.isArray(meta.chapters));
}

const bookUrl = (meta, route) => `${ORIGIN}${READER}/libro/${meta.id}/${route}`;
const firstChapter = (meta) => bookUrl(meta, `capitolo/${meta.chapters[0].id}`);

function bookLd(meta) {
  const authors = meta.authors.map((name) => (name === 'PoliTost' ? ORGANIZATION : { '@type': 'Person', name }));
  return {
    '@type': 'Book',
    '@id': `${ORIGIN}${READER}/libro/${meta.id}#book`,
    name: meta.title,
    about: meta.subject,
    url: firstChapter(meta),
    inLanguage: 'it',
    bookFormat: 'https://schema.org/EBook',
    isAccessibleForFree: true,
    dateModified: meta.updated,
    ...(authors.length ? { author: authors } : {}),
    ...(meta.license ? { license: meta.license } : {}),
    publisher: ORGANIZATION,
  };
}

function pageLd(meta, route, page) {
  const url = bookUrl(meta, route);
  const chapter = route.startsWith('capitolo/') ? meta.chapters.find((c) => route === `capitolo/${c.id}`) : null;
  const main = chapter
    ? { '@type': 'Chapter', name: chapter.title, position: chapter.number, url, isPartOf: { '@id': `${ORIGIN}${READER}/libro/${meta.id}#book` } }
    : { '@type': 'WebPage', name: `${page.title} · ${meta.title}`, url, isPartOf: { '@id': `${ORIGIN}${READER}/libro/${meta.id}#book` } };
  const crumbs = [
    { name: 'Biblioteca', item: `${ORIGIN}${READER}/` },
    { name: meta.title, item: firstChapter(meta) },
    ...(route === `capitolo/${meta.chapters[0].id}` ? [] : [{ name: page.title, item: url }]),
  ];
  return {
    '@context': 'https://schema.org',
    '@graph': [
      { ...main, inLanguage: 'it', dateModified: meta.updated, ...(meta.license ? { license: meta.license } : {}) },
      bookLd(meta),
      { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, ...c })) },
    ],
  };
}

/** The app's index.html with this page's head and text in it. */
async function shell(request, env, page = {}) {
  const asset = await env.ASSETS.fetch(new Request(new URL(`${READER}/`, request.url)));
  const head = [];
  if (page.canonical) head.push(`<link rel="canonical" href="${escape(page.canonical)}">`);
  if (page.noindex) head.push('<meta name="robots" content="noindex">');
  if (page.markdown) head.push(`<link rel="alternate" type="text/markdown" href="${escape(page.markdown)}">`);
  if (page.canonical) {
    head.push(
      `<meta property="og:type" content="${page.article ? 'article' : 'website'}">`,
      '<meta property="og:site_name" content="PoliTost">',
      `<meta property="og:title" content="${escape(page.title)}">`,
      `<meta property="og:description" content="${escape(page.description)}">`,
      `<meta property="og:url" content="${escape(page.canonical)}">`,
      `<meta property="og:image" content="${OG_IMAGE}">`,
      '<meta property="og:image:width" content="1200">',
      '<meta property="og:image:height" content="630">',
      '<meta property="og:locale" content="it_IT">',
      '<meta name="twitter:card" content="summary_large_image">',
    );
  }
  if (page.ld) head.push(jsonLd(page.ld));

  let rewriter = new HTMLRewriter().on('head', { element: (e) => e.append(head.join('\n'), { html: true }) });
  if (page.title) rewriter = rewriter.on('title', { element: (e) => e.setInnerContent(page.title) });
  if (page.description) {
    rewriter = rewriter.on('meta[name="description"]', { element: (e) => e.setAttribute('content', page.description) });
  }
  if (page.body) rewriter = rewriter.on('div#root', { element: (e) => e.setInnerContent(page.body, { html: true }) });

  const headers = new Headers(asset.headers);
  headers.delete('ETag');
  headers.delete('Content-Length');
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
  headers.append('Vary', 'Accept');
  const body = request.method === 'HEAD' ? null : rewriter.transform(asset).body;
  return new Response(body, { status: page.status ?? 200, headers });
}

async function libraryPage(request, env) {
  let list;
  try {
    list = await library(env);
  } catch {
    return shell(request, env);
  }
  const items = list
    .map((meta) => {
      const chapters = meta.chapters.map((c) => `<li><a href="${escape(bookUrl(meta, `capitolo/${c.id}`))}">${c.number}. ${escape(c.title)}</a></li>`).join('');
      return `<li><h2><a href="${escape(firstChapter(meta))}">${escape(meta.title)}</a></h2><p>${escape(meta.subject)} · ${meta.chapters.length} capitoli</p><ol>${chapters}</ol></li>`;
    })
    .join('\n');
  const canonical = `${ORIGIN}${READER}/`;
  return shell(request, env, {
    title: `Biblioteca · ${APP_TITLE}`,
    description: LIBRARY_DESCRIPTION,
    canonical,
    body: `<main class="ssr-page sb-page"><h1>Biblioteca</h1><p>${escape(LIBRARY_DESCRIPTION)}</p><ul class="ssr-library">${items}</ul></main>`,
    ld: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'Biblioteca PoliTost',
      url: canonical,
      inLanguage: 'it',
      description: LIBRARY_DESCRIPTION,
      isPartOf: { '@type': 'WebSite', '@id': `${ORIGIN}/#website`, name: 'PoliTost', url: `${ORIGIN}/` },
      mainEntity: { '@type': 'ItemList', itemListElement: list.map((meta, i) => ({ '@type': 'ListItem', position: i + 1, url: firstChapter(meta), name: meta.title })) },
    },
  });
}

async function bookPage(request, env, id, route) {
  let meta;
  try {
    meta = (await library(env)).find((book) => book.id === id);
  } catch {
    return shell(request, env);
  }
  // A book that isn't published, such as one a student uploaded: the app opens it, nobody indexes it.
  if (!meta) return shell(request, env, { noindex: true });
  // The app sends /libro/<id> to the first chapter; do it here, so a crawler sees one URL per page.
  if (route === '' && meta.chapters.length) {
    return Response.redirect(new URL(`${READER}/libro/${meta.id}/capitolo/${meta.chapters[0].id}`, request.url).toString(), 301);
  }

  const page = meta.pages[route];
  if (!page) return shell(request, env, { noindex: true, status: UNINDEXED.test(route) ? 200 : 404 });

  const canonical = bookUrl(meta, route);
  const isChapter = route.startsWith('capitolo/');
  if (isChapter && wantsMarkdown(request.headers.get('Accept'))) {
    const text = await books(env, `${meta.folder}${route}.md`, 86400, 'text').catch(() => null);
    if (text !== null) {
      return new Response(request.method === 'HEAD' ? null : text, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Content-Signal': SIGNAL,
          Vary: 'Accept',
          Link: `<${canonical}>; rel="canonical"`,
        },
      });
    }
  }

  let body;
  try {
    // Cloudflare Pages serves <route>.html at <route> and answers the .html URL with a 308.
    body = await books(env, `${meta.folder}${route}`, 86400, 'text');
  } catch {
    return shell(request, env);
  }
  return shell(request, env, {
    title: `${page.title} · ${meta.title} · ${APP_TITLE}`,
    description: page.description,
    canonical,
    article: isChapter,
    markdown: isChapter ? `${env.BOOKS_URL}/${meta.folder}${route}.md` : undefined,
    body,
    ld: pageLd(meta, route, page),
  });
}

async function sitemap(env) {
  let list;
  try {
    list = await library(env);
  } catch {
    return new Response('The books site is unreachable', { status: 503, headers: { 'Retry-After': '300' } });
  }
  const url = (loc, lastmod) => `  <url><loc>${escape(loc)}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ''}</url>`;
  const urls = [url(`${ORIGIN}${READER}/`)];
  for (const meta of list) for (const route of Object.keys(meta.pages)) urls.push(url(bookUrl(meta, route), meta.updated));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}

const notFound = () => new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

export default {
  async fetch(request, env) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return notFound();
    const path = new URL(request.url).pathname.slice(READER.length);

    if (path === '/sitemap.xml') return sitemap(env);
    if (path === '/') return libraryPage(request, env);
    const book = /^\/libro\/([^/]+)\/?(.*?)\/?$/.exec(path);
    if (book) {
      let id;
      try {
        id = decodeURIComponent(book[1]);
      } catch {
        return notFound();
      }
      return bookPage(request, env, id, book[2]);
    }
    // A missing file, such as a stale script chunk: a 404, not the app.
    if (/\.[a-z0-9]+$/i.test(path)) return notFound();
    return APP_ROUTES.has(path.replace(/\/$/, '')) ? shell(request, env) : shell(request, env, { noindex: true, status: 404 });
  },
};
