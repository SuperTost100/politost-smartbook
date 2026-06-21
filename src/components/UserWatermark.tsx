import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';

function shortId(id: string): string {
  return id.replace(/-/g, '').slice(0, 8);
}

function forensicToken(userId: string, bookId: string): string {
  const raw = `${userId}:${bookId}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) h = (h * 31 + raw.charCodeAt(i)) | 0;
  const chars = ['\u200b', '\u200c', '\u200d', '\ufeff'];
  return Array.from({ length: 8 }, (_, i) => chars[(h >> (i * 2)) & 3]).join('');
}

interface UserWatermarkProps {
  bookId: string;
  licensed: boolean;
}

export function UserWatermark({ bookId, licensed }: UserWatermarkProps) {
  const { user } = useAuth();

  const label = useMemo(() => {
    if (!user) return '';
    const session = new Date().toISOString().slice(0, 16).replace('T', ' ');
    return `${user.email} · ${shortId(user.id)} · ${session}`;
  }, [user]);

  if (!user) return null;

  return (
    <div
      className={`user-watermark ${licensed ? 'user-watermark--licensed' : 'user-watermark--public'}`}
      aria-hidden
      data-ptsb-uid={user.id}
      data-ptsb-book={bookId}
    >
      <div className="user-watermark-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <span className="user-watermark-forensic">{forensicToken(user.id, bookId)}</span>
    </div>
  );
}
