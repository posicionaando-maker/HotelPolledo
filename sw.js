// ============================================================
// SERVICE WORKER PARA PWA HOTEL SEMÁFORO
// ============================================================
// Función: Permite que la app se instale en el teléfono
// y funcione COMPLETAMENTE SIN INTERNET (offline total)
// ============================================================

// Nombre de la caché (cambiar si se actualiza la app)
const CACHE_NAME = 'hotel-semaforo-v1';

// Lista de archivos que se guardan en caché para usar offline
const ARCHIVOS_A_CACHEAR = [
  './',                      // La raíz (index.html implícito)
  './index.html',            // El archivo principal
  // No necesita CSS/JS externos porque todo está dentro del index.html
  // Si tuvieras imágenes o fuentes externas, las agregarías acá
];

// ============================================================
// PASO 1: Instalación del Service Worker
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando...');
  
  // Esperar hasta que termine de cachear todos los archivos
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Cacheando archivos esenciales');
      return cache.addAll(ARCHIVOS_A_CACHEAR);
    })
  );
  
  // Forzar que el nuevo SW tome control inmediatamente
  self.skipWaiting();
});

// ============================================================
// PASO 2: Activación (limpiar cachés viejas)
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Borrar cachés anteriores que no sean la actual
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Eliminando caché vieja:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Tomar control de todas las pestañas abiertas
  return self.clients.claim();
});

// ============================================================
// PASO 3: Interceptar peticiones (estrategia: cache first)
// ============================================================
// Estrategia: Primero busca en caché, si no existe, va a la red
// Esto permite que funcione OFFLINE TOTAL
// ============================================================
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Solo cachear peticiones del mismo origen (no APIs externas)
  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(event.request).then((respuestaCache) => {
        // Si está en caché, lo devuelve (OFFLINE!)
        if (respuestaCache) {
          console.log('[SW] Sirviendo desde CACHÉ:', url.pathname);
          return respuestaCache;
        }
        
        // Si no está en caché, va a la red y cachea la respuesta para la próxima
        console.log('[SW] Buscando en RED:', url.pathname);
        return fetch(event.request).then((respuestaRed) => {
          // Clonar la respuesta porque solo se puede usar una vez
          const respuestaClon = respuestaRed.clone();
          
          caches.open(CACHE_NAME).then((cache) => {
            // Guardar en caché la nueva respuesta
            cache.put(event.request, respuestaClon);
          });
          
          return respuestaRed;
        }).catch((error) => {
          // Si no hay internet y no está en caché, mostrar página de error personalizada
          console.error('[SW] Error de red y sin caché:', error);
          return caches.match('./index.html'); // Fallback al index
        });
      })
    );
  } else {
    // Peticiones a otros dominios (ej: APIs externas) se dejan pasar normalmente
    // En un entorno real, aquí podrías cachear también si es necesario
    return;
  }
});