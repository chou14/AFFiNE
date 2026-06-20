import type { StorageConstructor } from '..';
import { ELVBlobStorage } from './blob';
import { ELVBlobSyncStorage } from './blob-sync';
import { ELVDocStorage } from './doc';
import { ELVDocSyncStorage } from './doc-sync';

export * from './blob';
export * from './blob-sync';
export * from './connection';
export * from './doc';
export * from './doc-sync';

export const elvStorages = [
  ELVDocStorage,
  ELVBlobStorage,
  ELVDocSyncStorage,
  ELVBlobSyncStorage,
] satisfies StorageConstructor[];
