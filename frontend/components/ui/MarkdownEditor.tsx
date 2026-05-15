"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import { mdToHtml, htmlToMd } from "@/lib/convertMd";
import type { Editor } from "@tiptap/react";

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
  const prevValue = useRef(value);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({ placeholder }),
      LinkExtension.configure({ openOnClick: false }),
      ImageExtension,
    ],
    content: mdToHtml(value),
    onUpdate: ({ editor }) => {
      const md = htmlToMd(editor.getHTML());
      prevValue.current = md;
      onChange(md);
    },
    editorProps: {
      attributes: {
        class:
          "focus:outline-none px-3 py-2.5",
      },
    },
    autofocus: autoFocus ? "end" : false,
  });

  // Sync external value changes (e.g. switching issues).
  useEffect(() => {
    if (editor && value !== prevValue.current) {
      prevValue.current = value;
      editor.commands.setContent(mdToHtml(value));
    }
  }, [value, editor]);

  const minHeight = Math.max(rows * 24 + 16, 80);
  useEffect(() => {
    if (editor) {
      editor.view.dom.style.minHeight = `${minHeight}px`;
    }
  }, [editor, minHeight]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg focus-within:border-brand focus-within:ring-4 focus-within:ring-[color-mix(in_srgb,var(--brand)_18%,transparent)] transition">
      <Toolbar editor={editor} />
      <div className="overflow-y-auto max-h-[65dvh]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const linkRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showLinkInput) setTimeout(() => linkRef.current?.focus(), 0);
  }, [showLinkInput]);

  useEffect(() => {
    if (showImageInput) setTimeout(() => imgRef.current?.focus(), 0);
  }, [showImageInput]);

  function confirmLink() {
    if (linkUrl.trim()) {
      editor.chain().focus().setLink({ href: linkUrl.trim() }).run();
    }
    setShowLinkInput(false);
    setLinkUrl("");
  }

  function confirmImage() {
    if (imageUrl.trim()) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
    }
    setShowImageInput(false);
    setImageUrl("");
  }

  const btn = (active: boolean, onClick: () => void, title: string, children: React.ReactNode) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition ${
        active
          ? "bg-brand-soft text-brand"
          : "text-muted hover:text-foreground hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-surface-2/40 flex-wrap">
      {btn(editor.isActive("bold"), () => editor.chain().focus().toggleBold().run(), "Bold (Ctrl+B)",
        <span className="font-bold text-sm">B</span>
      )}
      {btn(editor.isActive("italic"), () => editor.chain().focus().toggleItalic().run(), "Italic (Ctrl+I)",
        <span className="italic text-sm font-serif">I</span>
      )}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(editor.isActive("heading", { level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "Heading 1",
        <span className="font-bold text-[11px]">H1</span>
      )}
      {btn(editor.isActive("heading", { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Heading 2",
        <span className="font-bold text-[11px]">H2</span>
      )}
      {btn(editor.isActive("heading", { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Heading 3",
        <span className="font-bold text-[11px]">H3</span>
      )}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(editor.isActive("bulletList"), () => editor.chain().focus().toggleBulletList().run(), "Bullet list",
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M2 4a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3-1.5h9a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zM2 9a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3-1.5h9a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1zM2 14a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm3-1.5h9a.5.5 0 0 1 0 1H5a.5.5 0 0 1 0-1z"/></svg>
      )}
      {btn(editor.isActive("orderedList"), () => editor.chain().focus().toggleOrderedList().run(), "Numbered list",
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M2 3.5v-1l1-.5v4.5H2V3.5zm2 .5h9a.5.5 0 0 1 0 1H4a.5.5 0 0 1 0-1zm-1 5.5h.5V7H2v.5h1.5V9zm1 1.5h9a.5.5 0 0 1 0 1H4a.5.5 0 0 1 0-1zM3.5 12H2v.5h1.25v.25H2v.5h1.5v.25H2V14h1.5a.5.5 0 0 0 .5-.5v-.5a.5.5 0 0 0-.5-.5zm7 2.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1 0-1z"/></svg>
      )}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(false, () => editor.chain().focus().liftListItem('listItem').run(), "Outdent",
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M3.146 4.646a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-3 3a.5.5 0 0 1-.708-.708L5.793 8 3.146 5.354a.5.5 0 0 1 0-.708zM1 13.5a.5.5 0 0 1 .5-.5h12a.5.5 0 0 1 0 1h-12a.5.5 0 0 1-.5-.5z"/></svg>
      )}
      {btn(false, () => editor.chain().focus().sinkListItem('listItem').run(), "Indent",
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M8.854 4.646a.5.5 0 0 1 0 .708L6.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zM2.5 13.5a.5.5 0 0 1 .5-.5h12a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
      )}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(editor.isActive("blockquote"), () => editor.chain().focus().toggleBlockquote().run(), "Blockquote",
        <span className="text-sm">&#x275D;</span>
      )}
      {btn(editor.isActive("codeBlock"), () => editor.chain().focus().toggleCodeBlock().run(), "Code block",
        <span className="text-xs font-mono font-bold">{`</>`}</span>
      )}
      <div className="w-px h-5 bg-border mx-1" />
      <div className="relative">
        {btn(editor.isActive("link"), () => { setLinkUrl(""); setShowLinkInput(true); }, "Insert link",
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.354 5.5H4a3 3 0 0 0 0 6h3a3 3 0 0 0 2.83-4H9c-.086 0-.17.01-.25.031A2 2 0 0 1 7 10.5H4a2 2 0 1 1 0-4h1.535c.218-.376.495-.714.82-1z"/><path d="M9 5.5a3 3 0 0 0-2.83 4h1.098A2 2 0 0 1 9 6.5h3a2 2 0 1 1 0 4h-1.535a4.02 4.02 0 0 1-.82 1H12a3 3 0 1 0 0-6H9z"/></svg>
        )}
        {showLinkInput && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowLinkInput(false)}>
            <div className="bg-surface border border-border rounded-xl p-4 shadow-xl w-80" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-medium text-foreground mb-2">Insert link</p>
              <input
                ref={linkRef}
                className="input w-full text-sm"
                placeholder="https://..."
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmLink();
                  if (e.key === "Escape") setShowLinkInput(false);
                }}
              />
              <div className="flex gap-2 mt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowLinkInput(false)}
                  className="text-xs text-muted hover:text-foreground px-2 py-1 rounded transition"
                >Cancel</button>
                <button
                  type="button"
                  onClick={confirmLink}
                  className="text-xs gradient-brand text-white rounded px-3 py-1 font-medium transition"
                >Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="relative">
        {btn(false, () => { setImageUrl(""); setShowImageInput(true); }, "Insert image",
          <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5"><path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/><path d="M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z"/></svg>
        )}
        {showImageInput && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowImageInput(false)}>
            <div className="bg-surface border border-border rounded-xl p-4 shadow-xl w-80" onClick={(e) => e.stopPropagation()}>
              <p className="text-sm font-medium text-foreground mb-2">Insert image</p>
              <input
                ref={imgRef}
                className="input w-full text-sm"
                placeholder="https://example.com/image.png"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmImage();
                  if (e.key === "Escape") setShowImageInput(false);
                }}
              />
              <div className="flex gap-2 mt-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowImageInput(false)}
                  className="text-xs text-muted hover:text-foreground px-2 py-1 rounded transition"
                >Cancel</button>
                <button
                  type="button"
                  onClick={confirmImage}
                  className="text-xs gradient-brand text-white rounded px-3 py-1 font-medium transition"
                >Save</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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
