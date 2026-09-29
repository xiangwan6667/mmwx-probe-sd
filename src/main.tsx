import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { applyAppearance } from './use-probe'
import './styles.css'
import './touch-controls.css'

applyAppearance()
createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)
