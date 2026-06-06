import path from "path";

import { LocalDiskStorage } from "./local";
import { NetlifyBlobsStorage } from "./blobs";
import type { StorageService } from "./types";

export type { StorageService, StoredObject } from "./types";

let cached: StorageService | null = null;

/**
 * Returnerar konfigurerad StorageService enligt `STORAGE_DRIVER`.
 *  - local : lokal disk under STORAGE_DIR (dev/MVP, default)
 *  - blobs : Netlify Blobs (prod) – TODO Steg 6
 *  - s3    : S3/R2 (prod) – TODO Steg 6
 */
export function getStorage(): StorageService {
  if (cached) return cached;

  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();

  switch (driver) {
    case "local": {
      const dir = process.env.STORAGE_DIR ?? "./storage";
      const base = path.isAbsolute(dir) ? dir : path.join(process.cwd(), dir);
      cached = new LocalDiskStorage(base);
      return cached;
    }
    case "blobs":
      // Produktion på Netlify – beständig objektlagring.
      cached = new NetlifyBlobsStorage(process.env.BLOBS_STORE || "byggkalkyl-uploads");
      return cached;
    case "s3":
      // TODO (Steg 6): implementera S3Storage med @aws-sdk/client-s3 + S3_*-env.
      throw new Error(
        "STORAGE_DRIVER=s3: S3/R2 är inte implementerat ännu (planeras i Steg 6).",
      );
    default:
      throw new Error(`Okänd STORAGE_DRIVER: "${driver}"`);
  }
}
