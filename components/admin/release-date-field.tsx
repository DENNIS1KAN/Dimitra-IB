"use client";

import { useState } from "react";
import { parseDdMmYyyy } from "@/lib/tz";

// Release day as plain dd/mm/yyyy text (SPEC §15.7 #15): no native date
// widget, and the release time is fixed at 09:00 in the tutor's timezone.
// Empty or impossible entries surface a friendly inline message; the
// browser's own validation popup is suppressed. The server action re-parses
// with the same rule, so nothing depends on this script running.
export function ReleaseDateField({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  const [message, setMessage] = useState<string | null>(null);
  return (
    <label className={`lmn-field${message ? " lmn-field-error" : ""}`} style={{ maxWidth: 240 }}>
      <span className="lmn-field-label">Release day (dd/mm/yyyy)</span>
      <input
        className="lmn-input"
        name="releaseDay"
        inputMode="numeric"
        autoComplete="off"
        placeholder="07/09/2026"
        required
        pattern="\d{2}/\d{2}/\d{4}"
        value={value}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          const valid = parseDdMmYyyy(next) !== null;
          e.target.setCustomValidity(valid ? "" : "invalid");
          if (valid) setMessage(null);
        }}
        onInvalid={(e) => {
          e.preventDefault();
          setMessage(
            e.currentTarget.value.trim()
              ? "That date does not look right. Please use day/month/year, like 07/09/2026."
              : "Please add the release day, like 07/09/2026.",
          );
        }}
      />
      <span className="lmn-field-help" {...(message ? { role: "alert" } : {})}>
        {message ?? "Modules unlock at 09:00 Athens time on this day."}
      </span>
    </label>
  );
}
