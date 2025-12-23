'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { enableIndexedDbPersistence } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    return initializeFirebase();
  }, []);

  useEffect(() => {
    if (firebaseServices.firestore) {
      enableIndexedDbPersistence(firebaseServices.firestore)
        .catch((err) => {
          if (err.code == 'failed-precondition') {
              console.log("Persistencia falló: Múltiples pestañas abiertas.");
          } else if (err.code == 'unimplemented') {
              console.log("El navegador no soporta persistencia.");
          }
        });
    }
  }, [firebaseServices.firestore]);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
