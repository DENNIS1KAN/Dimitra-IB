import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { VideoPlayer } from "@/components/app/video-player";
import { BackLink } from "@/components/rts/learning";
import { getSessionUser } from "@/lib/auth";
import { logMaterialEvent } from "@/lib/material-access";
import { studentModuleDetail } from "@/lib/queries";
import { videoEmbed } from "@/lib/video";

// Embedded player (SPEC §7). Uploaded videos stream from this server's own
// storage through /api/materials, behind the login. A pasted link (SPEC §15.7
// #25) plays on its own service instead: as an in-page embed where the
// provider supports one, otherwise as an "Open video" step.
export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; materialId: string }>;
  /** `restart=1` is the Rewatch link: start from zero, keep the saved second. */
  searchParams: Promise<{ restart?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { id, materialId } = await params;
  const { restart } = await searchParams;
  const detail = await studentModuleDetail(id, user);
  if (!detail) notFound();
  const material = detail.materials.find((m) => m.id === materialId && m.type === "video");
  if (!material) notFound();

  // One 'view' per page visit; the bytes route deliberately skips video
  // views so range/preload requests don't inflate the events table. A link
  // video reports nothing back, so this visit is the whole of what we know
  // about it: the single Watch step, logged the moment it is opened.
  await logMaterialEvent(user.id, material.id, "view");

  // A stored video has no externalUrl; narrowing here keeps both branches honest.
  const externalUrl = material.externalUrl;
  const link = externalUrl ? videoEmbed(externalUrl) : null;
  // Resume at the highest position this student reached (SPEC §15.7 #27).
  // Rewatch passes restart=1, which starts from zero without erasing it.
  const saved = detail.signals.get(material.id)?.progress ?? 0;
  const startAt = restart === "1" ? 0 : saved;

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
        {externalUrl && link && !link.embedUrl ? (
          <OpenVideo url={externalUrl} provider={link.provider} />
        ) : (
          <div
            style={{
              background: "var(--surface-ink)",
              borderRadius: "var(--radius-cards)",
              overflow: "hidden",
              aspectRatio: "16 / 9",
            }}
          >
            {link?.embedUrl ? (
              <iframe
                src={link.embedUrl}
                title={material.title}
                style={{ width: "100%", height: "100%", border: 0 }}
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            ) : (
              <VideoPlayer
                src={`/api/materials/${material.id}`}
                materialId={material.id}
                startAt={startAt}
              />
            )}
          </div>
        )}
        {externalUrl && link?.embedUrl ? (
          // Only the embed needs an escape hatch: the Open video panel is
          // already nothing but the link.
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-caption)",
              letterSpacing: "var(--tracking-caption)",
              color: "var(--text-tertiary)",
            }}
          >
            This one is hosted on {link.provider}.{" "}
            <a href={externalUrl} target="_blank" rel="noopener noreferrer">
              Open it in a new tab
            </a>{" "}
            if it does not play here.
          </p>
        ) : externalUrl ? null : (
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-caption)",
              letterSpacing: "var(--tracking-caption)",
              color: "var(--text-tertiary)",
            }}
          >
            {startAt > 0 ? (
              <>
                Picking up at {clockOf(startAt)}.{" "}
                <Link href={`/app/modules/${id}/watch/${material.id}?restart=1`}>
                  Start from the beginning
                </Link>
                .
              </>
            ) : (
              <>
                If the video doesn&rsquo;t play yet, it may still be processing. Check
                back in a few minutes.
              </>
            )}
          </p>
        )}
      </div>
    </main>
  );
}

/** Seconds as "6:07": the label on the player's own scrubber. */
function clockOf(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${m}:${String(rest).padStart(2, "0")}`;
}

/** A host we cannot frame: offer the honest thing, a button to the video. */
function OpenVideo({ url, provider }: { url: string; provider: string }) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-cards)",
        padding: "28px 20px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-secondary)" }}>
        This video is hosted on {provider} and opens in a new tab.
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="lmn-btn lmn-btn-primary"
        style={{ fontSize: 15, padding: "11px 22px" }}
      >
        Open video
      </a>
    </div>
  );
}
