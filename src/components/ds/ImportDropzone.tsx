import { Upload } from 'antd';
import { CircleAlert, CircleCheck, FileArchive } from 'lucide-react';

export type DropState = 'idle' | 'busy' | 'success' | 'error';

const MAX_LISTED_ERRORS = 8;

/** Validation failures arrive one per line; a list reads better than a wall of text. */
function StatusText({ message }: { message: string }) {
  const lines = message.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return <span>{message}</span>;
  const hidden = lines.length - MAX_LISTED_ERRORS;
  return (
    <span className="sb-drop-errors">
      <span>Il file non è stato importato: contiene {lines.length} errori. Segnalali a chi te l&apos;ha dato.</span>
      <ul>
        {lines.slice(0, MAX_LISTED_ERRORS).map((line, i) => <li key={i}>{line}</li>)}
      </ul>
      {hidden > 0 && <span>…e altri {hidden}.</span>}
    </span>
  );
}

interface ImportDropzoneProps {
  state: DropState;
  /** Status sentence for busy, success and error. */
  message?: string | null;
  warnings?: string[];
  onFile: (file: File) => void;
}

/** The .ptsb import area of the library (antd Upload.Dragger, restyled). */
export function ImportDropzone({ state, message, warnings = [], onFile }: ImportDropzoneProps) {
  return (
    <div className="sb-drop-wrap">
      <Upload.Dragger
        className="sb-drop"
        accept=".ptsb"
        multiple={false}
        showUploadList={false}
        disabled={state === 'busy'}
        beforeUpload={(file) => {
          onFile(file);
          return false;
        }}
      >
        <span className="sb-drop-icon" aria-hidden>
          <FileArchive size={22} strokeWidth={1.75} />
        </span>
        <h3>{state === 'busy' ? 'Caricamento in corso…' : 'Scegli o trascina un file .ptsb'}</h3>
        <p>Il file resta nel tuo browser: non viene inviato a nessun server.</p>
      </Upload.Dragger>
      {message && state !== 'idle' && (
        <div className={`sb-drop-status sb-drop-status-${state}`} role={state === 'error' ? 'alert' : 'status'}>
          {state === 'error' ? <CircleAlert size={16} strokeWidth={1.75} aria-hidden /> : state === 'success' ? <CircleCheck size={16} strokeWidth={1.75} aria-hidden /> : null}
          <StatusText message={message} />
        </div>
      )}
      {warnings.length > 0 && (
        <div role="status" className="sb-drop-warnings">
          {warnings.map((warning, index) => <p key={index}>{warning}</p>)}
        </div>
      )}
    </div>
  );
}
