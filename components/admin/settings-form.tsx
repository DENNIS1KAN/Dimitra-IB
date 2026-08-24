"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/lumen/core";
import { Input, TextArea } from "@/components/lumen/forms";
import { CLINIC_DAYS, MAX_CLINIC_TEXT } from "@/lib/settings-rules";

export type SettingsFormState =
  | { ok: true; at: number }
  | { ok: false; reason: "invalid-url" | "too-long" | "invalid-day" | "invalid-time" }
  | null;

const ERROR_COPY: Record<Exclude<SettingsFormState, null | { ok: true; at: number }>["reason"], string> = {
  "invalid-url": "The booking link must be a full web address starting with https:// (or left empty).",
  "too-long": `The clinic note is limited to ${MAX_CLINIC_TEXT} characters.`,
  "invalid-day": "Pick a real weekday for the clinic.",
  "invalid-time": "The clinic time needs the 24-hour format, like 18:00.",
};

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
  initial: { bookingUrl: string; clinicText: string; clinicDay: string; clinicTime: string };
}) {
  const [state, formAction] = useActionState(action, null);
  const [bookingUrl, setBookingUrl] = useState(initial.bookingUrl);
  const [clinicText, setClinicText] = useState(initial.clinicText);
  const [clinicDay, setClinicDay] = useState(initial.clinicDay);
  const [clinicTime, setClinicTime] = useState(initial.clinicTime);
  const dayLabel = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);
  return (
    <form action={formAction} style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 560 }}>
      {state?.ok && (
        <p role="status" style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 700 }}>
          Saved.
        </p>
      )}
      {state && !state.ok && (
        <p role="alert" style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
          {ERROR_COPY[state.reason]}
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
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <label className="lmn-field" style={{ flex: 1, minWidth: 180 }}>
          <span className="lmn-field-label">Weekly clinic day</span>
          <select
            className="lmn-input"
            name="clinicDay"
            value={clinicDay}
            onChange={(e) => setClinicDay(e.target.value)}
          >
            <option value="">No weekly clinic</option>
            {CLINIC_DAYS.map((d) => (
              <option key={d} value={d}>
                {dayLabel(d)}
              </option>
            ))}
          </select>
          <span className="lmn-field-help">Shown as a weekly marker on every calendar.</span>
        </label>
        <Input
          label="Clinic time"
          name="clinicTime"
          type="time"
          value={clinicTime}
          onChange={(e) => setClinicTime(e.target.value)}
          style={{ flex: 1, minWidth: 140 }}
        />
      </div>
      <TextArea
        label="Clinic note (optional, clinic_text)"
        name="clinicText"
        rows={3}
        maxLength={MAX_CLINIC_TEXT}
        value={clinicText}
        onChange={(e) => setClinicText(e.target.value)}
        placeholder="Bring your kinetics questions."
      />
      <div>
        <SaveButton />
      </div>
    </form>
  );
}
