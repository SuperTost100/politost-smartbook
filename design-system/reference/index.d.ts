// PoliTost Smartbook — component props (documentation; window.PTSB in previews).
import type { ReactNode, MouseEventHandler } from 'react';

export type SectionKey = 'smartbook' | 'formulario' | 'esercizi' | 'esami' | 'ide' | 'grafici';
export type Difficulty = 'facile' | 'medio' | 'difficile';

export interface LogoProps { size?: number; wordmark?: boolean }
export interface IconProps { name: string; size?: number; strokeWidth?: number; label?: string; className?: string }
export interface ButtonProps { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md' | 'lg'; icon?: string | ReactNode; iconEnd?: string | ReactNode; block?: boolean; href?: string; disabled?: boolean; onClick?: MouseEventHandler; children?: ReactNode }
export interface IconButtonProps { icon: string | ReactNode; label: string; variant?: 'ghost' | 'secondary' | 'primary'; size?: 'sm' | 'md'; onClick?: MouseEventHandler }
export interface TagProps { tone?: 'neutral' | 'subject' | 'uploaded' | 'licensed' | 'outline'; icon?: string; children: ReactNode }
export interface DifficultyTagProps { level: Difficulty; children?: ReactNode }
export interface SectionTabItem { value: SectionKey | string; label: string; icon?: string }
export interface SectionTabsProps { items: SectionTabItem[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; compact?: boolean; label?: string }
export interface ReaderHeaderProps { sections?: SectionTabItem[]; active?: string; onSection?: (value: string) => void; theme?: 'light' | 'dark'; onTheme?: () => void; onPrint?: () => void; onMenu?: () => void; title?: string; subject?: string; homeHref?: string; compact?: boolean }
export interface TocParagraph { id: string; title: string }
export interface TocChapter { id: string; number: number; title: string; href?: string; paragraphs?: TocParagraph[] }
export interface ChapterTocProps { chapters: TocChapter[]; activeChapter?: string; activeParagraph?: string; subject?: string; bookTitle?: string; title?: string }
export interface ParagraphRailProps { items: { id: string; number: string; title: string }[]; active?: string; onJump?: (id: string) => void; progress?: number; title?: string }
export interface ChapterHeaderProps { number: number; title: string; paragraphs?: number; minutes?: number; onPrint?: () => void; eyebrow?: string }
export interface ParagraphHeadingProps { number: string; id?: string; children: ReactNode }
export interface ProseProps { html?: string; children?: ReactNode }
export interface FormulaProps { latex: string; number?: string; label?: string }
export interface FormulaRefProps { number: string; label: string; latex: string; onOpen?: () => void; defaultOpen?: boolean }
export interface FigureProps { src?: string; alt?: string; caption?: string; number?: string; missing?: boolean; children?: ReactNode }
export interface RevealBlockProps { variant?: 'hint' | 'solution'; defaultOpen?: boolean; label?: string; showLabel?: string; children: ReactNode }
export interface ExerciseCardProps { id: string; chapter?: number | string; difficulty?: Difficulty; hint?: ReactNode; solution?: ReactNode; hintOpen?: boolean; solutionOpen?: boolean; children: ReactNode }
export interface FormulaCardProps { chapter: number | string; title: string; items: { number: string; label: string; latex: string; href?: string }[] }
export interface CodeCellProps { title: string; language?: 'python' | 'matlab' | 'octave'; description?: string; code: string; status?: 'idle' | 'running' | 'ok' | 'error'; output?: string; onRun?: () => void; onReset?: () => void }
export interface GraphPanelProps { title: string; tabs?: SectionTabItem[]; activeTab?: string; series?: { label: string; fn: (x: number) => number }[]; domain?: [number, number]; range?: [number, number]; points?: [number, number][] }
export interface BookCardProps { subject: string; title: string; meta?: string; uploaded?: boolean; licensed?: boolean; href?: string; onOpen?: () => void; onRemove?: () => void; cta?: string }
export interface ImportDropzoneProps { state?: 'idle' | 'drag' | 'success' | 'error'; message?: string; onPick?: () => void; title?: string; hint?: string }
export interface ChapterPagerProps { prev?: { number: number; title: string; href?: string }; next?: { number: number; title: string; href?: string } }
export interface ReaderProps { header: ReactNode; toc: ReactNode; rail?: ReactNode; children: ReactNode }
