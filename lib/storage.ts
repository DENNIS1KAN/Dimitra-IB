// NOTE: no "server-only" here — the seed script imports this from plain Node.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";

// File storage behind one interface (SPEC §9). Since SPEC §15.7 #25 there is
// one implementation: the server's own disk under ./storage, served to
// signed-in students through /api/materials. The interface stays because it is
// the seam a future object store would slot into without touching callers.

export interface FileStorage {
  /** Persist bytes under a key. */
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  /** Read bytes back (used for inline viewing and PDF stamping). */
  get(key: string): Promise<Buffer>;
  /** Object size in bytes (video range requests need it without a full read). */
  size(key: string): Promise<number>;
  /**
   * Stream just [start, end] (inclusive). A seek reads its slice at a file
   * offset and streams it out, so serving a 2 GB video costs one small buffer
   * per request instead of 2 GB of RSS — the whole file is never read.
   */
  getRange(key: string, start: number, end: number): Promise<ReadableStream<Uint8Array>>;
  /** Remove a stored object (account deletion = user row + their files). */
  delete(key: string): Promise<void>;
}

const STORAGE_ROOT = path.join(process.cwd(), "storage");

const safe = (key: string) => {
  const p = path.normalize(key).replace(/^([/\\.])+/, "");
  if (p.includes("..")) throw new Error(`unsafe storage key: ${key}`);
  return path.join(STORAGE_ROOT, p);
};

class LocalStorage implements FileStorage {
  async put(key: string, data: Buffer) {
    const file = safe(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data);
  }
  async get(key: string) {
    return readFile(safe(key));
  }
  async size(key: string) {
    return (await stat(safe(key))).size;
  }
  async getRange(key: string, start: number, end: number) {
    const file = safe(key);
    // stat first: createReadStream reports a missing file asynchronously, and
    // the route needs to answer 404 before it has started a 206.
    await stat(file);
    const node = createReadStream(file, { start, end });
    return Readable.toWeb(node) as ReadableStream<Uint8Array>;
  }
  async delete(key: string) {
    await unlink(safe(key)).catch(() => {});
  }
}

export const storage: FileStorage = new LocalStorage();

export const storageKeyFor = (moduleId: string, filename: string) => {
  const stem = createHash("sha1").update(`${moduleId}:${filename}:${Date.now()}`).digest("hex").slice(0, 12);
  const ext = path.extname(filename).toLowerCase();
  return `modules/${moduleId}/${stem}${ext}`;
};
