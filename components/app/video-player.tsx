"use client";

import { useEffect, useRef } from "react";

// Local-storage video player with progress capture: logs seconds watched on
// play, every 30s while playing, and on pause/end (SPEC §10 M4).
export function VideoPlayer({ src, materialId }: { src: string; materialId: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const log = () => {
      void fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId, value: Math.floor(video.currentTime) }),
        keepalive: true,
      }).catch(() => {});
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

    video.addEventListener("play", start);
    video.addEventListener("pause", stop);
    video.addEventListener("ended", stop);
    return () => {
      if (timer) clearInterval(timer);
      video.removeEventListener("play", start);
      video.removeEventListener("pause", stop);
      video.removeEventListener("ended", stop);
    };
  }, [materialId]);

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
