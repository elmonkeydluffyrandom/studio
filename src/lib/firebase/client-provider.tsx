'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/lib/firebase/provider';
import { initializeFirebase } from '@/lib/firebase';
import { firebaseConfig } from '@/firebase/config';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    // Initialize Firebase on the client side, once per component mount.
    if (!firebaseConfig?.projectId) {
      // This should now be caught by the explicit check in config.ts, but leaving as a safeguard.
      console.error("Firebase config is not available on the client. Check your NEXT_PUBLIC_FIREBASE_CONFIG environment variable.");
      return null;
    }
    return initializeFirebase();
  }, []); // Empty dependency array ensures this runs only once on mount

  if (!firebaseServices) {
    // You can render a loading state or null here
    return <div className="container mx-auto max-w-4xl text-center p-8">Cargando configuración de Firebase...</div>;
  }

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
