import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/theme.css';
import './styles/notebook.css';
import './styles/protection-page.css';
import './styles/setup-pages.css';
import './styles/quiet-pages.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
