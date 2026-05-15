"use client";

import { useEffect, useRef, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import LinkExtension from "@tiptap/extension-link";
import ImageExtension from "@tiptap/extension-image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/Popover";
import { Tooltip } from "@/components/ui/Tooltip";
import {
  Bold, Italic, Heading1, Heading2, Heading3, TextQuote, Code2,
  List, ListOrdered, Link, Image,
  ListIndentIncrease,
  ListIndentDecrease,
} from "lucide-react";
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
          "focus:outline-none px-3 py-2.5 prose prose-sm max-w-none [&_ol]:list-decimal [&_ol>li]:list-decimal",
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

  const btn = (
    active: boolean,
    disabled: boolean,
    onClick: () => void,
    title: string,
    children: React.ReactNode,
  ) => (
    <Tooltip content={title}>
      <button
        type="button"
        onMouseDown={(e) => {
          e.preventDefault();
          onClick();
        }}
        disabled={disabled}
        aria-label={title}
        className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition outline-none ${
          disabled
            ? "opacity-30 cursor-not-allowed"
            : active
              ? "bg-brand-soft text-brand"
              : "text-muted hover:text-foreground hover:bg-surface-2"
        }`}
      >
        {children}
      </button>
    </Tooltip>
  );

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-surface-2/40 flex-wrap">
      {btn(editor.isActive("bold"), !editor.can().toggleBold(), () => editor.chain().focus().toggleBold().run(), "Bold (Ctrl+B)",
        <Bold className="w-3.5 h-3.5" />
      )}
      {btn(editor.isActive("italic"), !editor.can().toggleItalic(), () => editor.chain().focus().toggleItalic().run(), "Italic (Ctrl+I)",
        <Italic className="w-3.5 h-3.5" />
      )}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(editor.isActive("heading", { level: 1 }), !editor.can().toggleHeading({ level: 1 }), () => editor.chain().focus().toggleHeading({ level: 1 }).run(), "Heading 1",
        <Heading1 className="w-4 h-4" />
      )}
      {btn(editor.isActive("heading", { level: 2 }), !editor.can().toggleHeading({ level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), "Heading 2",
        <Heading2 className="w-4 h-4" />
      )}
      {btn(editor.isActive("heading", { level: 3 }), !editor.can().toggleHeading({ level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), "Heading 3",
        <Heading3 className="w-4 h-4" />
      )}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(editor.isActive("bulletList"), !editor.can().toggleBulletList(), () => editor.chain().focus().toggleBulletList().run(), "Bullet list",
<List className="w-3.5 h-3.5" />
      )}
      {btn(editor.isActive("orderedList"), !editor.can().toggleOrderedList(), () => editor.chain().focus().toggleOrderedList().run(), "Numbered list",
<ListOrdered className="w-3.5 h-3.5" />
      )}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(false, false, () => editor.chain().focus().liftListItem(editor.schema.nodes.listItem).run(), "Outdent",
        <ListIndentDecrease className="w-3.5 h-3.5" />
      )}
      {btn(false, false, () => editor.chain().focus().sinkListItem(editor.schema.nodes.listItem).run(), "Indent",
        <ListIndentIncrease className="w-3.5 h-3.5" />
      )}
      <div className="w-px h-5 bg-border mx-1" />
      {btn(editor.isActive("blockquote"), !editor.can().toggleBlockquote(), () => editor.chain().focus().toggleBlockquote().run(), "Blockquote",
<TextQuote className="w-3.5 h-3.5" />
      )}
      {btn(editor.isActive("codeBlock"), !editor.can().toggleCodeBlock(), () => editor.chain().focus().toggleCodeBlock().run(), "Code block",
<Code2 className="w-3.5 h-3.5" />
      )}
      <div className="w-px h-5 bg-border mx-1" />
      <Popover
        open={showLinkInput}
        onOpenChange={(o) => {
          setShowLinkInput(o);
          if (o) setLinkUrl("");
        }}
      >
        <PopoverTrigger
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Insert link"
          className={`w-7 h-7 flex items-center justify-center rounded text-xs font-medium transition outline-none ${
            editor.isActive("link")
              ? "bg-brand-soft text-brand"
              : "text-muted hover:text-foreground hover:bg-surface-2"
          }`}
        >
          <Link className="w-3.5 h-3.5" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          <p className="text-sm font-medium text-foreground mb-2 px-1">
            Insert link
          </p>
          <input
            autoFocus
            className="input w-full text-sm"
            placeholder="https://..."
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmLink();
              }
            }}
          />
          <div className="flex gap-2 mt-3 justify-end px-1">
            <button
              type="button"
              onClick={() => setShowLinkInput(false)}
              className="text-xs text-muted hover:text-foreground px-2 py-1 rounded transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmLink}
              className="text-xs gradient-brand text-white rounded px-3 py-1 font-medium transition"
            >
              Save
            </button>
          </div>
        </PopoverContent>
      </Popover>
      <Popover
        open={showImageInput}
        onOpenChange={(o) => {
          setShowImageInput(o);
          if (o) setImageUrl("");
        }}
      >
        <PopoverTrigger
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          aria-label="Insert image"
          className="w-7 h-7 flex items-center justify-center rounded text-xs font-medium text-muted hover:text-foreground hover:bg-surface-2 transition outline-none"
        >
          <Image className="w-3.5 h-3.5" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          <p className="text-sm font-medium text-foreground mb-2 px-1">
            Insert image
          </p>
          <input
            autoFocus
            className="input w-full text-sm"
            placeholder="https://example.com/image.png"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                confirmImage();
              }
            }}
          />
          <div className="flex gap-2 mt-3 justify-end px-1">
            <button
              type="button"
              onClick={() => setShowImageInput(false)}
              className="text-xs text-muted hover:text-foreground px-2 py-1 rounded transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmImage}
              className="text-xs gradient-brand text-white rounded px-3 py-1 font-medium transition"
            >
              Save
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function MarkdownBody({ content }: { content: string }) {
  const html = mdToHtml(content);
  if (!html) return null;
  return (
    <div
      className="text-foreground ProseMirror px-0"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
