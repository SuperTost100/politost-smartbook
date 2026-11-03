import { Link } from 'react-router-dom';
import type { ReadingPosition } from '../../lib/readingPosition';
import { readingPositionPath } from '../../lib/readingPosition';
import { BookCover } from './BookCover';
import { Meter } from './Meter';

interface ResumePanelProps {
  bookId: string;
  subject: string;
  bookTitle: string;
  authors?: string;
  position: ReadingPosition;
}

/** The top of the library when there is something to resume: the cover, the chapter, where the
 * reader stopped and how far into the chapter that is. */
export function ResumePanel({ bookId, subject, bookTitle, authors, position }: ResumePanelProps) {
  const href = readingPositionPath(bookId, position);
  const chapterHref = `/libro/${bookId}/capitolo/${position.chapterId}`;
  const where = position.paragraphNumber && position.paragraphTitle;

  return (
    <section className="sb-resume" aria-labelledby="resume-title">
      <Link to={href} className="sb-resume-cover" tabIndex={-1} aria-hidden>
        <BookCover subject={subject} title={bookTitle} author={authors} reading />
      </Link>
      <div className="sb-resume-body">
        <p className="sb-resume-kicker">Continua a leggere</p>
        <h1 id="resume-title">{position.chapterTitle}</h1>
        <p className="sb-resume-book">
          <strong>{bookTitle}</strong>, capitolo {position.chapterNumber}.
          {where ? (
            <> L’ultima volta eri al paragrafo {position.paragraphNumber}, <em>{position.paragraphTitle}</em>.</>
          ) : (
            <> L’ultima volta eri all’inizio del capitolo.</>
          )}
        </p>
        {position.progress != null && (
          <div className="sb-resume-progress">
            <Meter value={position.progress} label="Letto del capitolo" />
            <span>{position.progress} % del capitolo</span>
          </div>
        )}
        <div className="sb-resume-actions">
          <Link to={href} className="sb-btn sb-btn-primary">
            {where ? `Riprendi dal paragrafo ${position.paragraphNumber}` : 'Riprendi il capitolo'}
          </Link>
          {where && (
            <Link to={chapterHref} className="sb-btn">
              Dall’inizio del capitolo
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
