"use client";

import { useEffect, useRef, useState } from "react";
import { useUsers } from "@/hooks/useUsers";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import type { User } from "@/types";

interface Props {
  onSubmit: (body: string, mentionUserIds: number[]) => Promise<void> | void;
  submitting?: boolean;
  placeholder?: string;
}

// MentionToken — a single user resolved from the body. Tracked separately so
// renaming the same user multiple times still produces one id.
type MentionToken = { id: number; name: string };

export function CommentBox({
  onSubmit,
  submitting,
  placeholder = "Add a comment…",
}: Props) {
  const [body, setBody] = useState("");
  const [mentions, setMentions] = useState<MentionToken[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: users = [] } = useUsers();
  const candidates = users
    .filter((u) =>
      u.name.toLowerCase().includes(pickerQuery.toLowerCase()),
    )
    .slice(0, 6);

  useEffect(() => {
    if (highlight >= candidates.length) setHighlight(0);
  }, [candidates.length, highlight]);

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    setBody(v);

    // Detect @trigger before the caret.
    const caret = e.target.selectionStart ?? v.length;
    const upto = v.slice(0, caret);
    const m = /(?:^|\s)@([\w\s]*)$/.exec(upto);
    if (m) {
      setPickerOpen(true);
      setPickerQuery(m[1] ?? "");
    } else {
      setPickerOpen(false);
    }
  }

  function insertMention(u: User) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const caret = textarea.selectionStart ?? body.length;
    const before = body.slice(0, caret);
    const after = body.slice(caret);
    // Replace the @<query> token with @Name plus trailing space.
    const replaced = before.replace(/(^|\s)@([\w\s]*)$/, `$1@${u.name} `);
    const newBody = replaced + after;
    setBody(newBody);
    setMentions((prev) =>
      prev.some((m) => m.id === u.id) ? prev : [...prev, { id: u.id, name: u.name }],
    );
    setPickerOpen(false);
    setPickerQuery("");
    // Restore focus + caret position.
    requestAnimationFrame(() => {
      const pos = replaced.length;
      textarea.focus();
      textarea.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!pickerOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, candidates.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && candidates[highlight]) {
      e.preventDefault();
      insertMention(candidates[highlight]);
    } else if (e.key === "Escape") {
      setPickerOpen(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    // Only include mentions still present in the final body.
    const active = mentions
      .filter((m) => body.includes(`@${m.name}`))
      .map((m) => m.id);
    await onSubmit(body, active);
    setBody("");
    setMentions([]);
  }

  return (
    <form onSubmit={submit} className="relative">
      <div className="relative">
        <textarea
          ref={textareaRef}
          rows={2}
          placeholder={placeholder}
          className="input resize-none w-full"
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
        <p className="text-[10px] text-muted mt-1">
          Gõ <span className="kbd">@</span> để mention người dùng
        </p>
        {pickerOpen && candidates.length > 0 && (
          <div className="absolute left-0 bottom-full mb-2 surface-elevated w-64 max-h-48 overflow-auto z-50 animate-slide-down">
            {candidates.map((u, i) => (
              <button
                key={u.id}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(u);
                }}
                onMouseEnter={() => setHighlight(i)}
                className={`w-full text-left flex items-center gap-2 px-3 py-1.5 text-sm transition ${
                  i === highlight
                    ? "bg-brand-soft text-brand-strong"
                    : "hover:bg-surface-2"
                }`}
              >
                <Avatar name={u.name} size="sm" />
                <span className="truncate">{u.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end mt-2">
        <Button
          type="submit"
          size="sm"
          variant="gradient"
          disabled={submitting || !body.trim()}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m22 2-7 20-4-9-9-4Z" />
            <path d="M22 2 11 13" />
          </svg>
          Send
        </Button>
      </div>
    </form>
  );
}
