import { loader } from '@monaco-editor/react';
// The editor core without the bundled language services; the lab only needs Python highlighting.
import * as monaco from 'monaco-editor/esm/vs/editor/edcore.main.js';
import 'monaco-editor/esm/vs/basic-languages/python/python.contribution.js';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker.js?worker';

// Without this, @monaco-editor/react downloads Monaco from cdn.jsdelivr.net,
// which the CSP blocks and which breaks the lab offline.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
