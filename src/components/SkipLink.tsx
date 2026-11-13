/** First stop for keyboard users: jumps over the header and the index to the page's main content. */
export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sb-btn sb-btn-primary sb-skip-link no-print"
      onClick={(e) => {
        // No hash in the address: the chapter's own #paragraph links and scroll handling stay as they are.
        e.preventDefault();
        const main = document.getElementById('main-content');
        if (!main) return;
        main.tabIndex = -1;
        main.focus();
      }}
    >
      Vai al contenuto
    </a>
  );
}
