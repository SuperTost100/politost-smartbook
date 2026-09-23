import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { platformReaderConfig, setReaderConfig } from './config/readerConfig';
import { registerServiceWorker } from './lib/registerServiceWorker';
import { App } from './App';
import 'katex/dist/katex.min.css';
import './styles/global.css';
import './styles/print.css';

setReaderConfig(platformReaderConfig);
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
