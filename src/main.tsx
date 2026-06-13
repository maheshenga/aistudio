import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ThemeProvider } from './components/ThemeProvider.tsx';
import { UndoRedoProvider } from './context/UndoRedoContext';
import { AgentRuntimeContextProvider } from './runtime/AgentRuntimeContext.tsx';
import { AuthGate, SaasAuthProvider } from './saas/SaasAuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SaasAuthProvider>
      <AuthGate>
        <ThemeProvider>
          <UndoRedoProvider>
            <AgentRuntimeContextProvider>
              <App />
            </AgentRuntimeContextProvider>
          </UndoRedoProvider>
        </ThemeProvider>
      </AuthGate>
    </SaasAuthProvider>
  </StrictMode>,
);
