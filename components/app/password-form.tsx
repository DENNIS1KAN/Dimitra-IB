"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/lumen/core";
import { Input } from "@/components/lumen/forms";
import { MIN_PASSWORD_LENGTH } from "@/lib/password";

export type PasswordFormState =
  | { ok: true; at: number }
  | { ok: false; reason: "too-short" | "wrong-current" }
  | null;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Change password"}
    </Button>
  );
}

// Current + new (SPEC §15.4). The server re-checks everything; minLength
// here only saves a round trip. Fields remount empty after a success.
export function PasswordForm({
  action,
}: {
  action: (prev: PasswordFormState, formData: FormData) => Promise<PasswordFormState>;
}) {
  const [state, formAction] = useActionState(action, null);
  const fieldsKey = state?.ok ? state.at : "draft";
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {state?.ok && (
        <p role="status" style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 700 }}>
          Password changed. Any other devices you were signed in on have been signed out.
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
          {state.reason === "wrong-current"
            ? "That isn't your current password — try again."
            : `Your new password needs at least ${MIN_PASSWORD_LENGTH} characters.`}
        </p>
      )}
      <div key={fieldsKey} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Input
          label="Current password"
          name="current"
          type="password"
          required
          autoComplete="current-password"
        />
        <Input
          label="New password"
          name="next"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete="new-password"
          helper={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />
      </div>
      <div>
        <SaveButton />
      </div>
    </form>
  );
}
