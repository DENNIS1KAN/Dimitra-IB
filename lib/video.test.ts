import { describe, expect, it } from "vitest";
import { validateVideoUrl, videoEmbed } from "./video";

describe("validateVideoUrl", () => {
  it("accepts an absolute https link", () => {
    expect(validateVideoUrl("https://www.loom.com/share/abc12345")).toEqual({
      ok: true,
      url: "https://www.loom.com/share/abc12345",
    });
  });

  it("accepts http as well, and trims", () => {
    expect(validateVideoUrl("  http://videos.example.gr/week3.mp4  ")).toEqual({
      ok: true,
      url: "http://videos.example.gr/week3.mp4",
    });
  });

  it("empty is empty, not an error to show", () => {
    expect(validateVideoUrl("")).toEqual({ ok: false, reason: "empty" });
    expect(validateVideoUrl("   ")).toEqual({ ok: false, reason: "empty" });
    expect(validateVideoUrl(undefined)).toEqual({ ok: false, reason: "empty" });
  });

  it("refuses anything that is not an absolute web link", () => {
    for (const bad of [
      "loom.com/share/abc12345",
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///Users/dim/week3.mp4",
      "//loom.com/share/abc12345",
      "https://",
    ]) {
      expect(validateVideoUrl(bad), bad).toEqual({ ok: false, reason: "invalid-url" });
    }
  });
});

describe("videoEmbed: YouTube", () => {
  it("a watch link becomes a no-cookie embed", () => {
    expect(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toEqual({
      provider: "YouTube",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    });
  });

  it("youtu.be, /embed, /shorts and /live all resolve to the same player", () => {
    for (const url of [
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://m.youtube.com/live/dQw4w9WgXcQ",
    ]) {
      expect(videoEmbed(url).embedUrl, url).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    }
  });

  it("extra query parameters do not follow the id into the embed", () => {
    expect(videoEmbed("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL123&t=90").embedUrl).toBe(
      "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
    );
  });

  it("a YouTube link with no video in it stays an Open video step", () => {
    expect(videoEmbed("https://www.youtube.com/")).toEqual({ provider: "YouTube", embedUrl: null });
    expect(videoEmbed("https://www.youtube.com/watch?v=%22%3E%3Cscript%3E")).toEqual({
      provider: "YouTube",
      embedUrl: null,
    });
  });
});

describe("videoEmbed: Loom and Google Drive", () => {
  it("a Loom share link becomes its embed", () => {
    expect(videoEmbed("https://www.loom.com/share/9f8e7d6c5b4a")).toEqual({
      provider: "Loom",
      embedUrl: "https://www.loom.com/embed/9f8e7d6c5b4a",
    });
  });

  it("a Loom folder link is not a video", () => {
    expect(videoEmbed("https://www.loom.com/looks/videos")).toEqual({ provider: "Loom", embedUrl: null });
  });

  it("a Drive file link becomes its preview player", () => {
    expect(videoEmbed("https://drive.google.com/file/d/1A2b3C4d5E6f/view?usp=sharing")).toEqual({
      provider: "Google Drive",
      embedUrl: "https://drive.google.com/file/d/1A2b3C4d5E6f/preview",
    });
  });

  it("a Drive folder link is not a video", () => {
    expect(videoEmbed("https://drive.google.com/drive/folders/1A2b3C4d5E6f")).toEqual({
      provider: "Google Drive",
      embedUrl: null,
    });
  });
});

describe("videoEmbed: everything else", () => {
  it("an unknown host is named and offered as a link, never framed", () => {
    expect(videoEmbed("https://videos.example.gr/week3.mp4")).toEqual({
      provider: "videos.example.gr",
      embedUrl: null,
    });
  });

  it("www is not part of the name we show", () => {
    expect(videoEmbed("https://www.example.gr/week3").provider).toBe("example.gr");
  });

  it("a value that is not a web link at all yields no embed", () => {
    expect(videoEmbed("javascript:alert(1)")).toEqual({ provider: "video", embedUrl: null });
    expect(videoEmbed("")).toEqual({ provider: "video", embedUrl: null });
  });
});
