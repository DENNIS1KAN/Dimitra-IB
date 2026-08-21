// NOTE: no "server-only" here — the seed script imports this from plain Node.
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

// File storage behind one interface (SPEC §9): dev writes to ./storage,
// prod uses Bunny Storage via presigned-style URLs. The switch is purely
// env-driven (BUNNY_STORAGE_ZONE + BUNNY_STORAGE_API_KEY).

export interface FileStorage {
  /** Persist bytes under a key. */
  put(key: string, data: Buffer, contentType?: string): Promise<void>;
  /** Read bytes back (used for inline viewing and PDF stamping). */
  get(key: string): Promise<Buffer>;
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
