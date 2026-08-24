import { PasswordForm } from "@/components/app/password-form";
import { Card } from "@/components/lumen/core";
import { requireStudent } from "@/lib/student";
import { changePassword } from "../actions";

// /app/account: who I am + change my own password (SPEC §15.4).
export default async function AccountPage() {
  const user = await requireStudent();

  const row = (label: string, value: string) => (
    <div style={{ display: "flex", gap: 12, fontSize: "var(--text-body-sm)" }}>
      <span style={{ width: 96, flexShrink: 0, color: "var(--text-tertiary)" }}>{label}</span>
      <span style={{ fontWeight: 500, overflowWrap: "anywhere" }}>{value}</span>
    </div>
  );

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "var(--text-heading)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-heading)",
            lineHeight: 1.2,
          }}
        >
          Account
        </h1>

        <Card padding="20px">
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {row("Name", user.name)}
            {row("Username", user.username)}
            {row("Email", user.email)}
          </div>
          <p style={{ margin: "12px 0 0", fontSize: "var(--text-caption)", color: "var(--text-tertiary)" }}>
            To change any of these, ask Dimitra.
          </p>
        </Card>

        <Card padding="20px">
          <h2
            style={{
              margin: "0 0 12px",
              fontSize: "var(--text-body-sm)",
              fontWeight: 700,
              letterSpacing: "var(--tracking-body-sm)",
            }}
          >
            Change password
          </h2>
          <PasswordForm action={changePassword} />
        </Card>
      </div>
    </main>
  );
}
