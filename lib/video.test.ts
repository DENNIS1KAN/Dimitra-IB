import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { bunnyEmbedToken, bunnyUploadSignature } from "./video";

describe("Bunny token signing", () => {
  it("embed token = sha256(token_key + video_id + expires)", () => {
    const expected = createHash("sha256")
      .update("secret-keyvideo-guid1700000000")
      .digest("hex");
    expect(bunnyEmbedToken("secret-key", "video-guid", 1700000000)).toBe(expected);
  });

  it("upload signature = sha256(library + api_key + expires + video_id)", () => {
    const expected = createHash("sha256").update("123apikey1700000000guid").digest("hex");
    expect(bunnyUploadSignature("123", "apikey", "guid", 1700000000)).toBe(expected);
  });

  it("tokens differ per video and expiry (no reuse across videos)", () => {
    expect(bunnyEmbedToken("k", "a", 1)).not.toBe(bunnyEmbedToken("k", "b", 1));
    expect(bunnyEmbedToken("k", "a", 1)).not.toBe(bunnyEmbedToken("k", "a", 2));
  });
});
