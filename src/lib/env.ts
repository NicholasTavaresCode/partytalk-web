/**
 * Public runtime config. `NEXT_PUBLIC_*` vars are inlined at build time, so these
 * reads are safe on both server and client.
 */
export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1",
  socketUrl: process.env.NEXT_PUBLIC_API_SOCKET_URL ?? "http://localhost:3000",
  firebase: {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  },
};

/** True once the Firebase web keys are filled in (see .env.local.example). */
export const firebaseConfigured = Boolean(
  env.firebase.apiKey && env.firebase.appId && env.firebase.projectId,
);
