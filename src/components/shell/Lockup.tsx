import lockupLight from '../../../design-system/logo/ptsb-lockup-light.svg';
import lockupDark from '../../../design-system/logo/ptsb-lockup-dark.svg';
import markLight from '../../../design-system/logo/ptsb-mark-light.svg';
import markDark from '../../../design-system/logo/ptsb-mark-dark.svg';
import markSmallLight from '../../../design-system/logo/ptsb-mark-small-light.svg';
import markSmallDark from '../../../design-system/logo/ptsb-mark-small-dark.svg';
import { useTheme } from '../../context/ThemeContext';

interface LockupProps {
  className?: string;
  /** Mark height in px; the lockup is 28px tall in the header. */
  size?: number;
}

/** Mark + "Smartbook" wordmark (theme aware). */
export function Lockup({ className, size = 28 }: LockupProps) {
  const { theme } = useTheme();
  return (
    <img
      className={className}
      src={theme === 'dark' ? lockupDark : lockupLight}
      alt="Smartbook"
      height={size}
      style={{ height: size, width: 'auto', display: 'block' }}
    />
  );
}

/** Mark alone; below 32px the two-page small mark is used. */
export function Mark({ size = 44, className }: { size?: number; className?: string }) {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  const src = size < 32 ? (dark ? markSmallDark : markSmallLight) : dark ? markDark : markLight;
  return <img className={className} src={src} alt="" aria-hidden width={size} height={size} />;
}
