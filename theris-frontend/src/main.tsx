import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google';

// 🛑 COLE AQUI O SEU CLIENT ID DO GOOGLE CLOUD CONSOLE
// Exemplo: "123456789-abcdefg...apps.googleusercontent.com"
const GOOGLE_CLIENT_ID = "1029553168345-73cpprt1cgu0qmi119huuo6sjhhbk4sb.apps.googleusercontent.com"; 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* O Provider precisa envolver toda a aplicação */}
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>,
)