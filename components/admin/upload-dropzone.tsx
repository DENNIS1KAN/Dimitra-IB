"use client";

import { Icon } from "@/components/lumen/core";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

const TYPE_OPTIONS = [
  { value: "video", label: "Video (MP4/WebM)" },
  { value: "slides", label: "Slides (PDF)" },
  { value: "exercises", label: "Exercises (PDF)" },
  { value: "solutions", label: "Solutions (PDF)" },
];

// Drag-and-drop material upload (SPEC §7). Dev mode lands in ./storage;
// with Bunny Storage configured the same endpoint forwards file bytes
// there. Video does NOT reach Bunny Stream this way — wiring this dropzone
// to the TUS handshake (lib/video.ts createBunnyVideo +
// bunnyUploadSignature) is the documented M3 finishing step.
export function UploadDropzone({ moduleId }: { moduleId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState("video");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  async function upload(files: FileList | File[]) {
    setBusy(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("moduleId", moduleId);
        form.set("type", type);
        form.set("file", file);
        const res = await fetch("/api/admin/materials", { method: "POST", body: form });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(body?.error ?? `Upload failed (${res.status})`);
        }
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <label className="lmn-field" style={{ maxWidth: 260 }}>
        <span className="lmn-field-label">Material type</span>
        <select className="lmn-input" value={type} onChange={(e) => setType(e.target.value)}>
          {TYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          if (e.dataTransfer.files.length) void upload(e.dataTransfer.files);
        }}
        disabled={busy}
        style={{
          border: `1px dashed ${over ? "var(--action-primary)" : "var(--border-divider)"}`,
          background: over ? "rgba(0,97,239,.04)" : "var(--surface-page)",
          borderRadius: "var(--radius-cards)",
          padding: 22,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 6,
          cursor: busy ? "wait" : "pointer",
          fontFamily: "inherit",
        }}
      >
        <Icon name={busy ? "hourglass" : "upload"} size={24} color="var(--text-secondary)" />
        <span style={{ fontSize: "var(--text-body-sm)", fontWeight: 500, color: "var(--text-secondary)" }}>
          {busy ? "Uploading…" : "Drag files here or click to choose"}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => e.target.files?.length && void upload(e.target.files)}
      />

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
          {error}
        </p>
      )}
    </div>
  );
}
