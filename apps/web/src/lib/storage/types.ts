/** Abstraktion för fillagring så att lokal disk (dev) kan bytas mot objektlagring (prod). */
export interface StoredObject {
  key: string;
  size: number;
}

export interface StorageService {
  /** Spara binärdata under `key`. Returnerar nyckel + storlek. */
  save(key: string, data: Buffer, contentType?: string): Promise<StoredObject>;
  /** Läs binärdata för `key`. Kastar om den saknas. */
  read(key: string): Promise<Buffer>;
  /** Ta bort en lagrad fil (idempotent). */
  delete(key: string): Promise<void>;
  /** Finns nyckeln? */
  exists(key: string): Promise<boolean>;
}
