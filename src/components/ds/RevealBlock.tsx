import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CircleCheck, EyeOff, Lightbulb } from 'lucide-react';

interface RevealBlockProps {
  variant: 'hint' | 'solution';
  children: ReactNode;
  defaultOpen?: boolean;
  /** Button text when closed; defaults to "Mostra suggerimento" / "Mostra soluzione". */
  label?: string;
}

const COPY = {
  hint: { show: 'Mostra suggerimento', title: 'Suggerimento', Icon: Lightbulb },
  solution: { show: 'Mostra soluzione', title: 'Soluzione', Icon: CircleCheck },
} as const;

/** A hint or solution that stays closed until the student asks, and can be closed again. */
export function RevealBlock({ variant, children, defaultOpen = false, label }: RevealBlockProps) {
  const [open, setOpen] = useState(defaultOpen);
  const showRef = useRef<HTMLButtonElement>(null);
  const hideRef = useRef<HTMLButtonElement>(null);
  const touched = useRef(false);
  const { show, title, Icon } = COPY[variant];

  useEffect(() => {
    if (!touched.current) return;
    (open ? hideRef : showRef).current?.focus();
  }, [open]);

  const toggle = (next: boolean) => {
    touched.current = true;
    setOpen(next);
  };

  return (
    <div className={`sb-reveal sb-reveal-${variant}${open ? ' sb-reveal-open' : ''}`}>
      {open ? (
        <div className="sb-reveal-panel" role="region" aria-label={title}>
          <div className="sb-reveal-head">
            <span className="sb-reveal-label">
              <Icon size={14} strokeWidth={1.75} aria-hidden />
              {title}
            </span>
            <button ref={hideRef} type="button" className="sb-btn sb-btn-ghost sb-btn-sm" onClick={() => toggle(false)}>
              <EyeOff size={14} strokeWidth={1.75} aria-hidden />
              Nascondi
            </button>
          </div>
          <div className="sb-reveal-body">{children}</div>
        </div>
      ) : (
        <button ref={showRef} type="button" className="sb-btn sb-btn-secondary sb-btn-sm" aria-expanded={false} onClick={() => toggle(true)}>
          <Icon size={14} strokeWidth={1.75} aria-hidden />
          {label ?? show}
        </button>
      )}
    </div>
  );
}
