import type { BlobSyncStorage, Connection } from '../..';
import { IndexedDBBlobSyncStorage } from '../idb';
import type { ELVIDBStorageOptions } from './connection';
import { normalizeELVIDBOptions } from './connection';

export class ELVBlobSyncStorage implements BlobSyncStorage {
  static readonly identifier = 'ELVBlobSyncStorage';

  private readonly inner: IndexedDBBlobSyncStorage;

  constructor(options: ELVIDBStorageOptions) {
    this.inner = new IndexedDBBlobSyncStorage(normalizeELVIDBOptions(options));
  }

  get connection(): Connection {
    return this.inner.connection;
  }

  readonly storageType = 'blobSync';

  setBlobUploadedAt(
    peer: string,
    blobId: string,
    uploadedAt: Date | null
  ): Promise<void> {
    return this.inner.setBlobUploadedAt(peer, blobId, uploadedAt);
  }

  getBlobUploadedAt(peer: string, blobId: string): Promise<Date | null> {
    return this.inner.getBlobUploadedAt(peer, blobId);
  }
}
