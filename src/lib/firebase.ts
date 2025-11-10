import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth, signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';

// Firebase config from environment or hardcoded fallback (provided in instructions)
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'AIzaSyBTPgm0b6KNLupz5B0ycXdSFb9xsvOrNkI',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'lyricai-1a1d7.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'lyricai-1a1d7',
  // Firebase Storage bucket must be appspot.com, not firebasestorage.app
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'lyricai-1a1d7.appspot.com',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '426144794591',
  appId: process.env.FIREBASE_APP_ID || '1:426144794591:web:98106c11912fbc6b0f266a',
  // Disable analytics in development to avoid GA network errors
  // measurementId: process.env.FIREBASE_MEASUREMENT_ID || 'G-2R3RHJN83H',
};

const app = initializeApp(firebaseConfig);

// Analytics disabled in dev; enable explicitly in production if needed.

// Force long polling to avoid preview aborted channel errors in some networks
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
});
export const storage = getStorage(app);
export const auth = getAuth(app);

export async function ensureAnonymousAuth() {
  try {
    if (!auth.currentUser) {
      await signInAnonymously(auth);
    }
  } catch (e) {
    // Non-fatal; continue without auth
    console.warn('Anonymous auth failed:', e);
  }
}

export async function ensureAuthWithEmailPassword(email: string, password: string) {
  try {
    if (!auth.currentUser) {
      await signInWithEmailAndPassword(auth, email, password);
    }
  } catch (e) {
    console.warn('Email/password auth failed, falling back to anonymous:', e);
    try {
      await signInAnonymously(auth);
    } catch (anonErr) {
      console.error('Anonymous fallback auth failed:', anonErr);
    }
  }
}
export default app;