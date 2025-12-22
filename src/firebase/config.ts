
let config;

try {
    config = JSON.parse(process.env.NEXT_PUBLIC_FIREBASE_CONFIG || '');
} catch (e) {
    console.error("Failed to parse firebaseConfig from environment variables.", e);
    throw new Error("Invalid Firebase config in environment variables. Please check your .env file and ensure NEXT_PUBLIC_FIREBASE_CONFIG is a valid JSON string.");
}

export const firebaseConfig = config;
