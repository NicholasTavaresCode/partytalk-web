const EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/** Mirrors the API's cap on a room's invite list. */
export const MAX_INVITES = 50;

/**
 * Split pasted text (commas, semicolons, spaces or newlines) into lowercased,
 * deduplicated emails, plus the entries that don't look like one. The API
 * re-validates; this is just to catch typos before submitting.
 */
export function parseEmails(text: string): { emails: string[]; invalid: string[] } {
  const parts = text
    .split(/[\s,;]+/)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return {
    emails: [...new Set(parts.filter((p) => EMAIL.test(p)))],
    invalid: parts.filter((p) => !EMAIL.test(p)),
  };
}

/** The shareable link that lets a signed-in person redeem the room's invite code. */
export function inviteLink(roomId: string, code: string): string {
  return `${window.location.origin}/practice/${roomId}?invite=${encodeURIComponent(code)}`;
}
