import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import WorkspaceHistory from './components/WorkspaceHistory';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <WorkspaceHistory/>
  </StrictMode>,
);
