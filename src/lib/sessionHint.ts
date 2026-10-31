const KEY = "partytalk:signed-in";

/**
 * Whether someone has signed in on this device (and not signed out). Sign-in is
 * restored in the browser, a moment after the page loads; this lets the landing
 * show a spinner instead of flashing its pitch at someone about to be redirected.
 * A hint only: storage can be blocked, and a stale hint just means a short spinner.
 */
export function hadSessionHere(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberSession(signedIn: boolean): void {
  try {
    if (signedIn) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: no hint, so the landing may flash briefly */
  }
}
