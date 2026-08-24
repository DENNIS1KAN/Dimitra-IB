import { randomBytes } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Spy on the two ways this module could read a file, so the test can prove
// which one a range read takes: an offset stream, never readFile.
vi.mock("node:fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs")>();
  return { ...actual, createReadStream: vi.fn(actual.createReadStream) };
});
vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, readFile: vi.fn(actual.readFile) };
});

const fs = await import("node:fs");
const fsp = await import("node:fs/promises");
const { storage, storageKeyFor } = await import("./storage");

const createReadStreamSpy = vi.mocked(fs.createReadStream);
const readFileSpy = vi.mocked(fsp.readFile);

// A few megabytes: big enough that "read the whole thing" and "read the slice"
// are visibly different operations, small enough to stay a fast unit test.
const SIZE = 3 * 1024 * 1024 + 7;
const KEY = "range-test/sample.bin";
const bytes = randomBytes(SIZE);

async function collect(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const chunks: Uint8Array[] = [];
  const reader = stream.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

beforeAll(async () => {
  await storage.put(KEY, bytes);
});

afterAll(async () => {
  await rm(path.join(process.cwd(), "storage", "range-test"), { recursive: true, force: true });
});

describe("LocalStorage.getRange", () => {
  it("returns exactly the requested slice, inclusive of both ends", async () => {
    const body = await collect(await storage.getRange(KEY, 1000, 1999));
    expect(body.length).toBe(1000);
    expect(body.equals(bytes.subarray(1000, 2000))).toBe(true);
  });

  it("reads at an offset instead of reading the whole file", async () => {
    createReadStreamSpy.mockClear();
    readFileSpy.mockClear();
    await collect(await storage.getRange(KEY, 2_000_000, 2_000_255));
    expect(readFileSpy).not.toHaveBeenCalled();
    expect(createReadStreamSpy).toHaveBeenCalledTimes(1);
    expect(createReadStreamSpy.mock.calls[0][1]).toMatchObject({
      start: 2_000_000,
      end: 2_000_255,
    });
  });

  it("a one-byte slice deep in the file costs one byte", async () => {
    const body = await collect(await storage.getRange(KEY, SIZE - 1, SIZE - 1));
    expect(body.length).toBe(1);
    expect(body[0]).toBe(bytes[SIZE - 1]);
  });

  it("the first slice a player asks for matches the head of the file", async () => {
    const body = await collect(await storage.getRange(KEY, 0, 0));
    expect(body[0]).toBe(bytes[0]);
  });

  it("an end past the last byte yields only what exists", async () => {
    const body = await collect(await storage.getRange(KEY, SIZE - 10, SIZE + 5000));
    expect(body.length).toBe(10);
    expect(body.equals(bytes.subarray(SIZE - 10))).toBe(true);
  });

  it("a missing key rejects before any bytes are streamed", async () => {
    await expect(storage.getRange("range-test/not-here.bin", 0, 10)).rejects.toThrow();
  });
});

describe("LocalStorage.get and size", () => {
  it("size reports the stored length without reading the bytes", async () => {
    expect(await storage.size(KEY)).toBe(SIZE);
  });

  it("get round-trips the whole object", async () => {
    expect((await storage.get(KEY)).equals(bytes)).toBe(true);
  });
});

describe("storage keys", () => {
  it("keeps the extension and scopes the key to its module", () => {
    const key = storageKeyFor("11111111-1111-1111-1111-111111111111", "Week 3 lesson.MP4");
    expect(key.startsWith("modules/11111111-1111-1111-1111-111111111111/")).toBe(true);
    expect(key.endsWith(".mp4")).toBe(true);
  });

  it("cannot be walked out of the storage root", async () => {
    // Keys are server-generated, but the guard is what makes that safe to
    // assume: a traversal attempt lands inside ./storage or throws, never on
    // the wider filesystem.
    createReadStreamSpy.mockClear();
    for (const key of ["../../etc/passwd", "/etc/passwd", "a/../../../etc/passwd"]) {
      await expect(storage.get(key)).rejects.toThrow();
      await expect(storage.getRange(key, 0, 10)).rejects.toThrow();
    }
    const root = path.join(process.cwd(), "storage") + path.sep;
    for (const call of createReadStreamSpy.mock.calls) {
      expect(String(call[0]).startsWith(root)).toBe(true);
    }
  });
});
