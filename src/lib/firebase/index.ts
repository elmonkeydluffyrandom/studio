import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';

// This function can be used on both server and client.
export function initializeFirebase() {
    if (!firebaseConfig?.projectId) {
        throw new Error('"projectId" not provided in firebase.initializeApp. Check your NEXT_PUBLIC_FIREBASE_CONFIG environment variable.');
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
