import { useEffect, useState } from 'react';

/** Hide bulky header after scrolling down; restore when near top or scrolling up. */
export function useCompactChrome(enabled: boolean, threshold = 56) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setCompact(false);
      return;
    }

    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= threshold) {
        setCompact(false);
      } else if (y > lastY + 4) {
        setCompact(true);
      } else if (y < lastY - 4) {
        setCompact(false);
      }
      lastY = y;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [enabled, threshold]);

  return compact;
}
