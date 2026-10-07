import { useCallback, useState } from 'react';
import Editor, { type BeforeMount } from '@monaco-editor/react';
import type { IdeSnippet } from '../types/smartbook';
import { runCode } from '../lib/codeRunner';
import { SectionHeader } from './ds/SectionHeader';
import { CodeCell, type RunStatus } from './ds/CodeCell';
import { useTheme } from '../context/ThemeContext';
import { FONT_MONO, ptsbColors } from '../../design-system/theme/ptsb-theme';

interface IdeViewProps {
  snippets: IdeSnippet[];
}

const LANG_LABELS: Record<string, string> = {
  python: 'python',
  matlab: 'matlab',
  octave: 'octave',
};

const hex = (c: string) => c.replace('#', '');

/** Monaco themes built from the design-system colours. */
const defineThemes: BeforeMount = (monaco) => {
  for (const mode of ['light', 'dark'] as const) {
    const c = ptsbColors[mode];
    monaco.editor.defineTheme(`ptsb-${mode}`, {
      base: mode === 'dark' ? 'vs-dark' : 'vs',
      inherit: true,
      rules: [
        { token: '', foreground: hex(c.ink) },
        { token: 'comment', foreground: hex(c.inkSubtle), fontStyle: 'italic' },
        { token: 'keyword', foreground: hex(c.primaryText) },
        { token: 'string', foreground: hex(c.starText) },
        { token: 'number', foreground: hex(c.info) },
      ],
      colors: {
        'editor.background': c.codeBg,
        'editor.foreground': c.ink,
        'editorLineNumber.foreground': c.inkSubtle,
        'editorLineNumber.activeForeground': c.ink,
        'editor.lineHighlightBackground': c.surfaceRaised,
        'editor.selectionBackground': c.primarySoft,
        'editorCursor.foreground': c.primaryText,
        'editorGutter.background': c.codeBg,
        'editorWidget.background': c.surfaceOverlay,
        'scrollbarSlider.background': c.border,
      },
    });
  }
};

export function IdeView({ snippets }: IdeViewProps) {
  const { theme } = useTheme();
  const [active, setActive] = useState(snippets[0]?.id ?? '');
  const [code, setCode] = useState(snippets[0]?.code ?? '');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<RunStatus>('idle');
  const [loading, setLoading] = useState(false);

  const snippet = snippets.find((s) => s.id === active) ?? snippets[0];

  const select = (s: IdeSnippet) => {
    setActive(s.id);
    setCode(s.code);
    setOutput('');
    setStatus('idle');
  };

  const handleRun = useCallback(async () => {
    if (!snippet) return;
    setStatus('running');
    setLoading(true);
    setOutput('Preparazione ambiente...\n');

    const result = await runCode(snippet.language, code);
    setLoading(false);

    const lines: string[] = [];
    if (result.stdout) lines.push(result.stdout);
    if (result.stderr) lines.push(result.stderr);
    if (result.error) lines.push(`\n${result.error}`);
    setOutput(lines.join('\n') || '(nessun output)');
    setStatus(result.error || result.stderr ? 'error' : 'ok');
  }, [snippet, code]);

  if (!snippet) {
    return <p className="empty-note">Nessuno snippet disponibile.</p>;
  }

  const langLabel = LANG_LABELS[snippet.language.toLowerCase()] ?? snippet.language;

  return (
    <div className="ide-view sb-page">
      <SectionHeader
        title="Laboratorio"
        meta={<span>Python eseguito nel browser con Pyodide; MATLAB con un interprete per script didattici semplici.</span>}
      />

      <div className="ide-layout">
        <nav className="ide-sidebar" aria-label="Script del laboratorio">
          <span className="sb-eyebrow">Script</span>
          <ul>
            {snippets.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  aria-current={s.id === active ? 'true' : undefined}
                  onClick={() => select(s)}
                >
                  <span>{s.title}</span>
                  <span className="sb-tag sb-tag-outline">{LANG_LABELS[s.language] ?? s.language}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <CodeCell
          title={snippet.title}
          language={langLabel}
          description={snippet.description}
          status={status}
          output={output}
          runLabel={status === 'running' ? (loading ? 'Caricamento...' : 'Esecuzione...') : 'Esegui'}
          onRun={handleRun}
          onReset={() => { setCode(snippet.code); setOutput(''); setStatus('idle'); }}
        >
          <Editor
            height="360px"
            language={snippet.language === 'matlab' ? 'matlab' : snippet.language}
            value={code}
            onChange={(v) => setCode(v ?? '')}
            beforeMount={defineThemes}
            theme={`ptsb-${theme}`}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineHeight: 22,
              fontFamily: FONT_MONO,
              scrollBeyondLastLine: false,
              padding: { top: 12, bottom: 12 },
            }}
          />
        </CodeCell>
      </div>
    </div>
  );
}
