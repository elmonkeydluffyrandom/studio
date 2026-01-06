'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => {
            console.log('✅ Service Worker registrado:', registration.scope);
            
            // Forzar actualización
            registration.update();
          })
          .catch((error) => {
            console.log('❌ Error SW:', error);
          });
      });
    }
  }, []);

  return null;
}