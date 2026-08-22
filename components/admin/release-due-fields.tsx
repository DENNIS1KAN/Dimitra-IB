"use client";

import { useState } from "react";
import { Input } from "@/components/lumen/forms";
import { defaultDueLocal } from "@/lib/tz";

// Release + due date inputs as a pair (SPEC §15.3): the due date defaults to
// the Sunday 23:59 after the release and follows the release until the tutor
// edits it herself. Both are datetime-local = the tutor's wall clock; the
// server converts with lib/tz in APP_TIMEZONE.
export function ReleaseDueFields({ release = "", due = "" }: { release?: string; due?: string }) {
  const [releaseValue, setReleaseValue] = useState(release);
  const [dueValue, setDueValue] = useState(due);
  const [dueTouched, setDueTouched] = useState(due !== "");
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <Input
        label="Release date & time"
        name="releaseDate"
        type="datetime-local"
        required
        value={releaseValue}
        onChange={(e) => {
          setReleaseValue(e.target.value);
          if (!dueTouched) setDueValue(defaultDueLocal(e.target.value));
        }}
        style={{ flex: 1, minWidth: 200 }}
      />
      <Input
        label="Due (soft deadline — empty for none)"
        name="dueDate"
        type="datetime-local"
        value={dueValue}
        onChange={(e) => {
          setDueTouched(true);
          setDueValue(e.target.value);
        }}
        helper={dueTouched ? undefined : "Defaults to the Sunday 23:59 after release"}
        style={{ flex: 1, minWidth: 200 }}
      />
    </div>
  );
}
