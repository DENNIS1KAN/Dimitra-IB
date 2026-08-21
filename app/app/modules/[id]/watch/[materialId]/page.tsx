import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/lumen/learning";
import { getSessionUser } from "@/lib/auth";
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

  const bunny = !!process.env.BUNNY_STREAM_LIBRARY_ID;

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <TopBar title={material.title} backHref={`/app/modules/${id}`} />
      <div style={{ padding: "4px 20px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
        <div
          style={{
            background: "var(--color-charcoal-ink)",
            borderRadius: "var(--radius-cards)",
            overflow: "hidden",
            aspectRatio: "16 / 9",
          }}
        >
          {bunny ? (
            // Bunny embed with signed token (M3): src built server-side.
            <iframe
              src={`https://iframe.mediadelivery.net/embed/${process.env.BUNNY_STREAM_LIBRARY_ID}/${material.storageKey}`}
              style={{ width: "100%", height: "100%", border: 0 }}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              controls
              playsInline
              preload="metadata"
              style={{ width: "100%", height: "100%", display: "block" }}
              src={`/api/materials/${material.id}`}
              data-material-id={material.id}
            />
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
