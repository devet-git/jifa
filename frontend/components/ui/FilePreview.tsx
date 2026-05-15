"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/Dialog";
import api from "@/lib/api";
import type { Attachment } from "@/types";
import {
  Download,
  X,
  Maximize2,
  Minimize,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

interface FilePreviewProps {
  open: boolean;
  onClose: () => void;
  attachment: Attachment;
  issueId: number;
}

export function FilePreview({ open, onClose, attachment, issueId }: FilePreviewProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [arrayBuffer, setArrayBuffer] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const mime = attachment.mime_type ?? "";
  const ext = attachment.original_filename.split('.').pop()?.toLowerCase() ?? "";
  const isImage = mime.startsWith("image/");
  const isVideo = mime.startsWith("video/");
  const isAudio = mime.startsWith("audio/");
  const isPdf = mime === "application/pdf";
  const isText = mime.startsWith("text/");
  const isOffice = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
  const isDocx = ext === "docx";
  const isXlsx = ext === "xlsx" || ext === "xls";

  const fetchBlob = useCallback(async () => {
    if (blobUrl || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(
        `/issues/${issueId}/attachments/${attachment.id}`,
        { responseType: "arraybuffer" },
      );
      const data = res.data as ArrayBuffer;
      const blob = new Blob([data], { type: mime || undefined });
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      if (isDocx || isXlsx) setArrayBuffer(data);
    } catch {
      setError("Failed to load file");
    } finally {
      setLoading(false);
    }
  }, [issueId, attachment.id, blobUrl, loading, isDocx, isXlsx]);

  useEffect(() => {
    if (open) {
      fetchBlob();
      setScale(1);
      setPan({ x: 0, y: 0 });
    }
  }, [open, fetchBlob]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  async function handleDownload() {
    if (!blobUrl) await fetchBlob();
    if (blobUrl) {
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = attachment.original_filename;
      a.click();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="xl" className={`${fullscreen ? "!inset-0 !translate-x-0 !translate-y-0 !max-w-none !max-h-none !w-screen !h-screen rounded-none" : "!max-w-[90vw] !max-h-[85vh]"} !p-0 !gap-0 flex flex-col overflow-hidden`} hideClose>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileIcon mime={mime} filename={attachment.original_filename} className="w-4 h-4 shrink-0 text-muted" />
            <DialogTitle className="text-sm font-medium truncate max-w-[70vw]">
              {attachment.original_filename}
            </DialogTitle>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition"
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            {isImage && (
              <>
                <button
                  onClick={() => setScale((s) => Math.max(0.1, s - 0.25))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition"
                  aria-label="Zoom out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-muted tabular-nums w-10 text-center">
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale((s) => Math.min(5, s + 0.25))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition"
                  aria-label="Zoom in"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-5 bg-border mx-1" />
              </>
            )}
            <button
              onClick={() => { setFullscreen((v) => !v); setScale(1); setPan({ x: 0, y: 0 }); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition"
              aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-foreground hover:bg-surface-2 transition"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1 flex items-center justify-center bg-surface-2/30 min-h-0">
          {loading && (
            <div className="flex flex-col items-center gap-2 text-sm text-muted py-16">
              <div className="w-5 h-5 border-2 border-border border-t-brand rounded-full animate-spin" />
              Loading…
            </div>
          )}
          {error && (
            <div className="text-sm text-red-500 py-16">{error}</div>
          )}
          {blobUrl && !loading && !error && (
            <>
              {isImage && (
                <div
                  className="w-full h-full flex items-center justify-center overflow-hidden select-none"
                  onWheel={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      e.preventDefault();
                      const delta = e.deltaY > 0 ? -0.1 : 0.1;
                      setScale((s) => Math.max(0.1, Math.min(5, s + delta)));
                    }
                  }}
                  onMouseDown={(e) => {
                    if (scale > 1) {
                      setDragging(true);
                      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
                    }
                  }}
                  onMouseMove={(e) => {
                    if (dragging) {
                      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
                    }
                  }}
                  onMouseUp={() => setDragging(false)}
                  onMouseLeave={() => setDragging(false)}
                  onDoubleClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
                >
                  <img
                    src={blobUrl}
                    alt={attachment.original_filename}
                    className="max-w-full max-h-[75vh] object-contain p-4 transition-transform duration-75"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
                      cursor: scale > 1 ? (dragging ? 'grabbing' : 'grab') : 'default',
                    }}
                    draggable={false}
                  />
                </div>
              )}
              {isPdf && (
                <div className={`w-full ${fullscreen ? "flex-1 flex flex-col min-h-0" : "h-[75vh]"}`}>
                  <embed
                    src={blobUrl}
                    type="application/pdf"
                    className="w-full h-full"
                  />
                </div>
              )}
              {isVideo && (
                <video
                  src={blobUrl}
                  controls
                  className={`max-w-full ${fullscreen ? "max-h-full w-full" : "max-h-[75vh]"}`}
                  autoPlay
                >
                  Your browser does not support video playback.
                </video>
              )}
              {isAudio && (
                <div className={`px-4 w-full max-w-lg ${fullscreen ? "py-8" : "py-16"}`}>
                  <audio src={blobUrl} controls autoPlay className="w-full" />
                </div>
              )}
              {isText && (
                <TextPreview url={blobUrl} />
              )}
              {isDocx && arrayBuffer && (
                <div className="flex flex-col w-full h-full">
                  <DocxPreview buffer={arrayBuffer} />
                  <div className="flex items-center justify-end px-4 py-2 border-t border-border text-xs text-muted bg-surface-2/20">
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium gradient-brand text-white hover:opacity-90 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              )}
              {isXlsx && arrayBuffer && (
                <div className="flex flex-col w-full h-full">
                  <XlsxPreview buffer={arrayBuffer} />
                  <div className="flex items-center justify-end px-4 py-2 border-t border-border text-xs text-muted bg-surface-2/20">
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium gradient-brand text-white hover:opacity-90 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              )}
              {isOffice && !isDocx && !isXlsx && (
                <div className="flex flex-col w-full h-full">
                  <iframe
                    src={blobUrl}
                    className="w-full flex-1 border-0"
                    title={attachment.original_filename}
                  />
                  <div className="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted bg-surface-2/20">
                    <span>Office file — your browser may show a preview</span>
                    <button
                      onClick={handleDownload}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium gradient-brand text-white hover:opacity-90 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              )}
              {!isImage && !isPdf && !isVideo && !isAudio && !isText && !isOffice && (
                <div className="text-center py-16 px-4">
                  <FileIcon mime={mime} filename={attachment.original_filename} className="w-16 h-16 mx-auto text-muted mb-4" />
                  <p className="text-sm text-muted mb-4">
                    Preview not available for this file type.
                  </p>
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium gradient-brand text-white hover:opacity-90 transition"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((r) => r.text())
      .then(setText)
      .catch(() => setText("Failed to load text content"))
      .finally(() => setLoading(false));
  }, [url]);

  if (loading) return <div className="text-sm text-muted py-12">Loading text…</div>;

  return (
    <pre className="text-xs font-mono p-4 w-full max-h-[75vh] whitespace-pre-wrap break-all overflow-auto">
      <code>{text}</code>
    </pre>
  );
}

function DocxPreview({ buffer }: { buffer: ArrayBuffer }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import("mammoth").then((mammoth) =>
      mammoth.convertToHtml({ arrayBuffer: buffer }).then((r) => {
        if (!cancelled) setHtml(r.value);
      }).catch(() => {
        if (!cancelled) setHtml("<p style='color:red'>Failed to render document</p>");
      }).finally(() => {
        if (!cancelled) setLoading(false);
      }),
    );
    return () => { cancelled = true; };
  }, [buffer]);

  if (loading) return <div className="text-sm text-muted py-12 text-center">Rendering document…</div>;

  return (
    <div className="flex-1 overflow-auto p-6 bg-white">
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function XlsxPreview({ buffer }: { buffer: ArrayBuffer }) {
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    import("xlsx").then((XLSX) => {
      const wb = XLSX.read(buffer, { type: "array" });
      const sheets: string[] = [];
      wb.SheetNames.forEach((name) => {
        const ws = wb.Sheets[name];
        sheets.push(
          `<div class="xlsx-sheet"><h3 class="xlsx-sheet-title">${name}</h3>` +
          XLSX.utils.sheet_to_html(ws, { id: `sheet-${name}` }) +
          `</div>`,
        );
      });
      if (!cancelled) setHtml(sheets.join("\n<hr class='my-4' />\n"));
    }).catch(() => {
      if (!cancelled) setHtml("<p style='color:red'>Failed to render spreadsheet</p>");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [buffer]);

  if (loading) return <div className="text-sm text-muted py-12 text-center">Rendering spreadsheet…</div>;

  return (
    <div className="flex-1 overflow-auto p-4 bg-white">
      <style>{`.xlsx-sheet { margin-bottom: 1rem; } .xlsx-sheet-title { font-weight: 600; font-size: 0.875rem; margin-bottom: 0.5rem; } .xlsx-sheet table { border-collapse: collapse; font-size: 0.8rem; } .xlsx-sheet td, .xlsx-sheet th { border: 1px solid #d1d5db; padding: 4px 8px; white-space: nowrap; } .xlsx-sheet th { background: #f3f4f6; font-weight: 600; }`}</style>
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function iconByExt(ext: string) {
  if (["doc", "docx"].includes(ext)) return "word";
  if (["xls", "xlsx", "csv"].includes(ext)) return "excel";
  if (["ppt", "pptx"].includes(ext)) return "powerpoint";
  if (["pdf"].includes(ext)) return "pdf";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  if (["js", "ts", "jsx", "tsx", "py", "go", "rs", "java", "css", "html", "json", "xml", "yml", "yaml", "sh", "md"].includes(ext))
    return "code";
  if (["mp4", "webm", "avi", "mkv", "mov"].includes(ext)) return "video";
  if (["mp3", "wav", "ogg", "flac"].includes(ext)) return "audio";
  return null;
}

const BADGE_COLORS: Record<string, string> = {
  word: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  excel: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  powerpoint: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  pdf: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  archive: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  code: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
  video: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  audio: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
};

function badgeClass(ext: string): string {
  const type = iconByExt(ext);
  if (type && BADGE_COLORS[type]) return BADGE_COLORS[type];
  return "bg-surface-2 text-muted dark:bg-surface-3 dark:text-muted-2";
}

export function FileIcon({ mime, filename, className }: { mime: string; filename?: string; className?: string }) {
  const ext = filename?.split('.').pop()?.toLowerCase() ?? "";
  const label = (ext || "?").slice(0, 4).toUpperCase();
  return (
    <div className={className}>
      <div className={`w-full h-full inline-flex items-center justify-center rounded-md font-bold leading-none text-[0.5rem] select-none ${badgeClass(ext)}`}>
        {label}
      </div>
    </div>
  );
}
