import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  type Auth,
} from "firebase/auth";
import { env, firebaseConfigured } from "./env";

let app: FirebaseApp | undefined;
let authInstance: Auth | undefined;

/** Lazily initialize Firebase. Returns null until the web config is filled in. */
export function getFirebaseAuth(): Auth | null {
  if (!firebaseConfigured) return null;
  if (!app) app = getApps().length ? getApp() : initializeApp(env.firebase);
  if (!authInstance) authInstance = getAuth(app);
  return authInstance;
}

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<void> {
  const auth = getFirebaseAuth();
  if (!auth) throw new Error("Firebase is not configured — fill in .env.local");
  await signInWithPopup(auth, googleProvider);
}

export async function signOut(): Promise<void> {
  const auth = getFirebaseAuth();
  if (auth) await firebaseSignOut(auth);
}

/** A fresh Firebase ID token for the current user (auto-refreshes), or null. */
export async function getIdToken(): Promise<string | null> {
  const user = getFirebaseAuth()?.currentUser;
  return user ? user.getIdToken() : null;
}
