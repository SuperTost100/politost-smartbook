interface MarkProps {
  /** Height in px; the mark is about 1.3 times as wide as it is tall. */
  size?: number;
  className?: string;
}

/** The open-book mark: three page strokes in the text colour and the ribbon in `--star`. */
export function Mark({ size = 24, className }: MarkProps) {
  return (
    <svg
      className={['sb-mark', className].filter(Boolean).join(' ')}
      viewBox="10 24 80 60"
      height={size}
      width={Math.round((size * 80) / 60)}
      aria-hidden
      focusable="false"
    >
      <path d="M45.5,63 H54.5 V81 L50,76.5 L45.5,81 Z" fill="var(--star)" />
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14,29 C30,27 42,29 50,37 C58,29 70,27 86,29" opacity="0.5" />
        <path d="M14,41 C30,39 42,41 50,49 C58,41 70,39 86,41" opacity="0.7" />
        <path d="M14,53 C30,51 42,53 50,61 C58,53 70,51 86,53" opacity="0.9" />
      </g>
    </svg>
  );
}

/** Mark and the "Smartbook" wordmark, set in the serif. */
export function Lockup({ className }: { className?: string }) {
  return (
    <span className={['sb-lockup', className].filter(Boolean).join(' ')}>
      <Mark size={26} />
      <span className="sb-lockup-word">Smartbook</span>
    </span>
  );
}
