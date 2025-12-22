import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import getConfig from 'next/config';

// This function is NOT 'use client' and can be used on the server.
export function initializeFirebase() {
    const { publicRuntimeConfig } = getConfig();
    const firebaseConfigStr = publicRuntimeConfig?.firebaseConfig;
    
    if (!firebaseConfigStr) {
        throw new Error("Firebase config not found in Next.js public runtime configuration. Make sure it's set in next.config.ts.");
    }
    
    let firebaseConfig;
    try {
        // The config is already an object, no need to parse
        firebaseConfig = firebaseConfigStr;
    } catch (e) {
        console.error("Failed to process firebaseConfig", e);
        throw new Error("Invalid Firebase config in runtime configuration.");
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
