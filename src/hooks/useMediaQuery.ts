import { useEffect, useState } from 'react';

/** Portrait phones + landscape phones (short viewport height). */
export const MOBILE_LAYOUT_QUERY = '(max-width: 768px), (max-height: 520px)';

/** ponytail: single listener per hook instance; fine for a few chrome components */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
