"use client";

import type { CSSProperties, ReactNode } from "react";

// Submit button with a native confirm() gate, for destructive one-click
// admin forms (material delete removes the file and its event history;
// there is no undo). Styled like Button size="sm".
export function ConfirmSubmit({
  message,
  variant = "ghost",
  children,
  style,
}: {
  message: string;
  variant?: "primary" | "dark" | "secondary" | "ghost";
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <button
      type="submit"
      className={`lmn-btn lmn-btn-${variant}`}
      style={{ fontSize: "14px", padding: "8px 16px", ...style }}
      onClick={(e) => {
        if (!confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
