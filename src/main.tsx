import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App' // Importa seu App.tsx
import './index.css' // Importa estilos globais se tiver, senão remova esta linha
import { initApiClient } from './lib/api'

// Configuração do Google OAuth (Substitua pelo seu Client ID se tiver, ou deixe vazio por enquanto)
import { GoogleOAuthProvider } from '@react-oauth/google';

initApiClient();

const clientId = "1029553168345-73cpprt1cgu0qmi119huuo6sjhhbk4sb.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={clientId}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)