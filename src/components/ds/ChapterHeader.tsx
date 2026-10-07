import { BookOpen, Clock } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

interface ChapterHeaderProps {
  number: number;
  title: string;
  paragraphs?: number;
  minutes?: number;
  onPrint?: () => void;
  eyebrow?: string;
}

/** Top of a chapter: eyebrow, title, reading facts and the print action. */
export function ChapterHeader({ number, title, paragraphs, minutes, onPrint, eyebrow = 'Capitolo' }: ChapterHeaderProps) {
  return (
    <SectionHeader
      eyebrow={`${eyebrow} ${number}`}
      title={title}
      onPrint={onPrint}
      meta={
        <>
          {paragraphs != null && (
            <span>
              <BookOpen size={14} strokeWidth={1.75} aria-hidden />
              {paragraphs} {paragraphs === 1 ? 'paragrafo' : 'paragrafi'}
            </span>
          )}
          {minutes != null && (
            <span>
              <Clock size={14} strokeWidth={1.75} aria-hidden />
              circa {minutes} min
            </span>
          )}
        </>
      }
    />
  );
}
