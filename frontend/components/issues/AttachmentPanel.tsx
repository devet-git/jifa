"use client";

import { useRef, useState } from "react";
import { showConfirm } from "@/store/confirm";
import { usePermissionsStore } from "@/store/permissions";
import { PermissionGate } from "@/components/ui/PermissionGate";
import api from "@/lib/api";
import {
  useAttachments,
  useUploadAttachment,
  useDeleteAttachment,
} from "@/hooks/useAttachments";
import { Avatar } from "@/components/ui/Avatar";
import { UserHoverCard } from "@/components/ui/UserHoverCard";
import { Trash2 } from "lucide-react";
import { FilePreview, FileIcon } from "@/components/ui/FilePreview";

interface Props {
  issueId: number;
}

const MAX_BYTES = 25 * 1024 * 1024;

export function AttachmentPanel({ issueId }: Props) {
  const can = usePermissionsStore((s) => s.can);
  const canManage = can("issue.manage-attachment");
  const { data: atts = [] } = useAttachments(issueId);
  const upload = useUploadAttachment(issueId);
  const remove = useDeleteAttachment(issueId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    attachment: import("@/types").Attachment;
  } | null>(null);

  async function uploadAll(files: FileList | File[]) {
    setError(null);
    for (const f of Array.from(files)) {
      if (f.size > MAX_BYTES) {
        setError(`${f.name} is larger than 25 MB`);
        continue;
      }
      try {
        await upload.mutateAsync(f);
      } catch (err: any) {
        setError(err.response?.data?.error ?? `Failed to upload ${f.name}`);
      }
    }
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) uploadAll(e.dataTransfer.files);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide">
          Attachments {atts.length > 0 && `(${atts.length})`}
        </p>
        <PermissionGate perm="issue.manage-attachment" message="Bạn không có quyền quản lý tệp đính kèm">
          <button
            onClick={() => canManage && inputRef.current?.click()}
            className="text-xs text-blue-500 hover:underline"
            disabled={upload.isPending}
          >
            {upload.isPending ? "Uploading…" : "+ Upload"}
          </button>
        </PermissionGate>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadAll(e.target.files);
          e.target.value = "";
        }}
      />

      {canManage && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-3 mb-2 text-center text-xs transition ${
           dragOver
               ? "border-brand bg-brand-soft"
               : "border-border text-muted"
          }`}
        >
          Drop files here or click Upload (max 25 MB each)
        </div>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {atts.length > 0 && (
        <ul className="grid grid-cols-2 gap-2">
          {atts.map((a) => (
            <AttachmentTile
              key={a.id}
              att={a}
              issueId={issueId}
              canDelete={canManage}
              onDelete={async () => {
                if (await showConfirm({ message: `Delete ${a.original_filename}?`, variant: "danger" }))
                  remove.mutate(a.id);
              }}
              onPreview={() => setPreview({ attachment: a })}
            />
          ))}
        </ul>
      )}

      {preview && (
        <FilePreview
          open
          onClose={() => setPreview(null)}
          attachment={preview.attachment}
          issueId={issueId}
        />
      )}
    </div>
  );
}

function AttachmentTile({
  att,
  issueId,
  canDelete,
  onDelete,
  onPreview,
}: {
  att: import("@/types").Attachment;
  issueId: number;
  canDelete?: boolean;
  onDelete: () => void;
  onPreview: () => void;
}) {
  const isImage = att.mime_type?.startsWith("image/");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function ensureUrl() {
    if (blobUrl) return blobUrl;
    if (loading) return null;
    setLoading(true);
    let url: string | null = null;
    try {
      const res = await api.get(
        `/issues/${issueId}/attachments/${att.id}`,
        { responseType: "blob" },
      );
      url = URL.createObjectURL(res.data);
      setBlobUrl(url);
    } catch {
      url = null;
    }
    setLoading(false);
    return url;
  }

  if (isImage && !blobUrl && !loading) {
    void ensureUrl();
  }

  return (
    <li className="bg-white border rounded-lg overflow-hidden group relative">
      <button
        onClick={onPreview}
        className="block w-full text-left"
        title={att.original_filename}
      >
        {isImage && blobUrl ? (
          <div className="h-24 bg-gray-50 overflow-hidden">
            <img
              src={blobUrl}
              alt={att.original_filename}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="h-24 bg-gray-50 flex items-center justify-center text-gray-400">
            <FileIcon mime={att.mime_type ?? ""} filename={att.original_filename} className="w-8 h-8" />
          </div>
        )}
        <div className="px-2 py-1.5">
          <p className="text-xs truncate font-medium">
            {att.original_filename}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
            <UserHoverCard user={att.uploader} side="top">
              <Avatar name={att.uploader?.name} src={att.uploader?.avatar} size="sm" />
            </UserHoverCard>
            <span>{humanSize(att.size)}</span>
          </div>
        </div>
      </button>
      <PermissionGate perm="issue.manage-attachment" message="Bạn không có quyền quản lý tệp đính kèm">
        <button
          onClick={onDelete}
          className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center bg-white/80 dark:bg-surface/80 backdrop-blur rounded-md opacity-0 group-hover:opacity-100 transition text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </PermissionGate>
    </li>
  );
}

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
