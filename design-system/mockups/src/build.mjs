// Assembles the redesign mockups into self-contained HTML files.
// Run from the repo root after npm install: node design-system/mockups/src/build.mjs
// KATEX_DIR points at another folder whose node_modules holds katex, if the repo's isn't installed.
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..');
const read = (p) => readFileSync(join(here, p), 'utf8');
const require = createRequire(join(process.env.KATEX_DIR ?? join(here, '../../..'), 'package.json'));
const katex = require('katex');
const katexDir = dirname(require.resolve('katex/package.json'));
const katexVersion = require('katex/package.json').version;

const icons = {
  printer: '<path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  book: '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  sigma: '<path d="M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z"/>',
  cap: '<path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>',
  terminal: '<path d="m4 17 6-6-6-6"/><path d="M12 19h8"/>',
  chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="m19 9-5 5-4-4-3 3"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  login: '<path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/>',
  bulb: '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
  check: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  menu: '<path d="M4 12h16M4 6h16M4 18h16"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  key: '<path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4"/><path d="m21 2-9.6 9.6"/><circle cx="7.5" cy="15.5" r="5.5"/>',
  more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  trash: '<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
};

const icon = (name) =>
  `<svg class="i" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;

const mark =
  '<svg class="mark" viewBox="8 26 84 62" aria-hidden="true"><path d="M44,66H56V84L50,79.5L44,84Z" fill="var(--ribbon)"/><path d="M14,36C30,34 42,36 50,44C58,36 70,34 86,36" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" opacity=".55"/><path d="M14,54C30,52 42,54 50,62C58,54 70,52 86,54" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round"/></svg>';

// Only partials go through KaTeX, so a $ in CSS or JS is never read as math.
function math(html) {
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_, tex) => katex.renderToString(tex, { displayMode: true, throwOnError: true }));
  return html.replace(/\$([^$\n]+?)\$/g, (_, tex) => katex.renderToString(tex, { throwOnError: true }));
}

function expand(html, depth = 0) {
  if (depth > 4) throw new Error('include loop');
  html = html.replace(/\{\{include:([\w-]+)\}\}/g, (_, name) => math(expand(read(`partials/${name}.html`), depth + 1)));
  html = html.replace(/\{\{icon:(\w+)\}\}/g, (_, name) => {
    if (!icons[name]) throw new Error(`unknown icon ${name}`);
    return icon(name);
  });
  return html.replace(/\{\{mark\}\}/g, mark);
}

const katexCss = readFileSync(join(katexDir, 'dist/katex.min.css'), 'utf8').replace(
  /url\(fonts\//g,
  `url(https://cdn.jsdelivr.net/npm/katex@${katexVersion}/dist/fonts/`,
);

const names = process.argv.length > 2 ? process.argv.slice(2) : ['a-libreria', 'b-carta', 'c-ambra'];
for (const name of names) {
  let html = expand(read(`${name}.html`));
  html = html.replace('{{css:shared}}', read('shared.css')).replace('{{css:katex}}', katexCss).replace('{{js:shared}}', read('shared.js'));
  writeFileSync(join(out, `${name}.html`), html);
  console.log(`wrote ${name}.html`);
}
