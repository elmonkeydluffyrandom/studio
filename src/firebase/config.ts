
const firebaseConfigString = process.env.NEXT_PUBLIC_FIREBASE_CONFIG;

if (!firebaseConfigString) {
    throw new Error("Missing Firebase config. Please provide NEXT_PUBLIC_FIREBASE_CONFIG environment variable.");
}

let config;

try {
    config = JSON.parse(firebaseConfigString);
} catch (e) {
    console.error("Failed to parse NEXT_PUBLIC_FIREBASE_CONFIG.", e);
    throw new Error("Invalid JSON in NEXT_PUBLIC_FIREBASE_CONFIG environment variable.");
}

export const firebaseConfig = config;
