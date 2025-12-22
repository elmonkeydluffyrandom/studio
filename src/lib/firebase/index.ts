import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';


// This function is NOT 'use client' and can be used on the server.
export function initializeFirebase() {
    const firebaseConfigStr = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;
    
    if (!firebaseConfigStr) {
        throw new Error("Firebase config not found in environment variables. Make sure NEXT_PUBLIC_FIREBASE_CONFIG is set.");
    }
    
    let firebaseConfig;
    try {
        firebaseConfig = JSON.parse(firebaseConfigStr);
    } catch (e) {
        console.error("Failed to parse firebaseConfig", e);
        throw new Error("Invalid Firebase config in environment variables.");
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
