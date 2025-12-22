'use client';

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const firebaseConfigStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
  if (!firebaseConfigStr) {
    throw new Error("Firebase config not found in environment variables. Make sure NEXT_PUBLIC_FIREBASE_CONFIG is set.");
  }
  const firebaseConfig = JSON.parse(firebaseConfigStr);

  if (getApps().length) {
    const app = getApp();
    return getSdks(app);
  } 

  const app = initializeApp(firebaseConfig);
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  const firestore = getFirestore(firebaseApp);
  const auth = getAuth(firebaseApp);

  if (process.env.NEXT_PUBLIC_USE_EMULATORS) {
      console.log('Using Firebase Emulators');
      connectFirestoreEmulator(firestore, 'localhost', 8080);
      connectAuthEmulator(auth, 'http://localhost:9099');
  }

  return {
    firebaseApp,
    auth,
    firestore,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export { useUser } from './auth/use-user';
export * from './errors';
export * from './error-emitter';
export { setDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from './non-blocking-updates';
export { useMemoFirebase } from './provider';