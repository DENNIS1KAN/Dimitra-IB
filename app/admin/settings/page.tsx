import { SettingsForm } from "@/components/admin/settings-form";
import { Card } from "@/components/lumen/core";
import { requireAdmin } from "@/lib/admin";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "../actions";

// /admin/settings: booking_url, clinic note, clinic day and time (SPEC §15.5).
export default async function AdminSettings() {
  await requireAdmin();
  const initial = await getSettings();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-heading-sm)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-heading-sm)",
        }}
      >
        Settings
      </h1>
      <Card padding="20px">
        <SettingsForm action={saveSettings} initial={initial} />
      </Card>
    </div>
  );
}
