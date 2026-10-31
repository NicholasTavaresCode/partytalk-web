"use client";

import { useEffect, useRef, useState } from "react";
import { Mail, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { MAX_INVITES, parseEmails } from "@/lib/invites";

/**
 * State for an EmailListInput, owned by the form so it can `flush()` on submit.
 * `selfEmail` is the signed-in user's address: hosts are always in, so it's never added.
 * `max` is how many the list may hold (a room's free spots); addresses beyond it
 * stay in the field with an error, so nothing is dropped silently.
 */
export function useEmailList(selfEmail?: string, max: number = MAX_INVITES) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [emails, setEmails] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  /** Text in the field that isn't an email — the form must not submit until it's fixed. */
  const [error, setError] = useState<string | null>(null);
  /** Informational only (the host's own address, a repeat). */
  const [notice, setNotice] = useState<string | null>(null);
  /** The row to highlight briefly: just added, or already on the list. `at` re-triggers a repeat. */
  const [flash, setFlash] = useState<{ email: string; at: number } | null>(null);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1200);
    return () => clearTimeout(t);
  }, [flash]);

  /**
   * Adds every valid address in `text` and leaves anything else in the field
   * with an error. Returns the resulting list, or null if invalid text is left.
   */
  const commit = (text: string): string[] | null => {
    const { emails: found, invalid } = parseEmails(text);
    const self = selfEmail?.toLowerCase();
    const fresh = found.filter((e) => e !== self && !emails.includes(e));
    const repeat = found.find((e) => emails.includes(e));
    const free = Math.max(0, max - emails.length);
    const added = fresh.slice(0, free);
    const overflow = fresh.slice(free);
    const next = [...emails, ...added];
    setEmails(next);
    setDraft([...overflow, ...invalid].join(", "));
    setError(
      invalid.length
        ? `Not a valid email: ${invalid.join(", ")}`
        : overflow.length
          ? `No spot left for ${overflow.join(", ")}. You take one seat: pick more people or remove someone.`
          : null,
    );
    setNotice(
      self && found.includes(self)
          ? "That's you. The host is always in."
          : repeat && !added.length
            ? `${repeat} is already on the list.`
            : null,
    );
    const highlight = added[added.length - 1] ?? repeat;
    if (highlight) setFlash({ email: highlight, at: Date.now() });
    return invalid.length || overflow.length ? null : next;
  };

  return {
    inputRef,
    emails,
    draft,
    error,
    notice,
    flash: flash?.email ?? null,
    commit,
    edit: (text: string) => {
      setDraft(text);
      setError(null); // judged again on Enter or submit
      setNotice(null);
    },
    remove: (email: string) => setEmails((list) => list.filter((e) => e !== email)),
    clear: () => {
      setEmails([]);
      setNotice(null);
    },
    /**
     * For the form's submit: the list including an address still typed in the
     * field (no Enter needed), or null — with the error shown and the field
     * focused — if that text isn't an email.
     */
    flush: (): string[] | null => {
      if (!draft.trim()) return emails;
      const next = commit(draft);
      if (!next) inputRef.current?.focus();
      return next;
    },
  };
}

/**
 * Builds a list of emails one row at a time: type an address and press Enter,
 * a comma or a space (or click Add) to add it; each row has an X to remove it.
 * Pasting a list ("a@x.com, b@y.com") adds every address at once, and Backspace
 * in the empty field removes the newest row. Rows show newest first, so the one
 * just added sits right under the field. Enter never submits the surrounding form.
 *
 * Deliberately no add-on-blur: adding a row on blur shifts the layout between
 * mousedown and mouseup on the submit button, which swallows the click. The form
 * calls `flush()` on submit instead, so a typed-but-not-entered address is kept.
 */
export function EmailListInput({ list, id }: { list: ReturnType<typeof useEmailList>; id?: string }) {
  const { inputRef, emails, draft, error, notice, flash, commit, edit, remove } = list;
  const listRef = useRef<HTMLUListElement>(null);

  // A repeat can be far down the list: bring the highlighted row into view.
  useEffect(() => {
    if (!flash) return;
    listRef.current
      ?.querySelector(`[data-email="${CSS.escape(flash)}"]`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [flash]);

  const add = () => {
    if (draft.trim()) commit(draft);
    inputRef.current?.focus();
  };

  return (
    <div>
      <div
        className={cn(
          "mt-1.5 flex h-11 items-center gap-2 rounded-lg border pl-3 pr-1.5 transition-colors",
          error ? "border-error" : "border-outline-variant focus-within:border-primary",
        )}
      >
        <Mail className="h-4 w-4 shrink-0 text-on-surface-variant" aria-hidden />
        <input
          ref={inputRef}
          id={id}
          value={draft}
          onChange={(e) => {
            const text = e.target.value;
            // A separator after an address adds it, so "ana@x.com," works like Enter.
            if (/[\s,;]$/.test(text) && text.trim()) commit(text);
            else edit(text);
          }}
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
          enterKeyHint="enter"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={emails.length ? "Add another email" : "name@example.com"}
          aria-invalid={error ? true : undefined}
          aria-describedby={id ? `${id}-hint` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-on-surface-variant/60"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="h-8 shrink-0 rounded-md bg-primary px-3 text-xs font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:bg-surface-container disabled:text-on-surface-variant disabled:opacity-100"
        >
          Add
        </button>
      </div>
      <p id={id ? `${id}-hint` : undefined} className="mt-1 text-xs text-on-surface-variant" aria-live="polite">
        {error ? (
          <span className="font-medium text-error">{error}</span>
        ) : (
          (notice ?? "Press Enter or a comma to add. Paste a list to add many at once.")
        )}
      </p>

      {emails.length > 0 ? (
        // Phones scroll the whole form; a nested scroll area there is fiddly.
        <ul ref={listRef} className="mt-2 space-y-1.5 sm:max-h-52 sm:overflow-y-auto sm:pr-1">
          {[...emails].reverse().map((email) => (
            <li
              key={email}
              data-email={email}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border py-1.5 pl-1.5 pr-1 text-sm text-on-surface transition-colors duration-500",
                flash === email
                  ? "border-primary/50 bg-primary-fixed/50"
                  : "border-outline-variant bg-surface-container-low",
              )}
            >
              <span
                aria-hidden
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary-fixed text-xs font-bold uppercase text-on-primary-fixed"
              >
                {email[0]}
              </span>
              <span className="min-w-0 flex-1 truncate">{email}</span>
              <button
                type="button"
                onClick={() => {
                  remove(email);
                  inputRef.current?.focus();
                }}
                aria-label={`Remove ${email}`}
                title="Remove"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container hover:text-error"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 rounded-lg border border-dashed border-outline-variant px-3 py-2.5 text-xs text-on-surface-variant">
          No one yet. Until you add someone, only you can open this room. You can also invite people
          or share a link from inside the room later.
        </p>
      )}
    </div>
  );
}
