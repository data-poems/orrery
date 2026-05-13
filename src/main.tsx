import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OBSERVATORY_MODE } from './lib/mode'

declare global {
  interface Window {
    /** Set at startup — type this in Safari Web Inspector to verify the bundle age. */
    __ORRERY_BUILD_STAMP__?: string;
  }
}

window.__ORRERY_BUILD_STAMP__ = __ORRERY_BUILD_STAMP__;
if (import.meta.env.DEV) {
  console.info('[Orrery] bundle stamp', __ORRERY_BUILD_STAMP__);
}

if (OBSERVATORY_MODE) {
  document.title = 'Observatory';
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if (import.meta.env.VITE_CAPACITOR === 'true') {
  void import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) => {
      void StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
      void StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    })
    .catch(() => {});

  window.setTimeout(() => {
    void import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 250 }))
      .catch(() => {});
  }, 250);
}
