import type {
  Connection,
  CrawlResult,
  DocClock,
  DocClocks,
  DocDiff,
  DocRecord,
  DocStorage,
  DocUpdate,
} from '../..';
import { IndexedDBDocStorage } from '../idb';
import type { ELVIDBStorageOptions } from './connection';
import { normalizeELVIDBOptions } from './connection';

export class ELVDocStorage implements DocStorage {
  static readonly identifier = 'ELVDocStorage';

  private readonly inner: IndexedDBDocStorage;

  constructor(options: ELVIDBStorageOptions) {
    this.inner = new IndexedDBDocStorage(normalizeELVIDBOptions(options));
  }

  get connection(): Connection {
    return this.inner.connection;
  }

  get isReadonly(): boolean {
    return this.inner.isReadonly;
  }

  get spaceId(): string {
    return this.inner.spaceId;
  }

  readonly storageType = 'doc';

  getDoc(docId: string): Promise<DocRecord | null> {
    return this.inner.getDoc(docId);
  }

  getDocDiff(docId: string, state?: Uint8Array): Promise<DocDiff | null> {
    return this.inner.getDocDiff(docId, state);
  }

  pushDocUpdate(update: DocUpdate, origin?: string): Promise<DocClock> {
    return this.inner.pushDocUpdate(update, origin);
  }

  getDocTimestamp(docId: string): Promise<DocClock | null> {
    return this.inner.getDocTimestamp(docId);
  }

  getDocTimestamps(after?: Date): Promise<DocClocks> {
    return this.inner.getDocTimestamps(after);
  }

  deleteDoc(docId: string): Promise<void> {
    return this.inner.deleteDoc(docId);
  }

  subscribeDocUpdate(
    callback: (update: DocRecord, origin?: string) => void
  ): () => void {
    return this.inner.subscribeDocUpdate(callback);
  }

  crawlDocData(docId: string): Promise<CrawlResult | null> {
    return this.inner.crawlDocData(docId);
  }
}
