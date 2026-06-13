/// <reference types="vite/client" />
import { initializeApp } from 'firebase/app';
import { getApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseEnv = (import.meta.env ?? {}) as Partial<ImportMetaEnv>;

const firebaseConfig = {
  apiKey: firebaseEnv.VITE_FIREBASE_API_KEY,
  authDomain: firebaseEnv.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: firebaseEnv.VITE_FIREBASE_DATABASE_URL,
  projectId: firebaseEnv.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseEnv.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseEnv.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseEnv.VITE_FIREBASE_APP_ID
};

export const initFirebaseDb = () => {
  if (!firebaseConfig.apiKey) return null;
  try {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    return getDatabase(app);
  } catch (error) {
    console.error("Firebase initialization error:", error);
    return null;
  }
};
