// Mockup-only: switches screens by hash, theme by ?theme= or the toolbar, and hides the toolbar with ?shot.
(function () {
  var params = new URLSearchParams(location.search);
  var root = document.documentElement;
  var stored = null;
  try { stored = localStorage.getItem('ptsb-mock-theme'); } catch (e) { stored = null; }
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = params.get('theme') || stored || (prefersDark ? 'dark' : 'light');
  if (params.has('shot')) root.classList.add('shot');

  var file = location.pathname.split('/').pop().replace('.html', '');
  document.querySelectorAll('[data-dir]').forEach(function (a) {
    if (a.dataset.dir === file) a.setAttribute('aria-current', 'true');
    a.addEventListener('click', function () { a.href = a.getAttribute('href').split('#')[0] + location.search.replace(/[?&]shot\b/, '') + location.hash; });
  });

  function show() {
    var view = (location.hash || '#home').slice(1);
    if (!document.querySelector('[data-view="' + view + '"]')) view = 'home';
    document.querySelectorAll('[data-view]').forEach(function (el) { el.classList.toggle('is-active', el.dataset.view === view); });
    document.querySelectorAll('[data-view-link]').forEach(function (a) {
      if (a.dataset.viewLink === view) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
    root.dataset.screen = view;
  }
  window.addEventListener('hashchange', function () { show(); window.scrollTo(0, 0); });
  show();

  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('ptsb-mock-theme', root.dataset.theme); } catch (e) { console.warn('theme not saved', e); }
    });
  });

  document.querySelectorAll('[data-drawer-open]').forEach(function (b) {
    b.addEventListener('click', function () { root.classList.toggle('drawer-open'); });
  });
})();
