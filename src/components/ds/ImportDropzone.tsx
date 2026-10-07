import { Upload } from 'antd';
import { CircleAlert, CircleCheck, FileArchive } from 'lucide-react';

export type DropState = 'idle' | 'busy' | 'success' | 'error';

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
        <p className={`sb-drop-status sb-drop-status-${state}`} role={state === 'error' ? 'alert' : 'status'}>
          {state === 'error' ? <CircleAlert size={16} strokeWidth={1.75} aria-hidden /> : state === 'success' ? <CircleCheck size={16} strokeWidth={1.75} aria-hidden /> : null}
          {message}
        </p>
      )}
      {warnings.length > 0 && (
        <div role="status" className="sb-drop-warnings">
          {warnings.map((warning, index) => <p key={index}>{warning}</p>)}
        </div>
      )}
    </div>
  );
}
