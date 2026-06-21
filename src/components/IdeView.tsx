import { useCallback, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { IdeSnippet } from '../types/smartbook';
import { runCode } from '../lib/codeRunner';

interface IdeViewProps {
  snippets: IdeSnippet[];
}

const LANG_LABELS: Record<string, string> = {
  python: 'Python',
  matlab: 'MATLAB',
  octave: 'Octave',
};

export function IdeView({ snippets }: IdeViewProps) {
  const [active, setActive] = useState(snippets[0]?.id ?? '');
  const [code, setCode] = useState(snippets[0]?.code ?? '');
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);

  const snippet = snippets.find((s) => s.id === active) ?? snippets[0];

  useEffect(() => {
    if (snippet) setCode(snippet.code);
  }, [snippet]);

  const handleRun = useCallback(async () => {
    if (!snippet) return;
    setRunning(true);
    setLoading(true);
    setOutput('Preparazione ambiente...\n');

    const result = await runCode(snippet.language, code);
    setLoading(false);
    setRunning(false);

    const lines: string[] = [];
    if (result.stdout) lines.push(result.stdout);
    if (result.stderr) lines.push(result.stderr);
    if (result.error) lines.push(`\n⚠ ${result.error}`);
    setOutput(lines.join('\n') || '(nessun output)');
  }, [snippet, code]);

  if (!snippet) {
    return <p className="empty-note">Nessuno snippet disponibile.</p>;
  }

  const langLabel = LANG_LABELS[snippet.language.toLowerCase()] ?? snippet.language;

  return (
    <div className="ide-view">
      <div className="view-toolbar">
        <h2>Laboratorio — IDE</h2>
        <button
          type="button"
          className="btn-run"
          onClick={handleRun}
          disabled={running}
        >
          {running ? (loading ? 'Caricamento...' : 'Esecuzione...') : '▶ Esegui'}
        </button>
      </div>

      <div className="ide-layout">
        <aside className="ide-sidebar">
          <h3>Script</h3>
          <ul>
            {snippets.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={s.id === active ? 'active' : ''}
                  onClick={() => setActive(s.id)}
                >
                  {s.title}
                  <span className="ide-lang-tag">{LANG_LABELS[s.language] ?? s.language}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="ide-main">
          {snippet.description && (
            <p className="ide-description">{snippet.description}</p>
          )}
          <Editor
            height="360px"
            language={snippet.language === 'matlab' ? 'matlab' : snippet.language}
            value={code}
            onChange={(v) => setCode(v ?? '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              scrollBeyondLastLine: false,
            }}
          />

          <div className="ide-output">
            <div className="ide-output-header">
              Output — {langLabel}
            </div>
            <pre className="ide-output-body">{output || 'Premi "Esegui" per vedere il risultato.'}</pre>
          </div>

          <p className="ide-note no-print">
            Python eseguito con Pyodide nel browser. MATLAB usa un interprete compatibile per script didattici semplici.
          </p>
        </div>
      </div>
    </div>
  );
}
