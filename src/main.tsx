import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/theme.css';
import './styles/typography.css';
import './styles/math.css';
import './styles/code.css';
import './styles/table.css';
import './styles/editor.css';
import './styles/blocks.css';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
