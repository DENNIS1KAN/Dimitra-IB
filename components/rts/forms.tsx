// Road to Success form fields: exact recipes from DESIGN.md §5.
import type { CSSProperties, InputHTMLAttributes, TextareaHTMLAttributes } from "react";

export function Input({
  label,
  helper,
  error = false,
  style,
  ...rest
}: {
  label?: string;
  helper?: string;
  error?: boolean;
  style?: CSSProperties;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`lmn-field${error ? " lmn-field-error" : ""}`} style={style}>
      {label && <span className="lmn-field-label">{label}</span>}
      <input className="lmn-input" {...rest} />
      {helper && <span className="lmn-field-help">{helper}</span>}
    </label>
  );
}

export function TextArea({
  label,
  style,
  ...rest
}: { label?: string; style?: CSSProperties } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label
      style={{ display: "flex", flexDirection: "column", gap: 8, fontFamily: "var(--font-sans)", ...style }}
    >
      {label && (
        <span
          style={{
            fontSize: "var(--text-body-sm)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-body-sm)",
          }}
        >
          {label}
        </span>
      )}
      <textarea className="lmn-textarea" {...rest} />
    </label>
  );
}
