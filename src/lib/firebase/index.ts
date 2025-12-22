import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// This function is NOT 'use client' and can be used on the server.
export function initializeFirebase() {
    if (!firebaseConfig) {
        throw new Error("Firebase config not found. Make sure it is set up in src/firebase/config.ts");
    }

    if (!firebaseConfig.projectId) {
        throw new Error('"projectId" not provided in firebase.initializeApp.');
    }

    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const firestore = getFirestore(app);
    const auth = getAuth(app);

    return {
        firebaseApp: app,
        auth,
        firestore,
    };
}
