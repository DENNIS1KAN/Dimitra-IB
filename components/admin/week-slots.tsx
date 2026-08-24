"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { removeMaterial, reorderMaterials } from "@/app/admin/actions";
import { Icon } from "@/components/rts/core";

// The week editor's four labeled slots (SPEC §15.7 #23, per
// design/admin-blend-final.html): Videos multi-file with drag to reorder,
// Slides / Exercises / Solutions single-file with Replace. Uploads go through
// the existing /api/admin/materials path (local FileStorage in dev).

export type SlotMaterial = { id: string; type: string; title: string };

const ACCEPT: Record<string, string> = {
  video: ".mp4,.webm,.mov",
  slides: ".pdf",
  exercises: ".pdf",
  solutions: ".pdf",
};

const okDisc = (
  <span
    aria-hidden="true"
    style={{
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "var(--state-done)",
      color: "#fff",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flex: "none",
    }}
  >
    <Icon name="check" size={11} strokeWidth={3.4} />
  </span>
);

const procDisc = (
  <span
    aria-hidden="true"
    style={{
      width: 20,
      height: 20,
      borderRadius: "50%",
      background: "var(--surface-page)",
      border: "2px solid var(--color-stone)",
      boxSizing: "border-box",
      flex: "none",
    }}
  />
);

function slotHeading(title: string, hint?: string) {
  return (
    <h3
      style={{
        margin: "0 0 10px",
        fontSize: 13,
        fontWeight: 800,
        letterSpacing: ".04em",
        textTransform: "uppercase",
        color: "var(--text-heading-color)",
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {title}
      {hint && (
        <small
          style={{
            fontWeight: 500,
            textTransform: "none",
            letterSpacing: 0,
            color: "var(--text-tertiary)",
            fontSize: 12,
          }}
        >
          {hint}
        </small>
      )}
    </h3>
  );
}

const fileRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 11,
  border: "1px solid var(--border-card)",
  borderRadius: "var(--radius-small)",
  padding: "10px 12px",
  marginBottom: 8,
  background: "var(--surface-card)",
};

const softLink: React.CSSProperties = {
  border: 0,
  background: "none",
  padding: 0,
  font: "inherit",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text-tertiary)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const blueLink: React.CSSProperties = {
  ...softLink,
  fontWeight: 700,
  color: "var(--action-primary)",
};

function useUploader(moduleId: string) {
  const router = useRouter();
  const [pending, setPending] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);

  async function upload(type: string, files: File[] | FileList, replace?: string) {
    const names = Array.from(files).map((f) => f.name);
    if (names.length === 0) return;
    setError(null);
    setPending((p) => ({ ...p, [type]: [...(p[type] ?? []), ...names] }));
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("moduleId", moduleId);
        form.set("type", type);
        form.set("file", file);
        if (replace) form.set("replace", replace);
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
      setPending((p) => ({
        ...p,
        [type]: (p[type] ?? []).filter((n) => !names.includes(n)),
      }));
    }
  }

  return { upload, pending, error, router };
}

function Drop({
  label,
  accept,
  multiple = false,
  onFiles,
}: {
  label: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: FileList) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
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
          if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
        }}
        style={{
          width: "100%",
          border: `1.5px dashed ${over ? "var(--action-primary)" : "var(--border-divider)"}`,
          background: over ? "rgba(0,97,239,.04)" : "transparent",
          borderRadius: "var(--radius-small)",
          padding: 16,
          textAlign: "center",
          fontFamily: "inherit",
          fontSize: 13,
          color: "var(--text-tertiary)",
          cursor: "pointer",
        }}
      >
        {label} or <b style={{ color: "var(--action-primary)", fontWeight: 700 }}>browse</b>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          if (e.target.files?.length) onFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </>
  );
}

export function WeekSlots({
  moduleId,
  materials,
}: {
  moduleId: string;
  materials: SlotMaterial[];
}) {
  const { upload, pending, error, router } = useUploader(moduleId);

  // Videos take a local order override so a drag lands instantly; the
  // override is keyed to the server order it rearranged, so any refresh
  // that changes the server list wins again.
  const serverVideos = materials.filter((m) => m.type === "video");
  const serverKey = serverVideos.map((m) => m.id).join(",");
  const [order, setOrder] = useState<{ key: string; ids: string[] } | null>(null);
  const videos =
    order && order.key === serverKey
      ? order.ids
          .map((id) => serverVideos.find((v) => v.id === id))
          .filter((v): v is SlotMaterial => !!v)
      : serverVideos;
  const dragFrom = useRef<number | null>(null);

  async function remove(m: SlotMaterial) {
    if (!confirm(`Remove "${m.title}"? The uploaded file goes with it. There is no undo.`)) return;
    await removeMaterial(m.id);
    router.refresh();
  }

  async function dropOn(target: number) {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null || from === target) return;
    const next = [...videos];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    setOrder({ key: serverKey, ids: next.map((m) => m.id) });
    await reorderMaterials(
      moduleId,
      "video",
      next.map((m) => m.id),
    );
    router.refresh();
  }

  const single = (type: "slides" | "exercises" | "solutions", dropLabel: string) => {
    const rows = materials.filter((m) => m.type === type);
    const inFlight = pending[type] ?? [];
    return (
      <>
        {rows.map((m) => (
          <div key={m.id} style={fileRowStyle}>
            {okDisc}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)" }}>
                {m.title}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>PDF</span>
            </span>
            <label style={blueLink}>
              Replace
              <input
                type="file"
                accept={ACCEPT[type]}
                hidden
                onChange={(e) => {
                  if (e.target.files?.length) void upload(type, e.target.files, m.id);
                  e.target.value = "";
                }}
              />
            </label>
            <button type="button" style={softLink} onClick={() => void remove(m)}>
              Remove
            </button>
          </div>
        ))}
        {inFlight.map((name) => (
          <div key={name} style={fileRowStyle}>
            {procDisc}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)" }}>
                {name}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>
                Processing. You can leave this page, it finishes on its own.
              </span>
            </span>
          </div>
        ))}
        {rows.length === 0 && inFlight.length === 0 && (
          <Drop label={dropLabel} accept={ACCEPT[type]} onFiles={(f) => void upload(type, f)} />
        )}
      </>
    );
  };

  const slotStyle: React.CSSProperties = {
    border: "1px solid var(--border-card)",
    borderRadius: "var(--radius-cards)",
    padding: "15px 16px",
    marginBottom: 13,
    background: "var(--surface-card)",
  };

  return (
    <div>
      <section style={slotStyle} aria-label="Videos">
        {slotHeading("Videos", "10 to 15 minutes each works best")}
        {videos.map((m, i) => (
          <div
            key={m.id}
            style={fileRowStyle}
            draggable
            onDragStart={() => {
              dragFrom.current = i;
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void dropOn(i);
            }}
          >
            <span
              aria-hidden="true"
              style={{ color: "var(--text-tertiary)", letterSpacing: 1, cursor: "grab", fontWeight: 700 }}
            >
              ⋮⋮
            </span>
            {okDisc}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)" }}>
                {i + 1} · {m.title}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>ready</span>
            </span>
            <button type="button" style={softLink} onClick={() => void remove(m)}>
              Remove
            </button>
          </div>
        ))}
        {(pending.video ?? []).map((name) => (
          <div key={name} style={fileRowStyle}>
            {procDisc}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: "var(--text-strong)" }}>
                {name}
              </span>
              <span style={{ display: "block", fontSize: 12, color: "var(--text-tertiary)" }}>
                Processing. You can leave this page, it finishes on its own.
              </span>
            </span>
          </div>
        ))}
        <Drop
          label="Drag MP4s here"
          accept={ACCEPT.video}
          multiple
          onFiles={(f) => void upload("video", f)}
        />
      </section>

      <section style={slotStyle} aria-label="Slides">
        {slotHeading("Slides")}
        {single("slides", "Drag the slides PDF here")}
      </section>

      <section style={slotStyle} aria-label="Exercises">
        {slotHeading("Exercises")}
        {single("exercises", "Drag the exercises PDF here")}
      </section>

      <section style={slotStyle} aria-label="Solutions">
        {slotHeading("Solutions")}
        {single("solutions", "Drag the solutions PDF here")}
        <p
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: 12,
            color: "var(--text-tertiary)",
            margin: "9px 0 0",
          }}
        >
          <Icon name="lock" size={13} strokeWidth={2.2} />
          Students see these only after they submit their attempt.
        </p>
      </section>

      {error && (
        <p role="alert" style={{ margin: 0, fontSize: 13, color: "#c4320a" }}>
          {error}
        </p>
      )}
    </div>
  );
}
