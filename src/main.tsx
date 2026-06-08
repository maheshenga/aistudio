import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ThemeProvider.tsx';
import { UndoRedoProvider } from './context/UndoRedoContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <UndoRedoProvider>
        <App />
      </UndoRedoProvider>
    </ThemeProvider>
  </StrictMode>,
);
