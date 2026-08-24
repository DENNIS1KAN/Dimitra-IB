"use client";

import { useEffect, useRef, useState } from "react";
import { saveModuleNote } from "@/app/admin/actions";

// The weekly note (module description) with autosave (SPEC §15.7 #23).
// Debounced a second after typing stops; "Saved just now" confirms it.
export function NoteAutosave({ moduleId, initial }: { moduleId: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function onChange(next: string) {
    setValue(next);
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveModuleNote(moduleId, next).then(
        (r) => setState(r.ok ? "saved" : "error"),
        () => setState("error"),
      );
    }, 900);
  }

  return (
    <div>
      <textarea
        className="lmn-input"
        aria-label="Weekly note"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{ width: "100%", minHeight: 84, resize: "vertical", boxSizing: "border-box" }}
      />
      <p
        style={{
          margin: "5px 0 0",
          fontSize: 11.5,
          color: state === "error" ? "#c4320a" : "var(--text-tertiary)",
          display: "flex",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <span>A couple of sentences in your voice: what to focus on, what to bring to the clinic.</span>
        <span
          aria-live="polite"
          style={{
            whiteSpace: "nowrap",
            fontWeight: 600,
            color:
              state === "saved"
                ? "var(--text-success)"
                : state === "error"
                  ? "#c4320a"
                  : "var(--text-tertiary)",
          }}
        >
          {state === "saving" ? "Saving" : state === "saved" ? "Saved just now" : state === "error" ? "Not saved. Check your connection." : ""}
        </span>
      </p>
    </div>
  );
}
