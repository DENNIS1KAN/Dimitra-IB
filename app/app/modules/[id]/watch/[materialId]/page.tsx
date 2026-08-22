import { notFound, redirect } from "next/navigation";
import { VideoPlayer } from "@/components/app/video-player";
import { BackLink } from "@/components/lumen/learning";
import { getSessionUser } from "@/lib/auth";
import { logMaterialEvent } from "@/lib/material-access";
import { studentModuleDetail } from "@/lib/queries";

// Embedded player (SPEC §7). Dev mode streams from ./storage; with Bunny
// Stream configured (M3), this renders the tokenized Bunny embed instead.
export default async function WatchPage({
  params,
}: {
  params: Promise<{ id: string; materialId: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id, materialId } = await params;
  const detail = await studentModuleDetail(id, user);
  if (!detail) notFound();
  const material = detail.materials.find((m) => m.id === materialId && m.type === "video");
  if (!material) notFound();

  // One 'view' per page visit — the bytes route deliberately skips video
  // views so range/preload requests don't inflate the events table.
  await logMaterialEvent(user.id, material.id, "view");

  const { bunnyConfigured, signedEmbedUrl } = await import("@/lib/video");
  const { isUuid } = await import("@/lib/validate");
  // Bunny Stream videos are stored by GUID; dropzone uploads land in file
  // storage under path-shaped keys (modules/…). Signing a path into the
  // embed would 404 inside the player, so those fall back to the local
  // player until they're migrated to Bunny Stream (M3 finishing step).
  const bunny = bunnyConfigured() && isUuid(material.storageKey);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <BackLink href={`/app/modules/${id}`} label={`Week ${detail.module.weekNumber}`} />
        <h1
          style={{
            margin: 0,
            fontSize: "var(--text-subheading)",
            fontWeight: 800,
            letterSpacing: "var(--tracking-subheading)",
          }}
        >
          {material.title}
        </h1>
        <div
          style={{
            background: "var(--color-charcoal-ink)",
            borderRadius: "var(--radius-cards)",
            overflow: "hidden",
            aspectRatio: "16 / 9",
          }}
        >
          {bunny ? (
            // Bunny embed with a signed short-TTL token (M3), built
            // server-side. Bunny tokens can't be session-bound, so the short
            // expiry is what makes a copied URL die quickly elsewhere.
            <iframe
              src={signedEmbedUrl(material.storageKey)}
              style={{ width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <VideoPlayer src={`/api/materials/${material.id}`} materialId={material.id} />
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-caption)",
            letterSpacing: "var(--tracking-caption)",
            color: "var(--text-tertiary)",
          }}
        >
          If the video doesn&rsquo;t play yet, it may still be processing — check
          back in a few minutes.
        </p>
      </div>
    </main>
  );
}
