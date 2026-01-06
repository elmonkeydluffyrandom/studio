// public/sw.js - REEMPLAZA TODO EL CONTENIDO
const CACHE_NAME = 'journal-app-v1';
const OFFLINE_PAGE = '/offline.html';

// Recursos críticos para cachear
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/favicon.ico'
];

// ========== INSTALACIÓN ==========
self.addEventListener('install', (event) => {
  console.log('🛠️ Service Worker instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache abierto, agregando recursos críticos...');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Todos los recursos cacheados');
        return self.skipWaiting(); // Activar inmediatamente
      })
      .catch((error) => {
        console.error('❌ Error en instalación:', error);
      })
  );
});

// ========== ACTIVACIÓN ==========
self.addEventListener('activate', (event) => {
  console.log('🎯 Service Worker activado');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log(`🗑️ Eliminando cache viejo: ${cacheName}`);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('🔄 Reclamando clientes...');
        return self.clients.claim();
      })
  );
});

// ========== ESTRATEGIA DE CACHE ==========
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // 1. NO cachear peticiones a Firebase/APIs
  if (url.href.includes('firestore.googleapis.com') ||
      url.href.includes('firebase') ||
      url.pathname.includes('/api/') ||
      url.pathname.includes('_next/data')) {
    console.log('🌐 API request, pasando a red:', url.pathname);
    return;
  }
  
  // 2. Estrategia para PÁGINAS (HTML) - Network First
  if (event.request.mode === 'navigate' || 
      event.request.destination === 'document') {
    console.log('📄 Página HTML solicitada:', url.pathname);
    
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Guardar en cache para futuro offline
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
              console.log('💾 Página guardada en cache:', url.pathname);
            });
          return response;
        })
        .catch((error) => {
          console.log('📴 Offline, sirviendo desde cache:', url.pathname);
          return caches.match(event.request)
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Página offline personalizada
              return caches.match(OFFLINE_PAGE)
                .then((offlinePage) => {
                  return offlinePage || new Response(
                    `<h1>Estás offline</h1><p>Tu diario funciona localmente.</p>`,
                    { headers: { 'Content-Type': 'text/html' } }
                  );
                });
            });
        })
    );
    return;
  }
  
  // 3. Estrategia para ASSETS (CSS, JS, imágenes) - Cache First
  if (event.request.destination === 'style' ||
      event.request.destination === 'script' ||
      event.request.destination === 'image' ||
      url.pathname.includes('_next/static')) {
    
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            console.log('⚡ Desde cache:', url.pathname);
            return cachedResponse;
          }
          
          // No está en cache, ir a red
          console.log('🌐 Fetch desde red:', url.pathname);
          return fetch(event.request)
            .then((response) => {
              // Verificar respuesta válida
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              // Guardar en cache para futuro
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                  console.log('💾 Asset guardado en cache:', url.pathname);
                });
              
              return response;
            })
            .catch(() => {
              console.log('❌ Error fetch, no hay respuesta offline');
              return new Response('', { status: 404 });
            });
        })
    );
    return;
  }
  
  // 4. Para otros recursos, intentar red primero
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

// ========== SINCRONIZACIÓN ==========
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-journal-entries') {
    console.log('🔄 Background sync: Sincronizando entradas...');
    event.waitUntil(syncPendingEntries());
  }
});

async function syncPendingEntries() {
  try {
    // Aquí va la lógica para sincronizar con Firebase
    console.log('🔄 Intentando sincronizar datos pendientes...');
    
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_STARTED',
        timestamp: new Date().toISOString()
      });
    });
    
  } catch (error) {
    console.error('❌ Error en sync:', error);
  }
}

// ========== MENSAJES ==========
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('✅ Service Worker cargado y listo');