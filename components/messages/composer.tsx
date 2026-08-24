"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/lumen/core";
import { MAX_MESSAGE_LENGTH } from "@/lib/messages-rules";

// Shared composer for the student thread and the tutor's reply. The server
// action is the only enforcer (trim / empty / 4000); the counter and
// maxLength are conveniences. On success the draft field is remounted
// empty (keyed on the success timestamp), which also resets the counter.
export type ComposerState =
  | { ok: true; at: number }
  | { ok: false; reason: "empty" | "too-long" }
  | null;

function SendButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" size="md" type="submit" disabled={pending}>
      {pending ? "Sending…" : label}
    </Button>
  );
}

function DraftField({ placeholder, sendLabel }: { placeholder: string; sendLabel: string }) {
  const [length, setLength] = useState(0);
  return (
    <>
      <label className="lmn-field">
        <span className="lmn-field-label">Message</span>
        <textarea
          className="lmn-textarea"
          name="body"
          rows={3}
          required
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder={placeholder}
          defaultValue=""
          onInput={(e) => setLength(e.currentTarget.value.length)}
          style={{ minHeight: 88 }}
        />
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <SendButton label={sendLabel} />
        <span style={{ fontSize: "var(--text-caption)", color: "var(--text-tertiary)" }}>
          {length} / {MAX_MESSAGE_LENGTH}
        </span>
      </div>
    </>
  );
}

export function MessageComposer({
  action,
  placeholder,
  sendLabel = "Send",
}: {
  action: (prev: ComposerState, formData: FormData) => Promise<ComposerState>;
  placeholder: string;
  sendLabel?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const draftKey = state?.ok ? state.at : "draft";

  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {state && !state.ok && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
          {state.reason === "empty"
            ? "Write something first. Empty messages aren't sent."
            : `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.`}
        </p>
      )}
      <DraftField key={draftKey} placeholder={placeholder} sendLabel={sendLabel} />
    </form>
  );
}
