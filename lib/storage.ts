// NOTE: no "server-only" here — the seed script imports this from plain Node.
import { createHash } from "node:crypto";
import { mkdir, open, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// File storage behind one interface (SPEC §9): dev writes to ./storage,
// prod uses Bunny Storage via presigned-style URLs. The switch is purely
// env-driven (BUNNY_STORAGE_ZONE + BUNNY_STORAGE_API_KEY).

export interface FileStorage {
  /** Persist bytes under a key. */
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  /** Read bytes back (used for inline viewing and PDF stamping). */
  get(key: string): Promise<Buffer>;
  /** Object size in bytes (video range requests need it without a full read). */
  size(key: string): Promise<number>;
  /** Read just [start, end] (inclusive) — a video seek must not buffer the whole file. */
  getRange(key: string, start: number, end: number): Promise<Buffer>;
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
    const fd = await open(safe(key), "r");
    try {
      const length = end - start + 1;
      const { buffer, bytesRead } = await fd.read(Buffer.alloc(length), 0, length, start);
      return bytesRead === length ? buffer : buffer.subarray(0, bytesRead);
    } finally {
      await fd.close();
    }
  }
  async delete(key: string) {
    await unlink(safe(key)).catch(() => {});
  }
}

class BunnyStorage implements FileStorage {
  private base: string;
  constructor(
    private zone: string,
    private apiKey: string,
    region = process.env.BUNNY_STORAGE_REGION ?? "",
  ) {
    const host = region ? `${region}.storage.bunnycdn.com` : "storage.bunnycdn.com";
    this.base = `https://${host}/${zone}`;
  }
  private headers() {
    return { AccessKey: this.apiKey };
  }
  async put(key: string, data: Buffer, contentType = "application/octet-stream") {
    const res = await fetch(`${this.base}/${key}`, {
      method: "PUT",
      headers: { ...this.headers(), "Content-Type": contentType },
      body: new Uint8Array(data),
    });
    if (!res.ok) throw new Error(`bunny put failed: ${res.status}`);
  }
  async get(key: string) {
    const res = await fetch(`${this.base}/${key}`, { headers: this.headers() });
    if (!res.ok) throw new Error(`bunny get failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  async size(key: string) {
    const res = await fetch(`${this.base}/${key}`, { method: "HEAD", headers: this.headers() });
    const length = Number(res.headers.get("content-length"));
    if (!res.ok || !Number.isFinite(length)) throw new Error(`bunny head failed: ${res.status}`);
    return length;
  }
  async getRange(key: string, start: number, end: number) {
    const res = await fetch(`${this.base}/${key}`, {
      headers: { ...this.headers(), Range: `bytes=${start}-${end}` },
    });
    if (!res.ok) throw new Error(`bunny range get failed: ${res.status}`);
    const body = Buffer.from(await res.arrayBuffer());
    // 206 = the requested slice; 200 = Range ignored, slice it ourselves.
    return res.status === 206 ? body : body.subarray(start, end + 1);
  }
  async delete(key: string) {
    await fetch(`${this.base}/${key}`, { method: "DELETE", headers: this.headers() });
  }
}

export const storage: FileStorage =
  process.env.BUNNY_STORAGE_ZONE && process.env.BUNNY_STORAGE_API_KEY
    ? new BunnyStorage(process.env.BUNNY_STORAGE_ZONE, process.env.BUNNY_STORAGE_API_KEY)
    : new LocalStorage();

export const storageKeyFor = (moduleId: string, filename: string) => {
  const stem = createHash("sha1").update(`${moduleId}:${filename}:${Date.now()}`).digest("hex").slice(0, 12);
  const ext = path.extname(filename).toLowerCase();
  return `modules/${moduleId}/${stem}${ext}`;
};
