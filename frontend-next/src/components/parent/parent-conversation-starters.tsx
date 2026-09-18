"use client";

import { useState } from "react";
import { Copy, Check, Bookmark, Coffee, Moon, BookOpen, MessageSquare, RefreshCw, Sparkles, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ConversationPrompt {
  id: string;
  theme: string;
  context: string;
  avoid_saying: string;
  try_saying: string;
  psychologist_note: string;
}

interface ParentConversationStartersProps {
  prompts: ConversationPrompt[];
  childName: string;
}

export function ParentConversationStarters({ prompts, childName }: ParentConversationStartersProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [promptList, setPromptList] = useState<ConversationPrompt[]>(prompts);

  const firstName = childName.split(" ")[0] || "Your child";

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSave = (id: string) => {
    setSavedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleShuffle = () => {
    setPromptList([...promptList].sort(() => Math.random() - 0.5));
  };

  // Get strictly relevant icon based on real scenario
  const getScenarioIcon = (theme: string) => {
    const lower = theme.toLowerCase();
    if (lower.includes("tuition") || lower.includes("study") || lower.includes("chai")) {
      return <Coffee className="h-4 w-4 text-amber-500" />;
    }
    if (lower.includes("phone") || lower.includes("screen") || lower.includes("night") || lower.includes("bed")) {
      return <Moon className="h-4 w-4 text-indigo-500" />;
    }
    return <BookOpen className="h-4 w-4 text-sky-500" />;
  };

  return (
    <div className="clay-card p-6 sm:p-8 relative overflow-hidden transition-all">
      {/* Top liquid specular line */}
      <div className="absolute top-0 left-6 right-6 h-[1px] bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-border/40">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              DAILY CHAT STARTERS (WITHOUT LECTURING)
            </span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">
              Parent Guide
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
            How to Talk to {firstName} Today
          </h2>
          <p className="text-xs text-muted-foreground">
            Simple, warm questions that get children to open up happily instead of getting defensive.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleShuffle}
          className="text-xs gap-1.5 h-8 neo-well hover:bg-muted/40 font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Shuffle Ideas</span>
        </Button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-6">
        {promptList.map((prompt) => {
          const isCopied = copiedId === prompt.id;
          const isSaved = !!savedIds[prompt.id];

          return (
            <div
              key={prompt.id}
              className="p-5 rounded-2xl bg-card border border-border/70 shadow-xs flex flex-col justify-between space-y-4 hover:border-sky-500/40 transition-all group"
            >
              {/* Card Header & Theme */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-secondary/80 neo-well">
                      {getScenarioIcon(prompt.theme)}
                    </div>
                    <span className="text-xs font-bold text-foreground font-sans">
                      {prompt.theme}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleSave(prompt.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      isSaved
                        ? "text-amber-500 bg-amber-500/10"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    }`}
                    title={isSaved ? "Saved for tonight" : "Bookmark for tonight"}
                  >
                    <Bookmark className="h-3.5 w-3.5" fill={isSaved ? "currentColor" : "none"} />
                  </button>
                </div>

                {/* Context */}
                <p className="text-[11px] text-muted-foreground font-sans leading-relaxed">
                  {prompt.context}
                </p>

                {/* Avoid vs Try */}
                <div className="space-y-2.5 pt-1">
                  {/* Avoid Box */}
                  <div className="p-3 rounded-xl neo-well text-[11px] border border-destructive/20">
                    <span className="text-[10px] font-mono font-bold text-destructive uppercase tracking-wider block mb-1">
                      ✕ Avoid saying in anger/habit:
                    </span>
                    <p className="text-muted-foreground line-through decoration-destructive/50 italic leading-snug">
                      &ldquo;{prompt.avoid_saying}&rdquo;
                    </p>
                  </div>

                  {/* Say Box */}
                  <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/30 text-xs shadow-2xs">
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                      ✦ Try saying warmly instead:
                    </span>
                    <p className="text-foreground font-semibold leading-relaxed">
                      &ldquo;{prompt.try_saying}&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Practical Rationale & Action */}
              <div className="pt-2 border-t border-border/40 space-y-2.5">
                <p className="text-[11px] text-muted-foreground leading-relaxed flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                    <Lightbulb className="h-3 w-3" />
                  </span>
                  <strong className="text-foreground/90 font-medium">Why this works: </strong>
                  <span>{prompt.psychologist_note}</span>
                </p>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleCopy(prompt.id, prompt.try_saying)}
                  className="w-full h-8 text-[11px] font-mono text-muted-foreground hover:text-foreground justify-center gap-1.5 rounded-xl border border-transparent hover:border-border/60"
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Question</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
