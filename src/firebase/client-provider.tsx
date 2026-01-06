'use client';

import { useEffect, useState } from 'react';
import { FirebaseProvider } from './provider'; 
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

interface FirebaseServices {
  firebaseApp: FirebaseApp;
  firestore: any; // Mantener como 'any' para flexibilidad con versiones de Firestore
  auth: Auth;
  areServicesAvailable: boolean;
  persistenceActive: boolean;
}

let globalFirebase: FirebaseServices | null = null;

async function getFirebaseInstance(): Promise<FirebaseServices> {
  if (globalFirebase) return globalFirebase;

  console.log("🚀 Inicializando Firebase...");
  
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  let persistenceActive = false;

  try {
    // 1. Configurar persistencia de autenticación
    await setPersistence(auth, browserLocalPersistence);
    console.log("✅ Persistencia de Auth configurada");
  } catch (authError) {
    console.error("❌ Error en persistencia de Auth:", authError);
  }

  try {
    // 2. Habilitar persistencia de Firestore
    await enableIndexedDbPersistence(firestore);
    persistenceActive = true;
    console.log("✅ Persistencia de Firestore habilitada.");
  } catch (persistenceError: any) {
    if (persistenceError.code === 'failed-precondition') {
      console.warn("⚠️ Persistencia de Firestore falló: múltiples pestañas abiertas. Los datos pueden no sincronizarse correctamente entre pestañas.");
      persistenceActive = true; // La persistencia aún puede funcionar en esta pestaña.
    } else if (persistenceError.code === 'unimplemented') {
      console.warn("⚠️ El navegador actual no soporta la persistencia de Firestore. La aplicación no funcionará offline.");
    } else {
      console.error("❌ Error desconocido al habilitar la persistencia de Firestore:", persistenceError);
    }
  }

  // 3. Monitorear cambios de autenticación
  onAuthStateChanged(auth, (user) => {
    if (user) {
      console.log(`👤 Usuario autenticado: ${user.email || 'Anónimo'}`);
      console.log(`💾 Estado de persistencia: ${persistenceActive ? 'Activa' : 'Inactiva'}`);
    } else {
      console.log("👤 No hay usuario autenticado.");
    }
  });

  globalFirebase = {
    firebaseApp: app,
    firestore,
    auth,
    areServicesAvailable: true,
    persistenceActive
  };

  return globalFirebase;
}

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  const [firebase, setFirebase] = useState<FirebaseServices | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const instance = await getFirebaseInstance();
        setFirebase(instance);
      } catch (error) {
        console.error("💥 Error fatal al inicializar Firebase:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300 text-center">Configurando almacenamiento offline...</p>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 text-center">
          Tu diario funciona sin internet
        </p>
      </div>
    );
  }
  
  if (!firebase?.areServicesAvailable) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/50 p-4">
        <p className="text-red-700 dark:text-red-300 text-center font-bold">Error Crítico</p>
        <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center">
          No se pudieron cargar los servicios de Firebase. Revisa la consola para más detalles.
        </p>
      </div>
     );
  }

  return (
    <FirebaseProvider 
      firebaseApp={firebase.firebaseApp}
      firestore={firebase.firestore}
      auth={firebase.auth}
    >
      {children}
    </FirebaseProvider>
  );
}
