/**
 * Public runtime config. `NEXT_PUBLIC_*` vars are inlined at build time, so these
 * reads are safe on both server and client.
 */
export const env = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3000/api/v1",
  socketUrl: process.env.NEXT_PUBLIC_API_SOCKET_URL ?? "http://localhost:3000",
  /** OAuth 2.0 Web client ID for "Sign in with Google" (Google Cloud console). */
  googleClientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  /**
   * Dev-only escape hatch: skip the Google sign-in gate so the app renders and
   * fires API calls without going through GIS. Set `NEXT_PUBLIC_DISABLE_AUTH=true`.
   */
  authDisabled: process.env.NEXT_PUBLIC_DISABLE_AUTH === "true",
  /**
   * Dev-only: a Google ID token attached as `Authorization: Bearer` when auth is
   * disabled, so protected endpoints can be tested (paste one from Swagger's
   * "Authorize" dialog). Optional — without it, requests go out unauthenticated.
   */
  devBearerToken: process.env.NEXT_PUBLIC_DEV_BEARER_TOKEN ?? "",
  /**
   * Send `webrtc:*` signaling over the rooms socket. Off by default until the
   * backend ships the relay (milestone M1): emitting events the server doesn't
   * handle can get the socket dropped. The mic is still acquired for metering.
   */
  voiceMeshEnabled: process.env.NEXT_PUBLIC_VOICE_MESH === "true",
};

/** True once the Google OAuth web client ID is filled in (see .env.local.example). */
export const googleConfigured = Boolean(env.googleClientId);
