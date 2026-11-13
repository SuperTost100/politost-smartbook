import { BookOpen, Clock } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

interface ChapterHeaderProps {
  number: number;
  title: string;
  paragraphs?: number;
  minutes?: number;
  eyebrow?: string;
}

/** Top of a chapter: eyebrow, title and reading facts. */
export function ChapterHeader({ number, title, paragraphs, minutes, eyebrow = 'Capitolo' }: ChapterHeaderProps) {
  return (
    <SectionHeader
      eyebrow={`${eyebrow} ${number}`}
      title={title}
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
