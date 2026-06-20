import type { IDBConnectionOptions } from '../idb/db';

export type ELVIDBStorageOptions = IDBConnectionOptions & {
  readonlyMode?: boolean;
  mergeUpdates?: (updates: Uint8Array[]) => Promise<Uint8Array> | Uint8Array;
};

export function normalizeELVIDBOptions<T extends ELVIDBStorageOptions>(
  options: T
): T {
  return {
    ...options,
    flavour: 'elv',
    type: options.type ?? 'workspace',
  };
}
