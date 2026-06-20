import { toArrayBuffer } from '@affine/core/utils/array-buffer';
import { DebugLogger } from '@affine/debug';
import {
  type BlobStorage,
  type DocStorage,
  type ListedBlobRecord,
  universalId,
} from '@affine/nbstore';
import {
  ELVBlobStorage,
  ELVBlobSyncStorage,
  ELVDocStorage,
  ELVDocSyncStorage,
} from '@affine/nbstore/elv';
import {
  IndexedDBIndexerStorage,
  IndexedDBIndexerSyncStorage,
} from '@affine/nbstore/idb';
import {
  SqliteBlobStorage,
  SqliteBlobSyncStorage,
  SqliteDocStorage,
  SqliteDocSyncStorage,
  SqliteIndexerStorage,
  SqliteIndexerSyncStorage,
} from '@affine/nbstore/sqlite';
import type { WorkerInitOptions } from '@affine/nbstore/worker/client';
import type { FrameworkProvider } from '@toeverything/infra';
import { LiveData, Service } from '@toeverything/infra';
import { isEqual } from 'lodash-es';
import { nanoid } from 'nanoid';
import { Observable } from 'rxjs';
import { Doc as YDoc, encodeStateAsUpdate } from 'yjs';

import { DesktopApiService } from '../../desktop-api';
import type {
  WorkspaceFlavourProvider,
  WorkspaceFlavoursProvider,
  WorkspaceMetadata,
  WorkspaceProfileInfo,
} from '../../workspace';
import { WorkspaceImpl } from '../../workspace/impls/workspace';
import { getWorkspaceProfileWorker } from './out-worker';
import {
  dedupeWorkspaceIds,
  normalizeWorkspaceIds,
} from './workspace-id-utils';

export const ELV_WORKSPACE_LOCAL_STORAGE_KEY = 'affine-elv-workspace';
export const ELV_WORKSPACE_GLOBAL_STATE_KEY =
  'workspace-engine:elv-workspace-ids:v1';
const ELV_WORKSPACE_CHANGED_BROADCAST_CHANNEL_KEY =
  'affine-elv-workspace-changed';

const logger = new DebugLogger('elv-workspace');

type GlobalStateStorageLike = {
  ready: Promise<void>;
  get<T>(key: string): T | undefined;
  set<T>(key: string, value: T): void;
};

function getElectronGlobalStateStorage(): GlobalStateStorageLike | null {
  if (!BUILD_CONFIG.isElectron) {
    return null;
  }
  const sharedStorage = (
    globalThis as {
      __sharedStorage?: { globalState?: GlobalStateStorageLike };
    }
  ).__sharedStorage;
  return sharedStorage?.globalState ?? null;
}

function getLegacyELVWorkspaceIds(): string[] {
  try {
    return normalizeWorkspaceIds(
      JSON.parse(localStorage.getItem(ELV_WORKSPACE_LOCAL_STORAGE_KEY) ?? '[]')
    );
  } catch (e) {
    logger.error('Failed to get ELV workspace ids', e);
    return [];
  }
}

export function getELVWorkspaceIds(): string[] {
  const globalState = getElectronGlobalStateStorage();
  if (globalState) {
    const value = globalState.get(ELV_WORKSPACE_GLOBAL_STATE_KEY);
    if (value !== undefined) {
      return normalizeWorkspaceIds(value);
    }
  }

  return getLegacyELVWorkspaceIds();
}

export function setELVWorkspaceIds(
  idsOrUpdater: string[] | ((ids: string[]) => string[])
) {
  const next = normalizeWorkspaceIds(
    typeof idsOrUpdater === 'function'
      ? idsOrUpdater(getELVWorkspaceIds())
      : idsOrUpdater
  );
  const deduplicated = dedupeWorkspaceIds(next);

  const globalState = getElectronGlobalStateStorage();
  if (globalState) {
    globalState.set(ELV_WORKSPACE_GLOBAL_STATE_KEY, deduplicated);
    return;
  }

  try {
    localStorage.setItem(
      ELV_WORKSPACE_LOCAL_STORAGE_KEY,
      JSON.stringify(deduplicated)
    );
  } catch (e) {
    logger.error('Failed to set ELV workspace ids', e);
  }
}

class ELVWorkspaceFlavourProvider implements WorkspaceFlavourProvider {
  constructor(private readonly framework: FrameworkProvider) {
    if (BUILD_CONFIG.isElectron) {
      void this.ensureWorkspaceIdsMigrated();
    }
  }

  private migration: Promise<void> | null = null;

  private ensureWorkspaceIdsMigrated() {
    if (!BUILD_CONFIG.isElectron) {
      return;
    }
    if (this.migration) {
      return;
    }

    this.migration = (async () => {
      const electronApi = this.framework.get(DesktopApiService);
      await electronApi.sharedStorage.globalState.ready;

      const persistedIds = normalizeWorkspaceIds(
        electronApi.sharedStorage.globalState.get(ELV_WORKSPACE_GLOBAL_STATE_KEY)
      );
      const legacyIds = getLegacyELVWorkspaceIds();

      setELVWorkspaceIds(currentIds => {
        return dedupeWorkspaceIds([...currentIds, ...persistedIds, ...legacyIds]);
      });
    })()
      .catch(e => {
        logger.error('Failed to migrate ELV workspace ids', e);
      })
      .finally(() => {
        this.notifyChannel.postMessage(null);
      });
  }

  readonly flavour = 'elv';
  readonly notifyChannel = new BroadcastChannel(
    ELV_WORKSPACE_CHANGED_BROADCAST_CHANNEL_KEY
  );

  DocStorageType =
    BUILD_CONFIG.isElectron || BUILD_CONFIG.isIOS || BUILD_CONFIG.isAndroid
      ? SqliteDocStorage
      : ELVDocStorage;
  BlobStorageType =
    BUILD_CONFIG.isElectron || BUILD_CONFIG.isIOS || BUILD_CONFIG.isAndroid
      ? SqliteBlobStorage
      : ELVBlobStorage;
  DocSyncStorageType =
    BUILD_CONFIG.isElectron || BUILD_CONFIG.isIOS || BUILD_CONFIG.isAndroid
      ? SqliteDocSyncStorage
      : ELVDocSyncStorage;
  BlobSyncStorageType =
    BUILD_CONFIG.isElectron || BUILD_CONFIG.isIOS || BUILD_CONFIG.isAndroid
      ? SqliteBlobSyncStorage
      : ELVBlobSyncStorage;
  IndexerStorageType =
    BUILD_CONFIG.isElectron || BUILD_CONFIG.isIOS || BUILD_CONFIG.isAndroid
      ? SqliteIndexerStorage
      : IndexedDBIndexerStorage;
  IndexerSyncStorageType = BUILD_CONFIG.isElectron
    ? SqliteIndexerSyncStorage
    : IndexedDBIndexerSyncStorage;

  async deleteWorkspace(id: string): Promise<void> {
    setELVWorkspaceIds(ids => ids.filter(x => x !== id));

    if (BUILD_CONFIG.isElectron) {
      const electronApi = this.framework.get(DesktopApiService);
      await electronApi.handler.workspace.moveToTrash(
        universalId({ peer: 'elv', type: 'workspace', id })
      );
    }

    this.notifyChannel.postMessage(id);
  }

  async createWorkspace(
    initial: (
      docCollection: WorkspaceImpl,
      blobStorage: BlobStorage,
      docStorage: DocStorage
    ) => Promise<void>
  ): Promise<WorkspaceMetadata> {
    const id = nanoid();

    const docStorage = new this.DocStorageType({
      id,
      flavour: this.flavour,
      type: 'workspace',
    });
    docStorage.connection.connect();
    await docStorage.connection.waitForConnected();

    const blobStorage = new this.BlobStorageType({
      id,
      flavour: this.flavour,
      type: 'workspace',
    });
    blobStorage.connection.connect();
    await blobStorage.connection.waitForConnected();

    const docList = new Set<YDoc>();

    const docCollection = new WorkspaceImpl({
      id,
      rootDoc: new YDoc({ guid: id }),
      blobSource: {
        get: async key => {
          const record = await blobStorage.get(key);
          return record
            ? new Blob([toArrayBuffer(record.data)], { type: record.mime })
            : null;
        },
        delete: async () => {
          return;
        },
        list: async () => {
          return [];
        },
        set: async (blobId, blob) => {
          await blobStorage.set({
            key: blobId,
            data: new Uint8Array(await blob.arrayBuffer()),
            mime: blob.type,
          });
          return blobId;
        },
        name: 'blob',
        readonly: false,
      },
      onLoadDoc(doc) {
        docList.add(doc);
      },
    });

    try {
      await initial(docCollection, blobStorage, docStorage);

      for (const subdoc of docList) {
        await docStorage.pushDocUpdate({
          docId: subdoc.guid,
          bin: encodeStateAsUpdate(subdoc),
        });
      }

      docStorage.connection.disconnect();
      blobStorage.connection.disconnect();

      setELVWorkspaceIds(ids => [...ids, id]);
      this.notifyChannel.postMessage(id);
    } finally {
      docCollection.dispose();
    }

    return { id, flavour: this.flavour };
  }

  workspaces$ = LiveData.from(
    new Observable<WorkspaceMetadata[]>(subscriber => {
      let last: WorkspaceMetadata[] | null = null;
      const emit = () => {
        const value = getELVWorkspaceIds().map(id => ({
          id,
          flavour: this.flavour,
        }));
        if (isEqual(last, value)) return;
        subscriber.next(value);
        last = value;
      };

      emit();
      const channel = new BroadcastChannel(
        ELV_WORKSPACE_CHANGED_BROADCAST_CHANNEL_KEY
      );
      channel.addEventListener('message', emit);

      return () => {
        channel.removeEventListener('message', emit);
        channel.close();
      };
    }),
    []
  );

  isRevalidating$ = new LiveData(false);

  revalidate(): void {
    if (BUILD_CONFIG.isElectron) {
      void this.ensureWorkspaceIdsMigrated();
    }
    this.notifyChannel.postMessage(null);
  }

  async getWorkspaceProfile(
    id: string
  ): Promise<WorkspaceProfileInfo | undefined> {
    const docStorage = new this.DocStorageType({
      id,
      flavour: this.flavour,
      type: 'workspace',
      readonlyMode: true,
    });
    docStorage.connection.connect();
    await docStorage.connection.waitForConnected();
    const localData = await docStorage.getDoc(id);

    docStorage.connection.disconnect();

    if (!localData) {
      return {
        isOwner: true,
      };
    }

    const client = getWorkspaceProfileWorker();

    const result = await client.call(
      'renderWorkspaceProfile',
      [localData.bin].filter(Boolean) as Uint8Array[]
    );

    return {
      name: result.name,
      avatar: result.avatar,
      isOwner: true,
    };
  }

  async getWorkspaceBlob(id: string, blobKey: string): Promise<Blob | null> {
    const storage = new this.BlobStorageType({
      id,
      flavour: this.flavour,
      type: 'workspace',
    });
    storage.connection.connect();
    await storage.connection.waitForConnected();
    const blob = await storage.get(blobKey);
    storage.connection.disconnect();

    return blob
      ? new Blob([toArrayBuffer(blob.data)], { type: blob.mime })
      : null;
  }

  async listBlobs(id: string): Promise<ListedBlobRecord[]> {
    const storage = new this.BlobStorageType({
      id,
      flavour: this.flavour,
      type: 'workspace',
    });
    storage.connection.connect();
    await storage.connection.waitForConnected();

    const blobs = await storage.list();
    storage.connection.disconnect();
    return blobs;
  }

  async deleteBlob(
    id: string,
    blob: string,
    permanent: boolean
  ): Promise<void> {
    const storage = new this.BlobStorageType({
      id,
      flavour: this.flavour,
      type: 'workspace',
    });
    storage.connection.connect();
    await storage.connection.waitForConnected();
    await storage.delete(blob, permanent);
    storage.connection.disconnect();
  }

  getEngineWorkerInitOptions(workspaceId: string): WorkerInitOptions {
    return {
      local: {
        doc: {
          name: this.DocStorageType.identifier,
          opts: {
            flavour: this.flavour,
            type: 'workspace',
            id: workspaceId,
          },
        },
        blob: {
          name: this.BlobStorageType.identifier,
          opts: {
            flavour: this.flavour,
            type: 'workspace',
            id: workspaceId,
          },
        },
        blobSync: {
          name: this.BlobSyncStorageType.identifier,
          opts: {
            flavour: this.flavour,
            type: 'workspace',
            id: workspaceId,
          },
        },
        docSync: {
          name: this.DocSyncStorageType.identifier,
          opts: {
            flavour: this.flavour,
            type: 'workspace',
            id: workspaceId,
          },
        },
        awareness: {
          name: 'BroadcastChannelAwarenessStorage',
          opts: {
            id: `${this.flavour}:${workspaceId}`,
          },
        },
        indexer: {
          name: this.IndexerStorageType.identifier,
          opts: {
            flavour: this.flavour,
            type: 'workspace',
            id: workspaceId,
          },
        },
        indexerSync: {
          name: this.IndexerSyncStorageType.identifier,
          opts: {
            flavour: this.flavour,
            type: 'workspace',
            id: workspaceId,
          },
        },
      },
      remotes: {},
    };
  }
}

export class ELVWorkspaceFlavoursProvider
  extends Service
  implements WorkspaceFlavoursProvider
{
  constructor() {
    super();
  }

  workspaceFlavours$ = new LiveData<WorkspaceFlavourProvider[]>([
    new ELVWorkspaceFlavourProvider(this.framework),
  ]);
}
