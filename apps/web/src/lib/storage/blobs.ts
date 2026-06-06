import type { StorageService, StoredObject } from "./types";

/**
 * Netlify Blobs-lagring för produktion (serverless-disk är inte beständig).
 * Importeras lazy så att @netlify/blobs bara laddas när STORAGE_DRIVER=blobs.
 */
export class NetlifyBlobsStorage implements StorageService {
  constructor(private readonly storeName: string = "byggkalkyl-uploads") {}

  private async store() {
    const { getStore } = await import("@netlify/blobs");
    return getStore(this.storeName);
  }

  async save(key: string, data: Buffer): Promise<StoredObject> {
    const store = await this.store();
    const arrayBuffer = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength,
    ) as ArrayBuffer;
    await store.set(key, arrayBuffer);
    return { key, size: data.byteLength };
  }

  async read(key: string): Promise<Buffer> {
    const store = await this.store();
    const ab = await store.get(key, { type: "arrayBuffer" });
    if (!ab) throw new Error(`Blob saknas: ${key}`);
    return Buffer.from(ab as ArrayBuffer);
  }

  async delete(key: string): Promise<void> {
    const store = await this.store();
    await store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    const store = await this.store();
    const meta = await store.getMetadata(key);
    return meta != null;
  }
}
