'use client';

import { useEffect, useState } from 'react';
import { FirebaseProvider } from './provider'; 
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  getFirestore,
  enableIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED
} from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';

let globalFirebase: any = null;

async function getFirebaseInstance() {
  if (globalFirebase) return globalFirebase;

  console.log("🚀 Inicializando Firebase...");
  
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  
  try {
    await setPersistence(auth, browserLocalPersistence);
    console.log("✅ Persistencia de Auth configurada");
  } catch (authError) {
    console.error("❌ Error en persistencia de Auth:", authError);
  }

  let firestore;
  let persistenceActive = false;

  try {
    console.log("🔄 Configurando Firestore offline...");
    
    firestore = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      })
    });
    
    persistenceActive = true;
    console.log("✅ Firestore offline configurado");
    
  } catch (e) {
    console.error("❌ Error cache avanzado:", e);
    
    firestore = getFirestore(app);
    
    try {
      await enableIndexedDbPersistence(firestore, { forceOwnership: true });
      persistenceActive = true;
      console.log("✅ Persistencia IndexedDB (fallback)");
    } catch (persistenceError: any) {
      if (persistenceError.code === 'failed-precondition') {
        console.warn("⚠️  Múltiples pestañas abiertas");
      } else if (persistenceError.code === 'unimplemented') {
        console.warn("⚠️  Navegador no soporta persistencia");
      }
    }
  }

  onAuthStateChanged(auth, async (user) => {
    if (user) {
      console.log("👤 Usuario:", user.email?.substring(0, 10) + "...", "UID:", user.uid.substring(0, 8) + "...");
      console.log("💾 Persistencia:", persistenceActive);
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
  const [firebase, setFirebase] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const instance = await getFirebaseInstance();
        setFirebase(instance);
      } catch (error) {
        console.error("💥 Error Firebase:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  if (loading || !firebase) {
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