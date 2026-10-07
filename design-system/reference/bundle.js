/* @ds-bundle: {"format":4,"namespace":"PTSB","components":[{"name":"Logo"},{"name":"Icon"},{"name":"Button"},{"name":"IconButton"},{"name":"Tag"},{"name":"DifficultyTag"},{"name":"SectionTabs"},{"name":"ReaderHeader"},{"name":"ChapterToc"},{"name":"ParagraphRail"},{"name":"ChapterHeader"},{"name":"ParagraphHeading"},{"name":"Prose"},{"name":"Formula"},{"name":"FormulaRef"},{"name":"Figure"},{"name":"RevealBlock"},{"name":"ExerciseCard"},{"name":"FormulaCard"},{"name":"CodeCell"},{"name":"GraphPanel"},{"name":"BookCard"},{"name":"ImportDropzone"},{"name":"ChapterPager"},{"name":"Reader"}]} */
(function () {
  var React = window.React, h = React.createElement, useState = React.useState;
  var ICONS = {"book-open":"<path d=\"M12 5v16\" /> <path d=\"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z\" />","book-marked":"<path d=\"M10 2v7.751a.25.25 0 00.407.195l2.28-1.834a.5.5 0 01.627 0l2.28 1.834A.25.25 0 0016 9.751V2\" /> <path d=\"M4 19.5v-15A2.5 2.5 0 016.5 2H19a1 1 0 011 1v18a1 1 0 01-1 1H6.5a1 1 0 010-5H20\" />","sigma":"<path d=\"M18 7V5a1 1 0 0 0-1-1H6.5a.5.5 0 0 0-.4.8l4.5 6a2 2 0 0 1 0 2.4l-4.5 6a.5.5 0 0 0 .4.8H17a1 1 0 0 0 1-1v-2\" />","pencil-line":"<path d=\"M13 21h8\" /> <path d=\"m15 5 4 4\" /> <path d=\"M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z\" />","graduation-cap":"<path d=\"M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z\" /> <path d=\"M22 10v6\" /> <path d=\"M6 12.5V16a6 3 0 0 0 12 0v-3.5\" />","terminal":"<path d=\"M12 19h8\" /> <path d=\"m4 17 6-6-6-6\" />","chart-line":"<path d=\"M3 3v16a2 2 0 0 0 2 2h16\" /> <path d=\"m19 9-5 5-4-4-3 3\" />","printer":"<path d=\"M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2\" /> <path d=\"M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6\" /> <rect x=\"6\" y=\"14\" width=\"12\" height=\"8\" rx=\"1\" />","sun":"<circle cx=\"12\" cy=\"12\" r=\"4\" /> <path d=\"M12 2v2\" /> <path d=\"M12 20v2\" /> <path d=\"m4.93 4.93 1.41 1.41\" /> <path d=\"m17.66 17.66 1.41 1.41\" /> <path d=\"M2 12h2\" /> <path d=\"M20 12h2\" /> <path d=\"m6.34 17.66-1.41 1.41\" /> <path d=\"m19.07 4.93-1.41 1.41\" />","moon":"<path d=\"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401\" />","lightbulb":"<path d=\"M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5\" /> <path d=\"M9 18h6\" /> <path d=\"M10 22h4\" />","circle-check":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"m16 9-5.5 5.5L8 12\" />","eye-off":"<path d=\"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49\" /> <path d=\"M14.084 14.158a3 3 0 0 1-4.242-4.242\" /> <path d=\"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143\" /> <path d=\"m2 2 20 20\" />","play":"<path d=\"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z\" />","rotate-ccw":"<path d=\"M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8\" /> <path d=\"M3 3v5h5\" />","copy":"<rect width=\"14\" height=\"14\" x=\"8\" y=\"8\" rx=\"2\" ry=\"2\" /> <path d=\"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2\" />","upload":"<path d=\"M12 3v12\" /> <path d=\"m17 8-5-5-5 5\" /> <path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\" />","lock":"<rect width=\"18\" height=\"11\" x=\"3\" y=\"11\" rx=\"2\" ry=\"2\" /> <path d=\"M7 11V7a5 5 0 0 1 10 0v4\" />","search":"<path d=\"m21 21-4.34-4.34\" /> <circle cx=\"11\" cy=\"11\" r=\"8\" />","menu":"<path d=\"M4 5h16\" /> <path d=\"M4 12h16\" /> <path d=\"M4 19h16\" />","chevron-right":"<path d=\"m9 18 6-6-6-6\" />","chevron-down":"<path d=\"m6 9 6 6 6-6\" />","arrow-left":"<path d=\"m12 19-7-7 7-7\" /> <path d=\"M19 12H5\" />","arrow-right":"<path d=\"M5 12h14\" /> <path d=\"m12 5 7 7-7 7\" />","x":"<path d=\"M18 6 6 18\" /> <path d=\"m6 6 12 12\" />","bookmark":"<path d=\"M17 3a2 2 0 0 1 2 2v15a1 1 0 0 1-1.496.868l-4.512-2.578a2 2 0 0 0-1.984 0l-4.512 2.578A1 1 0 0 1 5 20V5a2 2 0 0 1 2-2z\" />","circle-alert":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <line x1=\"12\" x2=\"12\" y1=\"8\" y2=\"12\" /> <line x1=\"12\" x2=\"12.01\" y1=\"16\" y2=\"16\" />","image":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" ry=\"2\" /> <circle cx=\"9\" cy=\"9\" r=\"2\" /> <path d=\"m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21\" />","list":"<path d=\"M3 5h.01\" /> <path d=\"M3 12h.01\" /> <path d=\"M3 19h.01\" /> <path d=\"M8 5h13\" /> <path d=\"M8 12h13\" /> <path d=\"M8 19h13\" />","panel-left":"<rect width=\"18\" height=\"18\" x=\"3\" y=\"3\" rx=\"2\" /> <path d=\"M9 3v18\" />","file-archive":"<path d=\"M13.659 22H18a2 2 0 0 0 2-2V8a2.4 2.4 0 0 0-.706-1.706l-3.588-3.588A2.4 2.4 0 0 0 14 2H6a2 2 0 0 0-2 2v11.5\" /> <path d=\"M14 2v5a1 1 0 0 0 1 1h5\" /> <path d=\"M8 12v-1\" /> <path d=\"M8 18v-2\" /> <path d=\"M8 7V6\" /> <circle cx=\"8\" cy=\"20\" r=\"2\" />","check":"<path d=\"M20 6 9 17l-5-5\" />","clock":"<circle cx=\"12\" cy=\"12\" r=\"10\" /> <path d=\"M12 6v6l4 2\" />","user":"<path d=\"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2\" /> <circle cx=\"12\" cy=\"7\" r=\"4\" />","settings":"<path d=\"M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915\" /> <circle cx=\"12\" cy=\"12\" r=\"3\" />","code":"<path d=\"m16 18 6-6-6-6\" /> <path d=\"m8 6-6 6 6 6\" />","refresh-cw":"<path d=\"M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8\" /> <path d=\"M21 3v5h-5\" /> <path d=\"M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16\" /> <path d=\"M8 16H3v5\" />"};
  function cx() { return Array.prototype.filter.call(arguments, Boolean).join(' '); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function tex(latex, display) {
    if (window.katex) { try { return window.katex.renderToString(latex, { displayMode: !!display, throwOnError: false }); } catch (e) { /* fall through */ } }
    return '<span class="sb-formula-src">' + esc(latex) + '</span>';
  }
  function Math_(p) { return h(p.inline ? 'span' : 'div', { className: p.className, dangerouslySetInnerHTML: { __html: tex(p.latex, !p.inline) } }); }

  function Icon(p) {
    var size = p.size || 20;
    return h('svg', { className: cx('sb-icon', p.className), width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: p.strokeWidth || 1.75, strokeLinecap: 'round', strokeLinejoin: 'round', role: p.label ? 'img' : undefined, 'aria-label': p.label, 'aria-hidden': p.label ? undefined : true, dangerouslySetInnerHTML: { __html: ICONS[p.name] || '' } });
  }
  function icon(n, s) { return typeof n === 'string' ? h(Icon, { name: n, size: s }) : n; }

  var PAGES = [40, 52, 64], OPS = [0.5, 0.7, 0.9];
  function Logo(p) {
    var size = p.size || 28, small = size < 32;
    var ys = small ? [44, 62] : PAGES, ops = small ? [0.6, 0.95] : OPS, sw = small ? 8 : 5, dy = small ? -6 : -9, w = small ? 12 : 9;
    var x0 = 50 - w / 2, x1 = 50 + w / 2;
    var kids = [h('path', { key: 'r', className: 'sb-logo-ribbon', d: 'M' + x0 + ',' + (72 + dy) + ' H' + x1 + ' V' + (90 + dy) + ' L50,' + (85.5 + dy) + ' L' + x0 + ',' + (90 + dy) + ' Z' })];
    ys.forEach(function (y, i) { y += dy; kids.push(h('path', { key: i, className: 'sb-logo-page', strokeWidth: sw, opacity: ops[i], d: 'M14,' + (y - 2) + ' C30,' + (y - 4) + ' 42,' + (y - 2) + ' 50,' + (y + 6) + ' C58,' + (y - 2) + ' 70,' + (y - 4) + ' 86,' + (y - 2) })); });
    var svg = h('svg', { width: size, height: size, viewBox: '6 10 88 88', 'aria-hidden': true }, kids);
    return h('span', { className: 'sb-logo', role: 'img', 'aria-label': p.wordmark ? undefined : 'PoliTost Smartbook' }, svg, p.wordmark ? h('span', { className: 'sb-logo-word', style: { fontSize: Math.round(size * 0.72) } }, 'Smartbook') : null);
  }

  function Button(p) {
    var rest = Object.assign({}, p); ['variant', 'size', 'icon', 'block', 'iconEnd', 'children', 'className'].forEach(function (k) { delete rest[k]; });
    var cls = cx('sb-btn', 'sb-btn-' + (p.variant || 'secondary'), p.size && p.size !== 'md' && 'sb-btn-' + p.size, p.block && 'sb-btn-block', p.className);
    return h(p.href ? 'a' : 'button', Object.assign({ type: p.href ? undefined : 'button', className: cls }, rest), p.icon ? icon(p.icon, p.size === 'sm' ? 16 : 18) : null, p.children, p.iconEnd ? icon(p.iconEnd, p.size === 'sm' ? 16 : 18) : null);
  }
  function IconButton(p) {
    var rest = Object.assign({}, p); ['variant', 'size', 'icon', 'label', 'className'].forEach(function (k) { delete rest[k]; });
    return h('button', Object.assign({ type: 'button', className: cx('sb-btn', 'sb-iconbtn', 'sb-btn-' + (p.variant || 'ghost'), p.size === 'sm' && 'sb-btn-sm', p.className), 'aria-label': p.label, title: p.label }, rest), icon(p.icon, p.size === 'sm' ? 16 : 20));
  }

  function Tag(p) { return h('span', { className: cx('sb-tag', p.tone && p.tone !== 'neutral' && 'sb-tag-' + p.tone) }, p.icon ? icon(p.icon, 14) : null, p.children); }

  var DIFF = { facile: 1, medio: 2, difficile: 3 };
  function DifficultyTag(p) {
    var n = DIFF[p.level] || 1;
    return h('span', { className: 'sb-diff sb-diff-' + p.level, title: 'Difficoltà: ' + p.level },
      h('span', { className: 'sb-diff-bars', 'aria-hidden': true }, [1, 2, 3].map(function (i) { return h('i', { key: i, className: i <= n ? 'on' : '' }); })),
      p.children || p.level);
  }

  var SECTION_ICONS = { smartbook: 'book-open', formulario: 'sigma', esercizi: 'pencil-line', esami: 'graduation-cap', ide: 'terminal', grafici: 'chart-line' };
  function SectionTabs(p) {
    var st = useState(p.defaultValue || (p.items[0] && p.items[0].value)); var value = p.value !== undefined ? p.value : st[0];
    return h('div', { className: cx('sb-tabs', p.compact && 'sb-tabs-compact'), role: 'tablist', 'aria-label': p.label || 'Sezioni del libro' },
      p.items.map(function (it) {
        var sel = it.value === value;
        return h('button', { key: it.value, type: 'button', role: 'tab', className: 'sb-tab', 'aria-selected': sel, title: p.compact ? it.label : undefined, onClick: function () { st[1](it.value); p.onChange && p.onChange(it.value); } },
          (it.icon || SECTION_ICONS[it.value]) ? icon(it.icon || SECTION_ICONS[it.value], 16) : null, h('span', { className: 'sb-tab-text' }, it.label));
      }));
  }

  function ReaderHeader(p) {
    var dark = p.theme === 'dark';
    return h('header', { className: 'sb-header' },
      h('div', { className: 'sb-header-start' },
        p.onMenu ? h(IconButton, { icon: 'panel-left', label: 'Indice', onClick: p.onMenu }) : null,
        h('a', { href: p.homeHref || '#', className: 'sb-logo', 'aria-label': 'Libreria' }, h(Logo, { size: 28, wordmark: true })),
        h('div', { className: 'sb-header-book' }, p.subject ? h(Tag, { tone: 'subject' }, p.subject) : null, h('h1', { className: 'sb-header-title', title: p.title }, p.title))),
      h('div', { className: 'sb-header-center' }, p.sections ? h(SectionTabs, { items: p.sections, value: p.active, onChange: p.onSection, compact: p.compact }) : null),
      h('div', { className: 'sb-header-actions' },
        p.onPrint ? h(IconButton, { icon: 'printer', label: 'Versione stampabile', onClick: p.onPrint }) : null,
        h(IconButton, { icon: dark ? 'sun' : 'moon', label: dark ? 'Tema chiaro' : 'Tema scuro', onClick: p.onTheme })));
  }

  function ChapterToc(p) {
    return h('nav', { className: 'sb-toc', 'aria-label': 'Indice dei capitoli' },
      p.bookTitle ? h('div', { className: 'sb-toc-book' }, p.subject ? h(Tag, { tone: 'subject' }, p.subject) : null, h('h2', null, p.bookTitle)) : null,
      h('span', { className: 'sb-eyebrow' }, p.title || 'Indice'),
      h('ol', null, p.chapters.map(function (ch) {
        var cur = ch.id === p.activeChapter;
        return h('li', { key: ch.id },
          h('a', { className: 'sb-toc-ch', href: ch.href || '#' + ch.id, 'aria-current': cur ? 'page' : undefined }, h('span', { className: 'sb-toc-num' }, ch.number), h('span', null, ch.title)),
          cur && ch.paragraphs ? h('ol', { className: 'sb-toc-paras' }, ch.paragraphs.map(function (pa) {
            return h('li', { key: pa.id }, h('a', { className: 'sb-toc-para', href: '#' + pa.id, 'aria-current': pa.id === p.activeParagraph ? 'location' : undefined }, pa.title));
          })) : null);
      })));
  }

  function ParagraphRail(p) {
    return h('nav', { className: 'sb-rail', 'aria-label': p.title || 'In questo capitolo' },
      h('span', { className: 'sb-eyebrow' }, p.title || 'In questo capitolo'),
      h('ol', { className: 'sb-rail-list' }, p.items.map(function (it) {
        return h('li', { key: it.id }, h('a', { className: 'sb-rail-item', href: '#' + it.id, 'aria-current': it.id === p.active ? 'location' : undefined, onClick: p.onJump ? function (e) { e.preventDefault(); p.onJump(it.id); } : undefined }, h('span', { className: 'sb-rail-num' }, it.number), h('span', null, it.title)));
      })),
      p.progress != null ? h('div', { className: 'sb-rail-progress' }, h('div', { className: 'sb-meter', role: 'meter', 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': p.progress, 'aria-label': 'Capitolo letto' }, h('span', { style: { width: p.progress + '%' } })), p.progress + ' %') : null);
  }

  function ChapterHeader(p) {
    return h('header', { className: 'sb-chhead' },
      h('span', { className: 'sb-eyebrow' }, (p.eyebrow || 'Capitolo') + ' ' + p.number),
      h('h1', null, p.title),
      h('div', { className: 'sb-chhead-meta' },
        p.paragraphs != null ? h('span', null, icon('list', 16), p.paragraphs + ' paragrafi') : null,
        p.minutes != null ? h('span', null, icon('clock', 16), 'circa ' + p.minutes + ' min') : null,
        p.onPrint ? h(Button, { size: 'sm', icon: 'printer', onClick: p.onPrint }, 'Versione stampabile') : null));
  }

  function ParagraphHeading(p) {
    return h('h2', { className: 'sb-phead', id: p.id }, h('span', { className: 'sb-phead-num' }, p.number), h('span', null, p.children), p.id ? h('a', { className: 'sb-phead-anchor', href: '#' + p.id, 'aria-label': 'Link al paragrafo' }, '#') : null);
  }

  function Prose(p) { return h('div', { className: 'sb-prose', dangerouslySetInnerHTML: p.html ? { __html: p.html } : undefined }, p.html ? undefined : p.children); }

  function Formula(p) {
    return h('figure', { className: 'sb-formula', id: p.number ? 'f-' + p.number : undefined, style: { margin: undefined } },
      h(Math_, { className: 'sb-formula-math', latex: p.latex }),
      p.number ? h('span', { className: 'sb-formula-num', 'aria-label': 'Formula ' + p.number }, '(' + p.number + ')') : null,
      p.label ? h('figcaption', { className: 'sb-formula-label' }, p.label) : null);
  }

  function FormulaRef(p) {
    var st = useState(!!p.defaultOpen), open = st[0], set = st[1];
    return h('span', { className: 'sb-fref', onMouseEnter: function () { set(true); }, onMouseLeave: function () { if (!p.defaultOpen) set(false); } },
      h('button', { type: 'button', className: 'sb-fref-chip', 'aria-expanded': open, onFocus: function () { set(true); }, onBlur: function () { if (!p.defaultOpen) set(false); }, onClick: p.onOpen }, '(' + p.number + ')'),
      open ? h('span', { className: 'sb-fref-pop', role: 'tooltip' },
        h('span', { className: 'sb-fref-pop-head' }, h('span', null, p.label), h('b', null, '(' + p.number + ')')),
        h(Math_, { className: 'sb-fref-pop-math', latex: p.latex }),
        p.onOpen ? h('span', { className: 'sb-fref-pop-foot' }, h(Button, { size: 'sm', variant: 'ghost', iconEnd: 'arrow-right', onClick: p.onOpen }, 'Apri nel formulario')) : null) : null);
  }

  function Figure(p) {
    if (p.missing) return h('figure', { className: 'sb-figure' }, h('div', { className: 'sb-figure-frame' }, h('span', { className: 'sb-figure-missing' }, icon('image', 18), 'Immagine non disponibile: ' + p.src)));
    return h('figure', { className: 'sb-figure' },
      h('div', { className: 'sb-figure-frame' }, p.children || h('img', { src: p.src, alt: p.alt || '' })),
      p.caption ? h('figcaption', null, p.number ? h('b', null, 'Fig. ' + p.number) : null, p.caption) : null);
  }

  var REVEAL = { hint: { icon: 'lightbulb', show: 'Mostra suggerimento', label: 'Suggerimento' }, solution: { icon: 'circle-check', show: 'Mostra soluzione', label: 'Soluzione' } };
  function RevealBlock(p) {
    var v = REVEAL[p.variant || 'hint'], st = useState(!!p.defaultOpen), open = st[0];
    return h('div', { className: cx('sb-reveal', 'sb-reveal-' + (p.variant || 'hint'), open && 'sb-reveal-open') },
      open ? h('div', { className: 'sb-reveal-panel' },
        h('div', { className: 'sb-reveal-head' }, h('span', { className: 'sb-reveal-label' }, icon(v.icon, 16), p.label || v.label), h(Button, { size: 'sm', variant: 'ghost', icon: 'eye-off', onClick: function () { st[1](false); } }, 'Nascondi')),
        h('div', { className: 'sb-reveal-body' }, p.children))
        : h(Button, { size: 'sm', icon: v.icon, onClick: function () { st[1](true); }, 'aria-expanded': false }, p.showLabel || v.show));
  }

  function ExerciseCard(p) {
    return h('article', { className: 'sb-ex', id: 'ex-' + p.id },
      h('header', { className: 'sb-ex-head' }, h('span', { className: 'sb-ex-id' }, p.id), p.chapter ? h('span', { className: 'sb-ex-ch' }, 'cap. ' + p.chapter) : null, p.difficulty ? h(DifficultyTag, { level: p.difficulty }) : null),
      h('div', { className: 'sb-ex-q' }, p.children),
      (p.hint || p.solution) ? h('div', { className: 'sb-ex-actions' },
        p.hint ? h(RevealBlock, { variant: 'hint', defaultOpen: p.hintOpen }, p.hint) : null,
        p.solution ? h(RevealBlock, { variant: 'solution', defaultOpen: p.solutionOpen }, p.solution) : null) : null);
  }

  function FormulaCard(p) {
    return h('section', { className: 'sb-fcard' },
      h('header', { className: 'sb-fcard-head' }, h('span', { className: 'sb-eyebrow' }, 'Cap. ' + p.chapter), h('h3', null, p.title)),
      p.items.map(function (f) { return h('a', { key: f.number, className: 'sb-fcard-row', href: f.href || '#f-' + f.number, id: 'form-' + f.number }, h('span', { className: 'sb-fcard-num' }, '(' + f.number + ')'), h('span', { className: 'sb-fcard-label' }, f.label), h(Math_, { className: 'sb-fcard-math', latex: f.latex })); }));
  }

  var STATUS = { running: ['refresh-cw', 'In esecuzione…'], ok: ['circle-check', 'Completato'], error: ['circle-alert', 'Errore'] };
  function CodeCell(p) {
    var lines = (p.code || '').split('\n');
    var s = STATUS[p.status];
    return h('section', { className: 'sb-code' },
      h('header', { className: 'sb-code-head' }, h('h3', null, p.title), h(Tag, { tone: 'outline' }, p.language || 'python'),
        h('div', { className: 'sb-code-actions' }, h(Button, { size: 'sm', variant: 'ghost', icon: 'rotate-ccw', onClick: p.onReset }, 'Ripristina'), h(Button, { size: 'sm', variant: 'primary', icon: 'play', onClick: p.onRun, disabled: p.status === 'running' }, 'Esegui'))),
      p.description ? h('p', { className: 'sb-code-desc' }, p.description) : null,
      h('div', { className: 'sb-code-editor' }, h('div', { className: 'sb-code-gutter', 'aria-hidden': true }, lines.map(function (_, i) { return h('div', { key: i }, i + 1); })), h('pre', { className: 'sb-code-src' }, p.code)),
      p.output != null || s ? h('div', { className: cx('sb-code-out', p.status === 'error' && 'sb-code-out-error') },
        h('div', { className: 'sb-code-out-head' }, 'Output', s ? h('span', { className: 'sb-code-status sb-code-status-' + p.status }, icon(s[0], 14), s[1]) : null),
        p.output != null ? h('pre', null, p.output) : null) : null);
  }

  function GraphPanel(p) {
    var W = 640, H = 300, pad = 32, d = p.domain || [-2, 4], r = p.range || [-2, 8];
    var sx = function (x) { return pad + (x - d[0]) / (d[1] - d[0]) * (W - 2 * pad); }, sy = function (y) { return H - pad - (y - r[0]) / (r[1] - r[0]) * (H - 2 * pad); };
    var grid = [], ticks = [];
    for (var x = Math.ceil(d[0]); x <= d[1]; x++) { grid.push(h('line', { key: 'gx' + x, className: 'g-grid', x1: sx(x), x2: sx(x), y1: pad, y2: H - pad })); ticks.push(h('text', { key: 'tx' + x, className: 'g-tick', x: sx(x), y: H - pad + 16, textAnchor: 'middle' }, x)); }
    for (var y = Math.ceil(r[0]); y <= r[1]; y += 2) { grid.push(h('line', { key: 'gy' + y, className: 'g-grid', x1: pad, x2: W - pad, y1: sy(y), y2: sy(y) })); ticks.push(h('text', { key: 'ty' + y, className: 'g-tick', x: pad - 8, y: sy(y) + 4, textAnchor: 'end' }, y)); }
    var paths = (p.series || []).map(function (s, i) {
      var pts = []; for (var k = 0; k <= 160; k++) { var xx = d[0] + (d[1] - d[0]) * k / 160, yy = s.fn(xx); if (yy >= r[0] - 1 && yy <= r[1] + 1) pts.push((pts.length ? 'L' : 'M') + sx(xx).toFixed(1) + ',' + sy(yy).toFixed(1)); }
      return h('path', { key: i, className: 'g-s' + (i + 1), d: pts.join(' ') });
    });
    return h('section', { className: 'sb-graph' },
      h('header', { className: 'sb-graph-head' }, h('h3', null, p.title), p.tabs ? h(SectionTabs, { items: p.tabs, value: p.activeTab, label: 'Grafici' }) : null),
      h('div', { className: 'sb-graph-plot' }, h('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': p.title },
        h('defs', null, h('clipPath', { id: 'sbclip' }, h('rect', { x: pad, y: pad, width: W - 2 * pad, height: H - 2 * pad }))),
        grid, h('line', { className: 'g-axis', x1: pad, x2: W - pad, y1: sy(0), y2: sy(0) }), h('line', { className: 'g-axis', x1: sx(0), x2: sx(0), y1: pad, y2: H - pad }), ticks,
        h('g', { clipPath: 'url(#sbclip)' }, paths),
        (p.points || []).map(function (pt, i) { return h('circle', { key: i, className: 'g-pt', cx: sx(pt[0]), cy: sy(pt[1]), r: 5 }); }))),
      h('div', { className: 'sb-graph-legend' }, (p.series || []).map(function (s, i) { return h('span', { key: i }, h('i', { className: i ? 's2' : '' }), h('code', null, s.label)); })));
  }

  function BookCard(p) {
    return h('article', { className: 'sb-book' },
      h('div', { className: 'sb-book-cover' },
        h('div', { className: 'sb-book-badges' }, h(Tag, { tone: 'subject' }, p.subject), p.uploaded ? h(Tag, { tone: 'uploaded', icon: 'upload' }, 'importato') : null, p.licensed ? h(Tag, { tone: 'licensed', icon: 'lock' }, 'con licenza') : null),
        h(Logo, { size: 44 })),
      h('div', { className: 'sb-book-body' }, h('h3', null, p.title), p.meta ? h('span', { className: 'sb-book-meta' }, p.meta) : null,
        h('div', { className: 'sb-book-foot' }, h(Button, { size: 'sm', iconEnd: 'arrow-right', href: p.href, onClick: p.onOpen }, p.cta || 'Apri'), p.onRemove ? h(IconButton, { size: 'sm', icon: 'x', label: 'Rimuovi dalla libreria', onClick: p.onRemove }) : null)));
  }

  function ImportDropzone(p) {
    var st = p.state || 'idle';
    return h('div', { className: cx('sb-drop', st === 'drag' && 'sb-drop-drag'), role: 'region', 'aria-label': 'Importa smartbook' },
      h('span', { className: 'sb-drop-icon' }, icon('file-archive', 22)),
      h('h3', null, st === 'drag' ? 'Rilascia per importare' : (p.title || 'Importa uno smartbook')),
      h('p', null, p.hint || 'Trascina qui un file .ptsb oppure sceglilo dal computer. Resta nel tuo browser.'),
      st === 'drag' ? null : h(Button, { icon: 'upload', onClick: p.onPick }, 'Scegli file .ptsb'),
      st === 'success' || st === 'error' ? h('span', { className: 'sb-drop-status sb-drop-status-' + st, role: 'status' }, icon(st === 'success' ? 'circle-check' : 'circle-alert', 16), p.message) : null);
  }

  function ChapterPager(p) {
    return h('nav', { className: 'sb-pager', 'aria-label': 'Capitoli' },
      p.prev ? h('a', { href: p.prev.href || '#' }, h('small', null, icon('arrow-left', 14), 'Precedente'), h('span', null, p.prev.number + '. ' + p.prev.title)) : null,
      p.next ? h('a', { className: 'next', href: p.next.href || '#' }, h('small', null, 'Successivo', icon('arrow-right', 14)), h('span', null, p.next.number + '. ' + p.next.title)) : null);
  }

  function Reader(p) {
    return h('div', { className: 'sb-reader' },
      p.header,
      h('div', { className: 'sb-reader-body' }, p.toc, h('main', { className: 'sb-reader-main' }, p.children), h('aside', { className: 'sb-reader-rail' }, p.rail)));
  }

  window.PTSB = { Logo: Logo, Icon: Icon, Button: Button, IconButton: IconButton, Tag: Tag, DifficultyTag: DifficultyTag, SectionTabs: SectionTabs, ReaderHeader: ReaderHeader, ChapterToc: ChapterToc, ParagraphRail: ParagraphRail, ChapterHeader: ChapterHeader, ParagraphHeading: ParagraphHeading, Prose: Prose, Formula: Formula, FormulaRef: FormulaRef, Figure: Figure, RevealBlock: RevealBlock, ExerciseCard: ExerciseCard, FormulaCard: FormulaCard, CodeCell: CodeCell, GraphPanel: GraphPanel, BookCard: BookCard, ImportDropzone: ImportDropzone, ChapterPager: ChapterPager, Reader: Reader, tex: tex };
})();
