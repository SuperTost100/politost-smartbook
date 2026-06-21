const SUBJECT_ACCENTS: Record<string, string> = {
  Esempio: 'book-card-accent--esempio',
  Fisica: 'book-card-accent--fisica',
  Chimica: 'book-card-accent--chimica',
  Matematica: 'book-card-accent--matematica',
  Biologia: 'book-card-accent--biologia',
  Informatica: 'book-card-accent--informatica',
};

export function subjectAccentClass(subject: string): string {
  return SUBJECT_ACCENTS[subject] ?? 'book-card-accent--default';
}
