import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { runCleanup } from '@/storage/cleanup'
import './index.css'
import App from './App.tsx'

void runCleanup()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
