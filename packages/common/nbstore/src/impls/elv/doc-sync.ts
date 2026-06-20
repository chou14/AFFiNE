import type { Connection, DocClock, DocClocks, DocSyncStorage } from '../..';
import { IndexedDBDocSyncStorage } from '../idb';
import type { ELVIDBStorageOptions } from './connection';
import { normalizeELVIDBOptions } from './connection';

export class ELVDocSyncStorage implements DocSyncStorage {
  static readonly identifier = 'ELVDocSyncStorage';

  private readonly inner: IndexedDBDocSyncStorage;

  constructor(options: ELVIDBStorageOptions) {
    this.inner = new IndexedDBDocSyncStorage(normalizeELVIDBOptions(options));
  }

  get connection(): Connection {
    return this.inner.connection;
  }

  readonly storageType = 'docSync';

  getPeerRemoteClock(peer: string, docId: string): Promise<DocClock | null> {
    return this.inner.getPeerRemoteClock(peer, docId);
  }

  getPeerRemoteClocks(peer: string): Promise<DocClocks> {
    return this.inner.getPeerRemoteClocks(peer);
  }

  setPeerRemoteClock(peer: string, clock: DocClock): Promise<void> {
    return this.inner.setPeerRemoteClock(peer, clock);
  }

  getPeerPulledRemoteClock(
    peer: string,
    docId: string
  ): Promise<DocClock | null> {
    return this.inner.getPeerPulledRemoteClock(peer, docId);
  }

  getPeerPulledRemoteClocks(peer: string): Promise<DocClocks> {
    return this.inner.getPeerPulledRemoteClocks(peer);
  }

  setPeerPulledRemoteClock(peer: string, clock: DocClock): Promise<void> {
    return this.inner.setPeerPulledRemoteClock(peer, clock);
  }

  getPeerPushedClock(peer: string, docId: string): Promise<DocClock | null> {
    return this.inner.getPeerPushedClock(peer, docId);
  }

  getPeerPushedClocks(peer: string): Promise<DocClocks> {
    return this.inner.getPeerPushedClocks(peer);
  }

  setPeerPushedClock(peer: string, clock: DocClock): Promise<void> {
    return this.inner.setPeerPushedClock(peer, clock);
  }

  clearClocks(): Promise<void> {
    return this.inner.clearClocks();
  }
}
