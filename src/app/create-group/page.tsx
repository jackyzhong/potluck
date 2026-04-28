// app/create-group/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase"; // Adjust this path if your supabase.ts is elsewhere
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import Link from "next/link";

export default function CreateGroup() {
  const [groupName, setGroupName] = useState("");
  const [emoji, setEmoji] = useState("🍲");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return;
    setIsLoading(true);

    const { data, error } = await supabase
      .from("ledgers")
      .insert([
        { 
          title: groupName, 
          emoji: emoji 
        }
      ])
      .select()
      .single();

    if (error) {
      console.error("Error creating group:", error);
      alert("Failed to create group. Please try again.");
      setIsLoading(false);
      return;
    }

    router.push(`/ledger/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col p-6 relative selection:bg-zinc-900 selection:text-white">
      {/* Top Navigation */}
      <nav className="max-w-2xl mx-auto w-full py-2 mb-4">
        <Link 
          href="/" 
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors flex items-center gap-2 w-fit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
      </nav>

      <main className="max-w-md mx-auto w-full flex-1 flex flex-col justify-center pb-20">
        {/* Main UI Card */}
        <div className="bg-white rounded-3xl shadow-sm p-8 flex flex-col items-center text-center relative border border-zinc-100">
          
          {/* Emoji Picker Button */}
          <button 
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-6xl mb-6 hover:scale-105 transition-transform bg-zinc-50 p-6 rounded-full border border-zinc-100 shadow-sm"
          >
            {emoji}
          </button>
          
          {showEmojiPicker && (
            <div className="absolute top-0 z-20 mt-32 shadow-2xl rounded-xl overflow-hidden">
              <EmojiPicker 
                onEmojiClick={(data: EmojiClickData) => {
                  setEmoji(data.emoji);
                  setShowEmojiPicker(false);
                }}
                theme={Theme.LIGHT}
              />
            </div>
          )}

          <h1 className="text-2xl font-bold text-zinc-900 mb-2">Name your Potluck</h1>
          <p className="text-zinc-500 mb-8">What are we splitting today?</p>

          <input
            type="text"
            placeholder="e.g. Japan Trip 2026"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full text-xl p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 outline-none transition-all text-center mb-6"
            autoFocus
          />

          <button
            onClick={handleCreateGroup}
            disabled={!groupName.trim() || isLoading}
            className={`w-full py-4 rounded-full font-medium text-lg transition-all flex items-center justify-center gap-2
              ${groupName.trim() 
                ? "bg-zinc-900 text-white shadow-xl shadow-zinc-200 hover:bg-zinc-800 active:scale-95" 
                : "bg-zinc-100 text-zinc-400 cursor-not-allowed"}
            `}
          >
            {isLoading ? "Creating..." : "Continue"}
            {!isLoading && (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            )}
          </button>

        </div>
      </main>
    </div>
  );
}