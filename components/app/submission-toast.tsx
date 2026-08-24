"use client";

import { useEffect, useState } from "react";
import { Toast } from "@/components/rts/learning";

const FLAG = "rts-attempt-sent";
const EVENT = "rts:attempt-sent";

export function markAttemptSent() {
  try {
    sessionStorage.setItem(FLAG, "1");
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT));
}

// Rendered by the module page in both locked and unlocked states, so the
// success toast survives the server-component refresh that unlocks the
// solutions (the submit sheet itself unmounts at that moment). Listens for
// the in-page event (router.refresh keeps this component mounted) and falls
// back to the sessionStorage flag on a full navigation.
export function SubmissionToastListener() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const trigger = () => {
      try {
        sessionStorage.removeItem(FLAG);
      } catch {}
      setShow(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setShow(false), 2600);
    };

    try {
      if (sessionStorage.getItem(FLAG)) trigger();
    } catch {}
    window.addEventListener(EVENT, trigger);
    return () => {
      window.removeEventListener(EVENT, trigger);
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        left: 16,
        right: 16,
        zIndex: 60,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Toast message="Attempt sent to Dimitra" detail="Solutions are unlocked below" />
    </div>
  );
}
