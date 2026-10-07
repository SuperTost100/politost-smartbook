import { ImageOff } from 'lucide-react';

interface FigureProps {
  src: string;
  alt: string;
  caption?: string;
  resolveAsset?: (src: string) => string | undefined;
}

// "Fig. 2.1 — text": the number is shown in mono, the text in the italic caption.
const CAPTION_NUMBER = /^(Fig(?:ura)?\.?\s*\d+(?:\.\d+)*)\s*[—–:-]\s*([\s\S]*)$/i;

/** An image with a numbered caption; a missing asset shows its path, never a broken image. */
export function Figure({ src, alt, caption, resolveAsset }: FigureProps) {
  const url = resolveAsset?.(src);
  const m = caption?.match(CAPTION_NUMBER);

  return (
    <figure className="sb-figure">
      <div className="sb-figure-frame">
        {url ? (
          <img src={url} alt={alt} loading="eager" decoding="async" />
        ) : (
          <div className="sb-figure-missing" role="img" aria-label={alt}>
            <ImageOff size={16} strokeWidth={1.75} aria-hidden />
            Immagine non disponibile: {src}
          </div>
        )}
      </div>
      {caption && (
        <figcaption>
          {m ? (
            <>
              <b>{m[1]}</b>
              {m[2]}
            </>
          ) : (
            caption
          )}
        </figcaption>
      )}
    </figure>
  );
}
