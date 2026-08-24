"use client";

import { useEffect, useRef } from "react";

// Local-storage video player with progress capture: logs seconds watched on
// play, every 30s while playing, and on pause/end (SPEC §10 M4). Since M13
// (SPEC §15.7 #27) it also reports the video's length once, and starts at
// the position the student left off, so Resume is exact rather than close.
export function VideoPlayer({
  src,
  materialId,
  startAt = 0,
}: {
  src: string;
  materialId: string;
  /** Saved position in whole seconds; 0 starts from the beginning. */
  startAt?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    // Sent with the first event of this visit only: the column is written
    // once server-side, so repeating it every 30 seconds would be noise.
    let duration: number | null = null;

    const log = () => {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId,
          value: Math.floor(video.currentTime),
          ...(duration !== null ? { duration } : {}),
        }),
        keepalive: true,
      }).catch(() => {});
      duration = null;
    };
    const start = () => {
      log();
      timer ??= setInterval(log, 30_000);
    };
    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      log();
    };
    // Metadata carries both facts this needs: how long the file is, and
    // whether seeking to the saved second is possible at all.
    const onMetadata = () => {
      if (Number.isFinite(video.duration) && video.duration > 0) duration = video.duration;
      if (startAt > 0 && startAt < video.duration) video.currentTime = startAt;
    };

    if (video.readyState >= 1) onMetadata();
    video.addEventListener("loadedmetadata", onMetadata);
    video.addEventListener("play", start);
    video.addEventListener("pause", stop);
    video.addEventListener("ended", stop);
    return () => {
      if (timer) clearInterval(timer);
      video.removeEventListener("loadedmetadata", onMetadata);
      video.removeEventListener("play", start);
      video.removeEventListener("pause", stop);
      video.removeEventListener("ended", stop);
    };
  }, [materialId, startAt]);

  return (
    <video
      ref={ref}
      controls
      playsInline
      preload="metadata"
      style={{ width: "100%", height: "100%", display: "block" }}
      src={src}
    />
  );
}
