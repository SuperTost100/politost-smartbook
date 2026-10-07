import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../design-system/tokens/tokens.css';
import { defaultReaderConfig, platformReaderConfig, setReaderConfig } from './config/readerConfig';
import { registerServiceWorker } from './lib/registerServiceWorker';
import { App } from './App';
import 'katex/dist/katex.min.css';
import './styles/global.css';
import './styles/ds.css';
import './styles/print.css';

setReaderConfig(import.meta.env.VITE_PLATFORM_ENABLED === 'true' ? platformReaderConfig : defaultReaderConfig);
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
