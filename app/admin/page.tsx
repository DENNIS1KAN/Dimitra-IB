// Students table (SPEC §7) — filled out in M2.
export default function AdminHome() {
  return (
    <div>
      <h1
        style={{
          margin: "0 0 8px",
          fontSize: "var(--text-heading-sm)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-heading-sm)",
        }}
      >
        Students
      </h1>
      <p style={{ margin: 0, color: "var(--text-tertiary)", fontSize: "var(--text-body-sm)" }}>
        Coming in M2: students table with active toggle, last seen, and invites.
      </p>
    </div>
  );
}
