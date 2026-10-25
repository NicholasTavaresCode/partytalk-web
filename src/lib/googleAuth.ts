"use client";

import { env, googleConfigured } from "./env";

/**
 * Google Identity Services (GIS) auth.
 *
 * The PartyTalk API verifies a raw **Google Identity ID token** on every request
 * (security scheme `google`: a bearer JWT whose `sub` becomes the user's uid). So
 * the frontend talks to GIS directly — no Firebase in between. GIS hands us that
 * ID token via the "Sign in with Google" credential callback; we attach it as
 * `Authorization: Bearer <id_token>` on REST calls and in the Socket.IO handshake.
 */

/** The signed-in user, derived from the verified claims of the Google ID token. */
export interface AuthUser {
  /** Google account subject (`sub`) — the stable primary key the API keys off. */
  uid: string;
  email: string;
  displayName: string;
  picture?: string;
}

interface GoogleIdClaims {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  exp: number; // seconds since epoch
}

/* --------------------------- JWT decode (client) -------------------------- */

/** Decode a JWT payload without verifying it — the API does the verification. */
function decodeClaims(token: string): GoogleIdClaims | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    return JSON.parse(json) as GoogleIdClaims;
  } catch {
    return null;
  }
}

function toUser(claims: GoogleIdClaims): AuthUser {
  return {
    uid: claims.sub,
    email: claims.email ?? "",
    displayName: claims.name ?? "",
    picture: claims.picture,
  };
}

/**
 * The stand-in user when `NEXT_PUBLIC_DISABLE_AUTH=true`: decoded from the dev
 * bearer token if it's a JWT, otherwise a placeholder so the UI renders.
 */
export function getDevUser(): AuthUser {
  const claims = env.devBearerToken ? decodeClaims(env.devBearerToken) : null;
  return claims?.sub
    ? toUser(claims)
    : { uid: "dev-user", email: "dev@localhost", displayName: "Dev" };
}

/* ------------------------------ Token state ------------------------------- */

let currentToken: string | null = null;
let currentExpMs = 0;

type Listener = (user: AuthUser | null) => void;
const listeners = new Set<Listener>();

/** Subscribe to sign-in / sign-out. Returns an unsubscribe fn. */
export function onAuthChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setToken(token: string | null) {
  const claims = token ? decodeClaims(token) : null;
  if (token && !claims?.sub) return; // ignore anything that isn't a usable ID token
  currentToken = token;
  currentExpMs = claims ? claims.exp * 1000 : 0;
  const user = claims ? toUser(claims) : null;
  listeners.forEach((l) => l(user));
}

/* --------------------------- GIS script + init --------------------------- */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadGis(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("GIS unavailable on the server"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (!googleConfigured) {
    throw new Error("Google sign-in is not configured — set NEXT_PUBLIC_GOOGLE_CLIENT_ID");
  }
  await loadGis();
  if (initialized) return;
  window.google.accounts.id.initialize({
    client_id: env.googleClientId,
    callback: (resp: { credential?: string }) => {
      if (resp.credential) setToken(resp.credential);
    },
    auto_select: true,
    use_fedcm_for_prompt: true,
    itp_support: true,
  });
  initialized = true;
}

/* ------------------------------ Public API -------------------------------- */

/**
 * Silently restore a returning user's session (One Tap with `auto_select`).
 * Resolves once initialized; the credential — if any — arrives via the callback.
 */
export async function restoreSession(): Promise<void> {
  await ensureInitialized();
  window.google.accounts.id.prompt();
}

/** Render the official "Sign in with Google" button into `el`. */
export async function renderSignInButton(
  el: HTMLElement,
  options: Record<string, unknown> = {},
): Promise<void> {
  await ensureInitialized();
  window.google.accounts.id.renderButton(el, {
    type: "standard",
    theme: "outline",
    size: "large",
    text: "continue_with",
    shape: "rectangular",
    logo_alignment: "center",
    ...options,
  });
}

/** Imperative fallback sign-in (One Tap prompt). Prefer the rendered button. */
export async function promptSignIn(): Promise<void> {
  await ensureInitialized();
  window.google.accounts.id.prompt();
}

export async function signOut(): Promise<void> {
  setToken(null);
  if (initialized) window.google?.accounts?.id?.disableAutoSelect();
}

/**
 * The API rejected `rejectedToken` (401). If it's still the current token, drop it so
 * `useAuth()` reports signed-out and RequireAuth shows the sign-in screen, instead of
 * the app failing call after call. Unlike signOut(), auto-select stays on, so signing
 * back in is one click. A 401 for an older token (a refresh already replaced it) is
 * ignored; auth-bypass mode has no session to drop.
 */
export function expireSession(rejectedToken: string): void {
  if (env.authDisabled || !currentToken || currentToken !== rejectedToken) return;
  setToken(null);
}

const EXPIRY_SKEW_MS = 60_000;
let refreshPromise: Promise<void> | null = null;

/** Ask GIS to silently re-issue a credential (works for a still-signed-in user). */
function refresh(): Promise<void> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    await ensureInitialized();
    await new Promise<void>((resolve) => {
      const unsub = onAuthChange(() => finish());
      const timer = setTimeout(finish, 4000);
      function finish() {
        clearTimeout(timer);
        unsub();
        resolve();
      }
      window.google.accounts.id.prompt();
    });
  })().finally(() => {
    refreshPromise = null;
  });
  return refreshPromise;
}

/**
 * A currently-valid Google ID token, or null. Silently re-issues when the token
 * is missing or near expiry; on failure the (stale) token surfaces a 401, which
 * apiClient turns back into the sign-in screen via expireSession().
 */
export async function getIdToken(): Promise<string | null> {
  // Auth-bypass mode: attach the dev token (if any), never touch GIS.
  if (env.authDisabled) return env.devBearerToken || null;
  if (currentToken && Date.now() < currentExpMs - EXPIRY_SKEW_MS) return currentToken;
  await refresh().catch(() => {});
  return currentToken;
}
