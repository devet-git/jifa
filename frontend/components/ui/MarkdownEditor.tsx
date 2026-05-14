"use client";

import { useState } from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  autoFocus?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  rows = 6,
  placeholder = "Write in Markdown…",
  autoFocus,
}: Props) {
  const [tab, setTab] = useState<"write" | "preview">("write");

  return (
    <div className="border border-border rounded-lg overflow-hidden focus-within:border-brand focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--brand)_18%,transparent)] transition">
      {/* Tab bar */}
      <div className="flex border-b border-border bg-surface-2/60 px-1 pt-1 gap-0.5">
        <TabBtn active={tab === "write"} onClick={() => setTab("write")}>Write</TabBtn>
        <TabBtn active={tab === "preview"} onClick={() => setTab("preview")}>Preview</TabBtn>
        <div className="flex-1" />
        <span className="text-[10px] text-muted self-center pr-2 italic">Markdown · ![alt](url) for images</span>
      </div>

      {tab === "write" ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full bg-surface px-3 py-2.5 text-sm font-mono resize-y focus:outline-none"
        />
      ) : (
        <div className="min-h-[80px] px-3 py-2.5 bg-surface">
          {value.trim() ? (
            <MarkdownBody content={value} />
          ) : (
            <p className="text-sm text-muted italic">Nothing to preview.</p>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-t-md font-medium transition ${
        active
          ? "bg-surface text-foreground border border-b-0 border-border"
          : "text-muted hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

export function MarkdownBody({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.startsWith("### ")) {
      nodes.push(<h3 key={i} className="text-sm font-semibold mt-4 mb-1">{inlineText(line.slice(4))}</h3>);
    } else if (line.startsWith("## ")) {
      nodes.push(<h2 key={i} className="text-base font-semibold mt-5 mb-1">{inlineText(line.slice(3))}</h2>);
    } else if (line.startsWith("# ")) {
      nodes.push(<h1 key={i} className="text-lg font-bold mt-5 mb-2">{inlineText(line.slice(2))}</h1>);
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        items.push(<li key={i}>{inlineText(lines[i].slice(2))}</li>);
        i++;
      }
      nodes.push(<ul key={`ul-${i}`} className="list-disc pl-5 my-1.5 space-y-0.5 text-sm">{items}</ul>);
      continue;
    } else if (/^\d+\. /.test(line)) {
      const items: React.ReactNode[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(<li key={i}>{inlineText(lines[i].replace(/^\d+\. /, ""))}</li>);
        i++;
      }
      nodes.push(<ol key={`ol-${i}`} className="list-decimal pl-5 my-1.5 space-y-0.5 text-sm">{items}</ol>);
      continue;
    } else if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <pre key={i} className="bg-surface-2 border border-border rounded-lg p-3 overflow-x-auto my-2 text-xs font-mono">
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
    } else if (line.startsWith("> ")) {
      nodes.push(
        <blockquote key={i} className="border-l-4 border-brand/40 pl-3 py-0.5 my-1.5 text-sm text-muted italic">
          {inlineText(line.slice(2))}
        </blockquote>
      );
    } else if (/^!\[.*?\]\(.*?\)$/.test(line.trim())) {
      const m = line.trim().match(/^!\[(.*?)\]\((.*?)\)$/);
      if (m) {
        nodes.push(
          <div key={i} className="my-2">
            <img
              src={m[2]}
              alt={m[1]}
              className="max-w-full rounded-lg border border-border shadow-sm"
              loading="lazy"
            />
            {m[1] && <p className="text-xs text-muted mt-1 italic text-center">{m[1]}</p>}
          </div>
        );
      }
    } else if (line === "" || line === "---") {
      nodes.push(<div key={i} className="my-1.5" />);
    } else {
      nodes.push(<p key={i} className="text-sm leading-relaxed my-1">{inlineText(line)}</p>);
    }
    i++;
  }

  return <div className="text-foreground space-y-0">{nodes}</div>;
}

function inlineText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*|!\[.*?\]\(.*?\)|\[.*?\]\(.*?\))/g);
  return parts.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    }
    if (p.startsWith("`") && p.endsWith("`")) {
      return (
        <code key={i} className="font-mono text-xs bg-surface-2 border border-border px-1 py-0.5 rounded">
          {p.slice(1, -1)}
        </code>
      );
    }
    if (p.startsWith("*") && p.endsWith("*")) {
      return <em key={i}>{p.slice(1, -1)}</em>;
    }
    const imgMatch = p.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imgMatch) {
      return (
        <img
          key={i}
          src={imgMatch[2]}
          alt={imgMatch[1]}
          className="inline max-h-32 rounded border border-border mx-0.5 align-middle"
          loading="lazy"
        />
      );
    }
    const linkMatch = p.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a key={i} href={linkMatch[2]} target="_blank" rel="noopener noreferrer" className="text-brand underline hover:opacity-80">
          {linkMatch[1]}
        </a>
      );
    }
    return p;
  });
}
