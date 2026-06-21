import { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildPrintUrl, type PrintTarget } from '../print/routes';

/** Navigate to the dedicated print preview route */
export function usePrintMode() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (target: PrintTarget) => {
      const returnTo = location.pathname + location.search + location.hash;
      const url = buildPrintUrl(target.bookId, target.section, {
        chapterId: target.chapterId,
        returnTo,
      });
      navigate(url);
    },
    [navigate, location],
  );
}
