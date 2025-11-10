if (typeof globalThis.global === 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).global = globalThis;
}

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App.js';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

