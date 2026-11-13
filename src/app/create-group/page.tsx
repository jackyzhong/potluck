// src/app/create-group/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createLedger } from "./actions";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import Link from "next/link";

import { CURRENCY_LIST } from "@/src/lib/currencies";

// The emoji picker is third-party and can't read our tokens, so tell it which
// theme is showing: an explicit data-theme on <html> wins, otherwise the OS.
function currentPickerTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "dark") return Theme.DARK;
  if (attr === "light") return Theme.LIGHT;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? Theme.DARK
    : Theme.LIGHT;
}

export default function CreateGroup() {
  const [groupName, setGroupName] = useState("");
  const [emoji, setEmoji] = useState("🍲");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [pickerTheme, setPickerTheme] = useState<Theme>(Theme.LIGHT);
  
  // Currency States
  const [currency, setCurrency] = useState("CAD");
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [currencySearch, setCurrencySearch] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCurrencyOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Escape closes whichever popover is open.
  useEffect(() => {
    if (!isCurrencyOpen && !showEmojiPicker) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsCurrencyOpen(false);
      setShowEmojiPicker(false);
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isCurrencyOpen, showEmojiPicker]);

  const filteredCurrencies = CURRENCY_LIST.filter(c => 
    c.code.toLowerCase().includes(currencySearch.toLowerCase()) || 
    c.name.toLowerCase().includes(currencySearch.toLowerCase())
  );

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setIsLoading(true);

    const result = await createLedger({ title: groupName, emoji, baseCurrency: currency });

    if (!result.ok) {
      alert(result.error);
      setIsLoading(false);
      return;
    }

    router.push(`/ledger/${result.data.id}`);
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col p-6 relative selection:bg-button-primary-bg selection:text-button-primary-fg overflow-y-auto">
      {/* Top Navigation */}
      <nav className="max-w-2xl mx-auto w-full py-2 mb-4 shrink-0">
        <Link 
          href="/" 
          className="text-sm font-medium text-text-muted hover:text-text transition-colors flex items-center gap-2 w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
      </nav>

      <main className="max-w-md mx-auto w-full flex-1 flex flex-col pt-8 pb-20">
        {/* Main UI Card */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCreateGroup();
          }}
          className="bg-surface rounded-hero shadow-card p-8 flex flex-col items-center relative border border-line"
        >

          {/* Emoji Picker Button */}
          <button
            type="button"
            aria-label="Choose an emoji for this group"
            aria-expanded={showEmojiPicker}
            onClick={() => {
              if (!showEmojiPicker) setPickerTheme(currentPickerTheme());
              setShowEmojiPicker(!showEmojiPicker);
            }}
            className="text-6xl mb-6 hover:scale-105 transition-transform bg-surface-sunken p-6 rounded-full border border-line shadow-button"
          >
            {emoji}
          </button>
          
          {showEmojiPicker && (
            <div className="absolute top-0 z-20 mt-32 shadow-menu rounded-xl overflow-hidden">
              <EmojiPicker 
                onEmojiClick={(data: EmojiClickData) => {
                  setEmoji(data.emoji);
                  setShowEmojiPicker(false);
                }}
                theme={pickerTheme}
              />
            </div>
          )}

          <h1 className="text-2xl font-bold text-text mb-2 text-center">Name your Potluck</h1>
          <p className="text-text-muted mb-8 text-center">What are we splitting today?</p>

          <input
            type="text"
            placeholder="e.g. Toronto Trip 2026"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="text-text placeholder:text-text-muted w-full text-xl p-4 bg-surface-sunken border border-line-strong rounded-2xl focus:border-accent focus:ring-1 focus:ring-accent outline-none transition-all text-center mb-6"
            autoFocus
          />

          {/* Group Settings Section */}
          <div className="w-full mb-8">
            <h2 className="text-sm font-semibold text-text mb-3 uppercase tracking-wider">Group Settings</h2>
            
            {/* Currency Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <label className="block text-sm text-text-muted mb-1">Base Currency</label>
              <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={isCurrencyOpen}
                onClick={() => setIsCurrencyOpen(!isCurrencyOpen)}
                className="w-full flex items-center justify-between p-4 bg-surface-sunken border border-line-strong rounded-xl hover:bg-surface-muted transition-colors"
              >
                <span className="font-medium text-text">{currency}</span>
                <svg className="w-4 h-4 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {isCurrencyOpen && (
                <div className="absolute top-full left-0 w-full mt-2 bg-surface border border-line-strong rounded-xl shadow-menu z-10 overflow-hidden">
                  <div className="p-2 border-b border-line">
                    <input
                      type="text"
                      placeholder="Search currency..."
                      value={currencySearch}
                      onChange={(e) => setCurrencySearch(e.target.value)}
                      className="w-full p-2 bg-surface-sunken text-text placeholder:text-text-muted rounded-lg outline-none focus:ring-1 focus:ring-accent text-sm"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {filteredCurrencies.map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => {
                          setCurrency(c.code);
                          setIsCurrencyOpen(false);
                          setCurrencySearch("");
                        }}
                        className="w-full flex items-center justify-between p-3 hover:bg-surface-sunken text-left transition-colors"
                      >
                        <span className="font-medium text-text">{c.code}</span>
                        <span className="text-sm text-text-muted">{c.name}</span>
                      </button>
                    ))}
                    {filteredCurrencies.length === 0 && (
                      <div className="p-3 text-sm text-text-muted text-center">No currencies found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Future settings can be added here, and the container will scroll */}
          </div>

          <button
            type="submit"
            disabled={!groupName.trim() || isLoading}
            className={`w-full py-4 rounded-full font-medium text-lg transition-all flex items-center justify-center gap-2
              ${groupName.trim() 
                ? "bg-button-primary-bg text-button-primary-fg shadow-button hover:opacity-90 active:scale-95" 
                : "bg-button-disabled-bg text-button-disabled-fg cursor-not-allowed"}
            `}
          >
            {isLoading ? "Creating..." : "Continue"}
            {!isLoading && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>

        </form>
      </main>
    </div>
  );
}