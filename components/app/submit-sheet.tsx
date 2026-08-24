"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button, Icon } from "@/components/rts/core";
import { TextArea } from "@/components/rts/forms";
import { LockPanel } from "@/components/rts/learning";
import { markAttemptSent } from "./submission-toast";

// Submit box (SPEC §7): file and/or note and/or "mark attempted"; any of
// the three counts. Bottom-sheet recipe from DESIGN.md §6; solutions unlock
// instantly on success (Rule 2).
export function SubmitPanel({
  moduleId,
  variant = "panel",
}: {
  moduleId: string;
  /** panel = the standalone lock panel · inline = just the step's action. */
  variant?: "panel" | "inline";
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(markOnly = false) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("moduleId", moduleId);
      if (!markOnly) {
        const file = fileRef.current?.files?.[0];
        if (file) form.set("file", file);
        if (note.trim()) form.set("note", note.trim());
      }
      const res = await fetch("/api/submissions", { method: "POST", body: form });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Submit failed (${res.status})`);
      }
      setOpen(false);
      markAttemptSent();
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {variant === "inline" ? (
        // The current step's own control (SPEC §15.7 #27): the box opens in
        // place, so the path never sends the student somewhere else to submit.
        <Button variant="cta" size="sm" onClick={() => setOpen(true)}>
          Submit
        </Button>
      ) : (
        <LockPanel
          locked
          title="Submit your attempt to unlock solutions"
          body="Upload a photo of your working. Marks don't matter here, honest attempts do."
          action={
            <Button variant="cta" onClick={() => setOpen(true)}>
              Submit my attempt
            </Button>
          }
        />
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Submit your attempt"
          onClick={() => !busy && setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(45,44,43,.4)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface-card)",
              borderRadius: "24px 24px 0 0",
              padding: "24px 20px calc(28px + env(safe-area-inset-bottom))",
              width: "100%",
              maxWidth: 560,
              boxSizing: "border-box",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "var(--text-subheading)",
                fontWeight: 700,
                letterSpacing: "var(--tracking-subheading)",
              }}
            >
              Submit your attempt
            </h3>

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{
                border: "1px dashed var(--border-divider)",
                background: "var(--surface-page)",
                borderRadius: "var(--radius-cards)",
                padding: 22,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <Icon
                name={fileName ? "check_circle" : "photo_camera"}
                size={24}
                color={fileName ? "var(--action-primary)" : "var(--text-secondary)"}
              />
              <span
                style={{
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 500,
                  color: fileName ? "var(--text-primary)" : "var(--text-secondary)",
                  wordBreak: "break-all",
                }}
              >
                {fileName ?? "Photo of your working"}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              hidden
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
            />

            <TextArea
              placeholder="Anything you got stuck on? (optional)"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />

            {error && (
              <p role="alert" style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
                {error}
              </p>
            )}

            <Button variant="primary" fullWidth disabled={busy} onClick={() => void submit(false)}>
              {busy ? "Sending…" : "Send to Dimitra"}
            </Button>
            <Button variant="ghost" fullWidth disabled={busy} onClick={() => void submit(true)}>
              Just mark as attempted
            </Button>
          </div>
        </div>
      )}

    </>
  );
}
