"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import EmojiPicker, { Theme, type EmojiClickData } from "emoji-picker-react";
import { Avatar } from "@/src/components/glow/Avatar";
import { Button } from "@/src/components/glow/Button";
import { PILL_OPTION_CLASS, PillPopover } from "@/src/components/glow/PillPopover";
import { CheckIcon, ChevronLeftIcon } from "@/src/components/glow/icons";
import { useDismiss } from "@/src/components/glow/useDismiss";
import { CURRENCIES, CURRENCY_LIST } from "@/src/lib/currencies";
import type { AvatarSlot } from "@/src/lib/glow/avatar";
import { browserStorage, recordVisitedGroup, writeStoredViewer } from "@/src/lib/glow/viewer";
import { LIMITS } from "@/src/lib/validation";
import { createLedger } from "./actions";

function currentPickerTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return Theme.DARK;
  if (attr === "light") return Theme.LIGHT;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? Theme.DARK : Theme.LIGHT;
}

const WHAT_HAPPENS_NEXT = [
  {
    step: 1,
    title: "You get a link",
    body: "The group opens straight away at its own address."
  },
  {
    step: 2,
    title: "Share it with the group",
    body: "Anyone with the link can see the group and add expenses."
  },
  {
    step: 3,
    title: "Keep the link",
    body: "There are no accounts, so the link is the only way back in. Bookmark it."
  }
] as const;

export default function CreateGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState("");
  const [emoji, setEmoji] = useState("🍲");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTheme, setPickerTheme] = useState<Theme>(Theme.LIGHT);
  const [currency, setCurrency] = useState("CAD");
  const [members, setMembers] = useState<string[]>([]);
  const [draftMember, setDraftMember] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [memberError, setMemberError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emojiWrapRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const memberInputRef = useRef<HTMLInputElement>(null);

  useDismiss(
    showEmojiPicker,
    () => {
      setShowEmojiPicker(false);
      emojiButtonRef.current?.focus();
    },
    [emojiWrapRef]
  );

  // Sync focus when redirected back cleanly via keyboard shortcut
  useEffect(() => {
    nameInputRef.current?.focus();
  }, []);

  const selectedCurrency = CURRENCIES[currency] ?? CURRENCIES.CAD;

  function addMemberName(raw: string): string[] | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.length > LIMITS.memberName) {
      setMemberError(`Names can be up to ${LIMITS.memberName} characters.`);
      return null;
    }
    if (members.some((m) => m.toLowerCase() === trimmed.toLowerCase())) {
      setMemberError(`${trimmed} is already in this group.`);
      return null;
    }
    const next = [...members, trimmed];
    setMembers(next);
    setDraftMember("");
    setMemberError(null);
    setError(null);
    return next;
  }

  function handleAddMember() {
    if (!draftMember.trim()) {
      setMemberError("Enter a person's name to add them.");
      memberInputRef.current?.focus();
      return;
    }
    addMemberName(draftMember);
    memberInputRef.current?.focus();
  }

  function removeMemberAt(index: number) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
    setMemberError(null);
    setError(null);
  }

  async function submitForm() {
    if (isSubmitting) return;
    const title = groupName.trim();
    if (!title) {
      setError("Give your group a name first.");
      nameInputRef.current?.focus();
      return;
    }

    let finalMembers = members;
    if (draftMember.trim()) {
      const added = addMemberName(draftMember);
      if (!added) {
        memberInputRef.current?.focus();
        return;
      }
      finalMembers = added;
    }

    if (finalMembers.length === 0) {
      setError("Add at least one person to the group.");
      memberInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const result = await createLedger({
        title,
        emoji,
        baseCurrency: currency,
        members: finalMembers
      });
      if (!result.ok) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }
      const storage = browserStorage();
      writeStoredViewer(storage, result.data.id, result.data.creatorUserId);
      recordVisitedGroup(storage, result.data.id);
      router.push(`/ledger/${result.data.id}`);
    } catch {
      setError("Something went wrong creating your group. Please try again.");
      setIsSubmitting(false);
    }
  }

  function onFormKeyDown(e: KeyboardEvent<HTMLFormElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void submitForm();
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-[length:var(--text-body)] leading-[1.4] text-text">
      <header className="flex items-center justify-between gap-4 px-6 py-4 max-sm:justify-start max-sm:gap-1 max-sm:py-3 max-sm:pl-1 max-sm:pr-3">
        <Link
          href="/"
          aria-label="Back to home"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-text no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:hidden"
        >
          <ChevronLeftIcon size={22} />
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2.5 text-text no-underline focus-visible:rounded-pill focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span aria-hidden="true" className="text-[28px] leading-none">
            🍲
          </span>
          <span className="text-[20px] font-extrabold tracking-[-0.01em]">Potluck</span>
        </Link>
        <Link
          href="/"
          className="inline-flex h-11 items-center justify-center rounded-pill bg-button-secondary-bg px-4 font-bold text-text no-underline shadow-button focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent max-sm:hidden"
        >
          Back to home
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-[1040px] flex-wrap items-start gap-4 px-4 pb-4 pt-1 sm:px-6 sm:pb-8 sm:pt-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submitForm();
          }}
          onKeyDown={onFormKeyDown}
          className="flex min-w-0 flex-[2_1_480px] flex-col gap-3.5 rounded-card bg-surface px-4 py-3.5 shadow-card sm:rounded-hero sm:p-5"
        >
          <div className="flex flex-col gap-0.5">
            <h1 className="m-0 text-[length:var(--text-page-title-phone)] font-extrabold tracking-[-0.01em] sm:text-[length:var(--text-page-title)] sm:tracking-[-0.02em]">
              Create a group
            </h1>
            <span className="text-[length:var(--text-meta)] text-text-muted">
              It takes a few seconds and needs no account.
            </span>
          </div>

          <div
            ref={emojiWrapRef}
            className="relative flex items-end gap-3 rounded-card p-4 text-on-glow [background:var(--gradient-glow-compact)] sm:[background:var(--gradient-glow)]"
          >
            <button
              ref={emojiButtonRef}
              type="button"
              aria-label={`Group emoji: ${emoji}. Change`}
              aria-expanded={showEmojiPicker}
              onClick={() => {
                if (!showEmojiPicker) setPickerTheme(currentPickerTheme());
                setShowEmojiPicker((open) => !open);
              }}
              className="flex size-16 shrink-0 cursor-pointer items-center justify-center rounded-chip border-0 bg-on-glow-tile text-[32px] leading-none transition-transform duration-[var(--dur-fast)] hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-glow"
            >
              {emoji}
            </button>

            {showEmojiPicker ? (
              <div className="absolute left-4 top-[84px] z-30 overflow-hidden rounded-card shadow-menu">
                <EmojiPicker
                  onEmojiClick={(data: EmojiClickData) => {
                    setEmoji(data.emoji);
                    setShowEmojiPicker(false);
                    emojiButtonRef.current?.focus();
                  }}
                  theme={pickerTheme}
                />
              </div>
            ) : null}

            <label className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="flex justify-between text-[length:var(--text-meta)] font-semibold">
                <span>Group name</span>
                <span className="tabular-nums">{groupName.length}/{LIMITS.title}</span>
              </span>
              <input
                ref={nameInputRef}
                type="text"
                maxLength={LIMITS.title}
                placeholder="Cabin Trip"
                value={groupName}
                onChange={(e) => {
                  setGroupName(e.target.value);
                  if (error) setError(null);
                }}
                className="h-11 w-full rounded-md border-0 bg-transparent p-0 text-[32px] font-extrabold tracking-[-0.02em] text-on-glow outline-0 placeholder:text-on-glow/60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-on-glow"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-semibold">
            <span>Track balances in</span>
            <PillPopover
              trigger={currency}
              triggerClassName="h-11 gap-1.5 rounded-pill bg-surface-muted-2 px-3.5 text-text"
              ariaLabel={`Base currency: ${selectedCurrency.name}`}
              menuLabel="Choose currency"
              menuRole="listbox"
            >
              {(close) =>
                CURRENCY_LIST.map((c) => {
                  const selected = c.code === currency;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      role="option"
                      data-nav="1"
                      aria-selected={selected}
                      onClick={() => {
                        setCurrency(c.code);
                        close();
                      }}
                      className={PILL_OPTION_CLASS}
                    >
                      <span className="w-10 font-extrabold">{c.code}</span>
                      <span className="grow text-[length:var(--text-meta)] font-normal text-text-muted">
                        {c.name}
                      </span>
                      {selected ? <CheckIcon size={16} className="shrink-0 text-positive" /> : null}
                    </button>
                  );
                })
              }
            </PillPopover>
            <span className="text-[length:var(--text-meta)] font-normal text-text-muted">
              {selectedCurrency.name}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[length:var(--text-small)] font-bold uppercase tracking-[var(--tracking-label)] text-text-muted">
                Who&apos;s in it
              </span>
              <span className="text-[length:var(--text-meta)] text-text-muted tabular-nums">
                {members.length} {members.length === 1 ? "person" : "people"}
              </span>
            </div>

            {members.length > 0 ? (
              <div className="flex flex-col">
                {members.map((memberName, index) => (
                  <div
                    key={`${memberName}-${index}`}
                    className="flex min-h-12 items-center gap-2.5 border-t border-line first:border-t-0"
                  >
                    <Avatar name={memberName} slot={((index % 6) + 1) as AvatarSlot} size={32} />
                    <span className="min-w-0 grow truncate font-semibold">
                      {memberName}
                      {index === 0 ? (
                        <span className="ml-1.5 rounded-[10px] bg-positive-tag-bg px-2 py-0.5 text-[length:var(--text-small)] font-semibold text-positive-tag-fg">
                          You
                        </span>
                      ) : null}
                    </span>
                    <button
                      type="button"
                      aria-label={`Remove ${memberName}`}
                      onClick={() => removeMemberAt(index)}
                      className="inline-flex h-11 cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent px-1 text-[length:var(--text-meta)] font-bold text-negative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="flex gap-2">
              <input
                ref={memberInputRef}
                type="text"
                aria-label="Add a person by name"
                maxLength={LIMITS.memberName}
                value={draftMember}
                placeholder="Add a name"
                onChange={(e) => {
                  setDraftMember(e.target.value);
                  if (memberError) setMemberError(null);
                  if (error) setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                className="h-11 min-w-0 flex-1 rounded-input border-0 bg-surface-sunken px-3 font-bold text-text outline-0 placeholder:font-normal placeholder:text-text-muted focus-visible:outline-2 focus-visible:outline-accent"
              />
              <Button type="button" variant="soft" inPanel size={44} onClick={handleAddMember}>
                Add
              </Button>
            </div>

            {memberError ? (
              <p role="alert" className="m-0 text-[length:var(--text-meta)] font-semibold text-negative">
                {memberError}
              </p>
            ) : null}

            <span className="text-[length:var(--text-meta)] text-text-muted">
              Names are enough. Nobody needs an account, and you can add or rename people later.
            </span>
          </div>

          {error ? (
            <p role="alert" className="m-0 text-[length:var(--text-meta)] font-semibold text-negative">
              {error}
            </p>
          ) : null}

          <div className="hidden flex-wrap gap-2 sm:flex">
            <Button
              type="button"
              variant="soft"
              inPanel
              size={48}
              className="flex-[1_1_150px]"
              onClick={() => router.push("/")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size={48}
              kbd="⌘↵"
              disabled={isSubmitting}
              className="flex-[1_1_150px]"
            >
              {isSubmitting ? "Creating…" : "Create group"}
            </Button>
          </div>
        </form>

        <aside className="hidden min-w-0 flex-[1_1_300px] flex-col gap-1.5 rounded-hero bg-surface p-5 shadow-card sm:flex">
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-[17px] font-extrabold">What happens next</h2>
            <span className="text-[length:var(--text-meta)] text-text-muted">Three things to know</span>
          </div>
          <div className="flex flex-col">
            {WHAT_HAPPENS_NEXT.map((item) => (
              <div
                key={item.step}
                className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 border-t border-line py-3 first:border-t-0"
              >
                <span
                  aria-hidden="true"
                  className="text-[17px] font-extrabold tabular-nums text-positive"
                >
                  {item.step}
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-bold">{item.title}</span>
                  <span className="text-[length:var(--text-meta)] text-text-muted">{item.body}</span>
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <div className="mt-auto flex px-4 pb-5 pt-3 sm:hidden">
        <Button
          type="button"
          size={52}
          disabled={isSubmitting}
          onClick={() => void submitForm()}
          className="flex-1 text-[16px]"
        >
          {isSubmitting ? "Creating…" : "Create group"}
        </Button>
      </div>
    </div>
  );
}
