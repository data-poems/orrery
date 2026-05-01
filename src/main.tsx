import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OBSERVATORY_MODE } from './lib/mode'

if (OBSERVATORY_MODE) {
  document.title = 'Observatory';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
