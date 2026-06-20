import type {
  BlobRecord,
  BlobStorage,
  Connection,
  ListedBlobRecord,
} from '../..';
import { IndexedDBBlobStorage } from '../idb';
import type { ELVIDBStorageOptions } from './connection';
import { normalizeELVIDBOptions } from './connection';

export class ELVBlobStorage implements BlobStorage {
  static readonly identifier = 'ELVBlobStorage';

  private readonly inner: IndexedDBBlobStorage;

  constructor(options: ELVIDBStorageOptions) {
    this.inner = new IndexedDBBlobStorage(normalizeELVIDBOptions(options));
  }

  get connection(): Connection {
    return this.inner.connection;
  }

  get isReadonly(): boolean {
    return this.inner.isReadonly;
  }

  readonly storageType = 'blob';

  get(key: string, _signal?: AbortSignal): Promise<BlobRecord | null> {
    return this.inner.get(key);
  }

  set(blob: BlobRecord, _signal?: AbortSignal): Promise<void> {
    return this.inner.set(blob);
  }

  delete(
    key: string,
    permanently: boolean,
    _signal?: AbortSignal
  ): Promise<void> {
    return this.inner.delete(key, permanently);
  }

  release(_signal?: AbortSignal): Promise<void> {
    return this.inner.release();
  }

  list(_signal?: AbortSignal): Promise<ListedBlobRecord[]> {
    return this.inner.list();
  }
}
