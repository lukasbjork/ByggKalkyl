import { promises as fs } from "fs";
import path from "path";

import type { StorageService, StoredObject } from "./types";

/** Lagrar filer på lokal disk under en baskatalog (dev/MVP). */
export class LocalDiskStorage implements StorageService {
  constructor(private readonly baseDir: string) {}

  /** Översätt en lagringsnyckel till en säker filsökväg (skydd mot path traversal). */
  private resolve(key: string): string {
    const safe = key
      .split(/[\\/]+/)
      .filter((seg) => seg && seg !== ".." && seg !== ".")
      .join(path.sep);
    return path.join(this.baseDir, safe);
  }

  async save(key: string, data: Buffer): Promise<StoredObject> {
    const fp = this.resolve(key);
    await fs.mkdir(path.dirname(fp), { recursive: true });
    await fs.writeFile(fp, data);
    return { key, size: data.byteLength };
  }

  async read(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async delete(key: string): Promise<void> {
    await fs.rm(this.resolve(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }
}
