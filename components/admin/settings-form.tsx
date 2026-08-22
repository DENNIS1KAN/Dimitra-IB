"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/lumen/core";
import { Input, TextArea } from "@/components/lumen/forms";
import { MAX_CLINIC_TEXT } from "@/lib/settings-rules";

export type SettingsFormState =
  | { ok: true; at: number }
  | { ok: false; reason: "invalid-url" | "too-long" }
  | null;

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" size="sm" type="submit" disabled={pending}>
      {pending ? "Saving…" : "Save settings"}
    </Button>
  );
}

// Controlled fields on purpose: React resets uncontrolled form fields after
// every action result, which would wipe the clinic note when the URL is
// rejected. The server (lib/settings) is the only enforcer.
export function SettingsForm({
  action,
  initial,
}: {
  action: (prev: SettingsFormState, formData: FormData) => Promise<SettingsFormState>;
  initial: { bookingUrl: string; clinicText: string };
}) {
  const [state, formAction] = useActionState(action, null);
  const [bookingUrl, setBookingUrl] = useState(initial.bookingUrl);
  const [clinicText, setClinicText] = useState(initial.clinicText);
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
      {state?.ok && (
        <p role="status" style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 700 }}>
          Saved.
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
          {state.reason === "invalid-url"
            ? "The booking link must be a full web address starting with https:// (or left empty)."
            : `The clinic note is limited to ${MAX_CLINIC_TEXT} characters.`}
        </p>
      )}
      <Input
        label="Google Calendar booking page (booking_url)"
        name="bookingUrl"
        type="url"
        value={bookingUrl}
        onChange={(e) => setBookingUrl(e.target.value)}
        placeholder="https://calendar.app.google/…"
        helper='Students see it as "Book a 1:1 on Google Meet" on their Sessions page; opens in a new tab.'
      />
      <TextArea
        label="Next clinic (clinic_text)"
        name="clinicText"
        rows={3}
        maxLength={MAX_CLINIC_TEXT}
        value={clinicText}
        onChange={(e) => setClinicText(e.target.value)}
        placeholder="Thursday 18:00 — bring your kinetics questions."
      />
      <div>
        <SaveButton />
      </div>
    </form>
  );
}
