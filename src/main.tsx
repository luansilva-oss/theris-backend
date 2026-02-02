import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App' // Importa seu App.tsx
import './index.css' // Importa estilos globais se tiver, senão remova esta linha

// Configuração do Google OAuth (Substitua pelo seu Client ID se tiver, ou deixe vazio por enquanto)
import { GoogleOAuthProvider } from '@react-oauth/google';

const clientId = "SEU_CLIENT_ID_DO_GOOGLE";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)