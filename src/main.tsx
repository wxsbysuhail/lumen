import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Register Service Worker for offline capabilities
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Lumen SW registered successfully:', registration);
        
        // Force check for service worker updates on load
        registration.update();

        // Periodically check for updates every 60 seconds
        setInterval(() => {
          registration.update().catch(err => console.log('SW update check failed:', err));
        }, 60000);
      })
      .catch((error) => {
        console.error('Lumen SW registration failed:', error);
      });
  });

  // Detect when a new service worker takes over and automatically refresh the page
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
