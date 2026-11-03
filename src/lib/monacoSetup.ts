import { loader } from '@monaco-editor/react';
// The editor core and its features, without the bundled language services; the lab only needs Python highlighting.
import 'monaco-editor/features/register.all.js';
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/languages/definitions/python/register.js';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';

// Without this, @monaco-editor/react downloads Monaco from cdn.jsdelivr.net,
// which the CSP blocks and which breaks the lab offline.
self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
