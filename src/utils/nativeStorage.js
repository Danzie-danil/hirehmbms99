import { platform } from './platform.js';

const PERSISTED_TABLES = [
    'dashboard_snapshots',
    'sales',
    'inventory',
    'customers',
    'expenses',
    'purchases',
    'central_inventory',
    'quotations',
    'staff',
    'branches',
    'suppliers',
    'tasks',
    'notes',
    'loans',
    'requests',
    'documents',
    'announcements',
    'product_returns',
    'stock_transfers',
    'notifications',
    'users',
    'subscription_snapshot'
];

const NATIVE_BACKUP_FILENAME = 'bms_native_cache.json';
let _saveDebounceTimer = null;
let _isSaving = false;
let _hasPendingSave = false;
let _activeDbRef = null;

/**
 * Universal Native File System Storage Engine
 * Writes structured Dexie snapshots to OS native directories (Tauri AppLocalData / Capacitor Data).
 */
export const nativeStorage = {
    isSupported: () => {
        return platform.isNative();
    },

    /**
     * Serializes all critical Dexie tables and writes to native device storage.
     */
    saveDatabaseToNativeDisk: async (localDb) => {
        if (!platform.isNative() || !localDb) return false;
        if (_isSaving) {
            _hasPendingSave = true;
            return false;
        }

        _isSaving = true;
        _hasPendingSave = false;

        try {
            const snapshot = {
                version: 4,
                app: 'BMSTz',
                platform: platform.getPlatformName(),
                savedAt: new Date().toISOString(),
                tables: {}
            };

            for (const tableName of PERSISTED_TABLES) {
                if (localDb[tableName]) {
                    try {
                        const records = await localDb[tableName].toArray();
                        if (Array.isArray(records) && records.length > 0) {
                            snapshot.tables[tableName] = records;
                        }
                    } catch (e) {
                        console.warn(`[NativeStorage] Failed to read table ${tableName}:`, e);
                    }
                }
            }

            const jsonString = JSON.stringify(snapshot);

            if (platform.isDesktop()) {
                try {
                    const { writeTextFile, mkdir, BaseDirectory } = await import('@tauri-apps/plugin-fs');
                    await mkdir('', { baseDir: BaseDirectory.AppLocalData, recursive: true }).catch(() => {});
                    await writeTextFile(NATIVE_BACKUP_FILENAME, jsonString, { baseDir: BaseDirectory.AppLocalData });
                    console.log(`[NativeStorage] Saved desktop snapshot (${Object.keys(snapshot.tables).length} tables) to AppLocalData`);
                    return true;
                } catch (desktopErr) {
                    console.warn('[NativeStorage] Desktop write failed:', desktopErr);
                    return false;
                }
            }

            if (platform.isAndroid()) {
                try {
                    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
                    await Filesystem.writeFile({
                        path: NATIVE_BACKUP_FILENAME,
                        data: jsonString,
                        directory: Directory.Data,
                        encoding: Encoding.UTF8
                    });
                    console.log(`[NativeStorage] Saved Android snapshot (${Object.keys(snapshot.tables).length} tables) to Directory.Data`);
                    return true;
                } catch (androidErr) {
                    console.warn('[NativeStorage] Android write failed:', androidErr);
                    return false;
                }
            }

            return false;
        } catch (err) {
            console.error('[NativeStorage] Save error:', err);
            return false;
        } finally {
            _isSaving = false;
            if (_hasPendingSave && localDb) {
                _hasPendingSave = false;
                nativeStorage.scheduleNativeSnapshot(localDb, 500);
            }
        }
    },

    /**
     * Reads native file snapshot from disk and populates local Dexie if needed.
     */
    hydrateDatabaseFromNativeDisk: async (localDb) => {
        if (!platform.isNative() || !localDb) return { hydrated: false, reason: 'unsupported_platform' };

        try {
            let jsonString = null;

            if (platform.isDesktop()) {
                try {
                    const { readTextFile, exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
                    const fileExists = await exists(NATIVE_BACKUP_FILENAME, { baseDir: BaseDirectory.AppLocalData }).catch(() => false);
                    if (fileExists) {
                        jsonString = await readTextFile(NATIVE_BACKUP_FILENAME, { baseDir: BaseDirectory.AppLocalData });
                    }
                } catch (desktopErr) {
                    console.warn('[NativeStorage] Desktop read error:', desktopErr);
                }
            } else if (platform.isAndroid()) {
                try {
                    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
                    const res = await Filesystem.readFile({
                        path: NATIVE_BACKUP_FILENAME,
                        directory: Directory.Data,
                        encoding: Encoding.UTF8
                    });
                    if (res && res.data) {
                        jsonString = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
                    }
                } catch (androidErr) {
                    console.warn('[NativeStorage] Android read error:', androidErr);
                }
            }

            if (!jsonString) {
                return { hydrated: false, reason: 'no_snapshot_file' };
            }

            const snapshot = JSON.parse(jsonString);
            if (!snapshot || !snapshot.tables) {
                return { hydrated: false, reason: 'invalid_snapshot_format' };
            }

            let totalRestoredRecords = 0;
            let tablesRestored = 0;

            for (const [tableName, records] of Object.entries(snapshot.tables)) {
                if (localDb[tableName] && Array.isArray(records) && records.length > 0) {
                    try {
                        const localCount = await localDb[tableName].count().catch(() => 0);
                        // If local table has fewer records than backup or is empty, hydrate
                        if (localCount < records.length) {
                            await localDb[tableName].bulkPut(records);
                            totalRestoredRecords += records.length;
                            tablesRestored++;
                        }
                    } catch (tableErr) {
                        console.warn(`[NativeStorage] Hydration error on table ${tableName}:`, tableErr);
                    }
                }
            }

            console.log(`[NativeStorage] Hydrated ${totalRestoredRecords} records across ${tablesRestored} tables from native disk (saved: ${snapshot.savedAt || 'unknown'})`);
            return {
                hydrated: true,
                tablesRestored,
                totalRestoredRecords,
                savedAt: snapshot.savedAt
            };
        } catch (err) {
            console.error('[NativeStorage] Hydration failed:', err);
            return { hydrated: false, reason: err.message || 'unknown_error' };
        }
    },

    /**
     * Debounced native snapshot trigger.
     */
    scheduleNativeSnapshot: (localDb, delayMs = 2500) => {
        if (!platform.isNative() || !localDb) return;
        _activeDbRef = localDb;

        if (_saveDebounceTimer) {
            clearTimeout(_saveDebounceTimer);
        }

        _saveDebounceTimer = setTimeout(() => {
            _saveDebounceTimer = null;
            nativeStorage.saveDatabaseToNativeDisk(localDb);
        }, delayMs);
    },

    /**
     * Immediately flush any pending debounce save to disk.
     */
    flushNow: async () => {
        if (_saveDebounceTimer) {
            clearTimeout(_saveDebounceTimer);
            _saveDebounceTimer = null;
        }
        if (_activeDbRef) {
            await nativeStorage.saveDatabaseToNativeDisk(_activeDbRef);
        }
    },

    /**
     * Removes the native cache snapshot file from device storage upon account wipe / reset.
     */
    clearNativeDiskBackup: async () => {
        if (!platform.isNative()) return false;

        try {
            if (platform.isDesktop()) {
                const { remove, exists, BaseDirectory } = await import('@tauri-apps/plugin-fs');
                const fileExists = await exists(NATIVE_BACKUP_FILENAME, { baseDir: BaseDirectory.AppLocalData }).catch(() => false);
                if (fileExists) {
                    await remove(NATIVE_BACKUP_FILENAME, { baseDir: BaseDirectory.AppLocalData });
                }
                return true;
            }

            if (platform.isAndroid()) {
                const { Filesystem, Directory } = await import('@capacitor/filesystem');
                await Filesystem.deleteFile({
                    path: NATIVE_BACKUP_FILENAME,
                    directory: Directory.Data
                }).catch(() => {});
                return true;
            }

            return false;
        } catch (err) {
            console.warn('[NativeStorage] Clear backup error:', err);
            return false;
        }
    },

    /**
     * Register lifecycle listeners for backgrounding and app close.
     */
    initLifecycleListeners: (localDb) => {
        if (!platform.isNative() || !localDb) return;
        _activeDbRef = localDb;

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    nativeStorage.flushNow();
                }
            });
        }

        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                nativeStorage.flushNow();
            });
            window.addEventListener('pagehide', () => {
                nativeStorage.flushNow();
            });
        }
    }
};

if (typeof window !== 'undefined') {
    window.nativeStorage = nativeStorage;
}
