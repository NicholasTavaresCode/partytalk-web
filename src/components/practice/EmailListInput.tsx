"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { MAX_INVITES, parseEmails } from "@/lib/invites";

/**
 * State for an EmailListInput, owned by the form so it can `flush()` on submit.
 * `selfEmail` is the signed-in user's address: hosts are always in, so it's never added.
 */
export function useEmailList(selfEmail?: string) {
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  /** Text in the field that isn't an email — the form must not submit until it's fixed. */
  const [error, setError] = useState<string | null>(null);
  /** Informational only (the invite cap, or the host's own address). */
  const [notice, setNotice] = useState<string | null>(null);

  /**
   * Adds every valid address in `text` and leaves anything else in the field
   * with an error. Returns the resulting list, or null if invalid text is left.
   */
  const commit = (text: string): string[] | null => {
    const { emails: found, invalid } = parseEmails(text);
    const self = selfEmail?.toLowerCase();
    const fresh = found.filter((e) => e !== self && !emails.includes(e));
    const next = [...emails, ...fresh.slice(0, Math.max(0, MAX_INVITES - emails.length))];
    setEmails(next);
    setDraft(invalid.join(", "));
    setError(invalid.length ? `Not a valid email: ${invalid.join(", ")}` : null);
    setNotice(
      next.length - emails.length < fresh.length
        ? `A room can have up to ${MAX_INVITES} invites.`
        : self && found.includes(self)
          ? "That's you — the host is always in."
          : null,
    );
    return invalid.length ? null : next;
  };

  return {
    emails,
    draft,
    error,
    notice,
    commit,
    edit: (text: string) => {
      setDraft(text);
      setError(null); // judged again on Enter or submit
      setNotice(null);
    },
    remove: (email: string) => setEmails((list) => list.filter((e) => e !== email)),
    /**
     * For the form's submit: the list including an address still typed in the
     * field (no Enter needed), or null — with the error shown — if that text
     * isn't an email.
     */
    flush: (): string[] | null => (draft.trim() ? commit(draft) : emails),
  };
}

/**
 * Builds a list of emails one row at a time: type an address and press Enter to
 * add it; each row has an X to remove it. Pasting a list ("a@x.com, b@y.com")
 * adds every address at once, and Backspace in the empty field removes the last
 * row. Enter never submits the surrounding form.
 *
 * Deliberately no add-on-blur: adding a row on blur shifts the layout between
 * mousedown and mouseup on the submit button, which swallows the click. The form
 * calls `flush()` on submit instead, so a typed-but-not-entered address is kept.
 */
export function EmailListInput({ list }: { list: ReturnType<typeof useEmailList> }) {
  const { emails, draft, error, notice, commit, edit, remove } = list;

  return (
    <div>
      <input
        value={draft}
        onChange={(e) => edit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault(); // add the address; never submit the form from here
            if (draft.trim()) commit(draft);
          } else if (e.key === "Backspace" && !draft && emails.length) {
            remove(emails[emails.length - 1]);
          }
        }}
        onPaste={(e) => {
          const text = e.clipboardData.getData("text");
          if (/[\s,;]/.test(text.trim())) {
            e.preventDefault();
            commit(`${draft} ${text}`);
          }
        }}
        type="text"
        inputMode="email"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        placeholder={emails.length ? "Add another email" : "name@example.com"}
        aria-label="Email to invite"
        aria-invalid={error ? true : undefined}
        className="mt-1.5 h-11 w-full rounded-lg border border-outline-variant px-3 text-sm outline-none focus:border-primary aria-[invalid=true]:border-error"
      />
      <p className="mt-1 text-xs text-on-surface-variant" aria-live="polite">
        {error ? <span className="font-medium text-error">{error}</span> : (notice ?? "Press Enter to add each email.")}
      </p>

      {emails.length > 0 && (
        <ul className="mt-2 max-h-40 space-y-1.5 overflow-y-auto pr-1">
          {emails.map((email) => (
            <li
              key={email}
              className="flex items-center justify-between gap-2 rounded-lg border border-outline-variant bg-surface-container-low py-1.5 pl-3 pr-1.5 text-sm text-on-surface"
            >
              <span className="truncate">{email}</span>
              <button
                type="button"
                onClick={() => remove(email)}
                aria-label={`Remove ${email}`}
                title="Remove"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
