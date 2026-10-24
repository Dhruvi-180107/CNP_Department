
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './app.css';
import './ui.css';
import './components/ui/vis.css';
import './components/ui/chrome.css';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
