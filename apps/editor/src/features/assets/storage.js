import { ASSET_BLOB_STORE, ASSET_DATABASE_NAME, ASSET_DATABASE_VERSION, ASSET_DB_URL_PREFIX, ASSET_TYPES, IMPORT_YIELD_INTERVAL, createId, persistCurrentProjectDocument, render, session, setExportPreviewPayload, state } from "./deps.js?v=20260620-designless";
import { yieldToBrowser } from "./fileMeta.js?v=20260620-designless";

let assetDatabasePromise = null;

export async function persistFileBackedAssets(records) {
  if (!records.length) {
    return { persisted: 0, skipped: 0 };
  }

  try {
    const db = await openAssetDatabase();
    if (!db) {
      return { persisted: 0, skipped: records.length };
    }

    const projectId = state.project.project.id;
    const prepared = records.map(({ asset, file }) => ({
      asset,
      file,
      key: createAssetStorageKey(projectId, asset.id),
      record: {
        key: createAssetStorageKey(projectId, asset.id),
        projectId,
        assetId: asset.id,
        name: asset.name || file.name,
        fileName: file.name,
        mime: file.type || asset.mime || "application/octet-stream",
        size: file.size,
        lastModified: file.lastModified || null,
        importedAt: new Date().toISOString(),
        blob: file
      }
    }));

    await writeAssetRecords(db, prepared.map((entry) => entry.record));
    for (const entry of prepared) {
      markAssetAsPersistent(entry.asset, entry.key, entry.file);
    }
    return { persisted: prepared.length, skipped: 0 };
  } catch (error) {
    console.warn("Asset database persistence failed.", error);
    for (const { asset } of records) {
      asset.meta = {
        ...(asset.meta || {}),
        transientSrc: true,
        persistentSrc: false,
        storageError: error.message
      };
    }
    return { persisted: 0, skipped: records.length, error };
  }
}

export function openAssetDatabase() {
  if (typeof indexedDB === "undefined") {
    return Promise.resolve(null);
  }
  if (assetDatabasePromise) {
    return assetDatabasePromise;
  }

  assetDatabasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(ASSET_DATABASE_NAME, ASSET_DATABASE_VERSION);
    request.addEventListener("upgradeneeded", () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ASSET_BLOB_STORE)) {
        const store = db.createObjectStore(ASSET_BLOB_STORE, { keyPath: "key" });
        store.createIndex("projectId", "projectId", { unique: false });
        store.createIndex("assetId", "assetId", { unique: false });
      }
    });
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => {
      assetDatabasePromise = null;
      reject(request.error || new Error("Failed to open asset database."));
    });
  });

  return assetDatabasePromise;
}

export function writeAssetRecords(db, records) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(ASSET_BLOB_STORE, "readwrite");
    const store = transaction.objectStore(ASSET_BLOB_STORE);
    for (const record of records) {
      store.put(record);
    }
    transaction.addEventListener("complete", resolve);
    transaction.addEventListener("error", () => reject(transaction.error || new Error("Failed to write asset records.")));
    transaction.addEventListener("abort", () => reject(transaction.error || new Error("Asset database write was aborted.")));
  });
}

export function readAssetRecord(db, key) {
  return new Promise((resolve, reject) => {
    const request = db.transaction(ASSET_BLOB_STORE, "readonly").objectStore(ASSET_BLOB_STORE).get(key);
    request.addEventListener("success", () => resolve(request.result || null));
    request.addEventListener("error", () => reject(request.error || new Error(`Failed to read asset record "${key}".`)));
  });
}

export async function clearAssetDatabase() {
  if (typeof indexedDB === "undefined") {
    return false;
  }

  for (const url of session.persistentAssetObjectUrls.values()) {
    URL.revokeObjectURL(url);
  }
  session.persistentAssetObjectUrls.clear();

  if (assetDatabasePromise) {
    const db = await assetDatabasePromise.catch(() => null);
    db?.close();
    assetDatabasePromise = null;
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(ASSET_DATABASE_NAME);
    request.addEventListener("success", () => resolve(true));
    request.addEventListener("blocked", () => resolve(false));
    request.addEventListener("error", () => reject(request.error || new Error("Failed to clear asset database.")));
  });
}

export function createAssetStorageKey(projectId, assetId) {
  return `${encodeURIComponent(projectId || "project")}/${encodeURIComponent(assetId || createId("asset"))}`;
}

export function markAssetAsPersistent(asset, storageKey, file) {
  asset.meta = {
    ...(asset.meta || {}),
    storage: {
      adapter: "indexeddb",
      database: ASSET_DATABASE_NAME,
      store: ASSET_BLOB_STORE,
      key: storageKey
    },
    storageKey,
    persistentSrc: true,
    transientSrc: true,
    fileName: asset.meta?.fileName || file.name,
    byteSize: asset.meta?.byteSize ?? file.size
  };
}

export async function restorePersistentAssetSources(action = "asset-storage") {
  const project = state.project;
  const result = await hydratePersistentAssetSources(project);
  if (state.project !== project || (!result.restored && !result.missing && !result.failed)) {
    return result;
  }

  render();
  setExportPreviewPayload({
    action,
    status: result.failed ? "partial" : "restored",
    restoredAssets: result.restored,
    missingAssets: result.missing,
    failedAssets: result.failed
  });
  return result;
}

export async function hydratePersistentAssetSources(project) {
  const assets = project.assets || [];
  const dbBackedAssets = assets.filter((asset) => getAssetStorageKey(asset));
  if (!dbBackedAssets.length) {
    return { restored: 0, missing: 0, failed: 0 };
  }

  let db = null;
  try {
    db = await openAssetDatabase();
  } catch (error) {
    console.warn("Asset database restore failed.", error);
    return { restored: 0, missing: 0, failed: dbBackedAssets.length };
  }
  if (!db) {
    return { restored: 0, missing: dbBackedAssets.length, failed: 0 };
  }

  let restored = 0;
  let missing = 0;
  let failed = 0;
  for (const [index, asset] of dbBackedAssets.entries()) {
    const storageKey = getAssetStorageKey(asset);
    try {
      const record = await readAssetRecord(db, storageKey);
      if (!record?.blob) {
        missing += 1;
        continue;
      }

      const url = createObjectUrlForPersistentAsset(storageKey, record.blob);
      asset.src = url;
      asset.mime = asset.mime || record.mime;
      asset.meta = {
        ...(asset.meta || {}),
        persistentSrc: true,
        transientSrc: true,
        storageMissing: false
      };
      restored += 1;
    } catch (error) {
      console.warn(`Failed to restore asset "${asset.id}".`, error);
      asset.meta = {
        ...(asset.meta || {}),
        storageMissing: true,
        storageError: error.message
      };
      failed += 1;
    }

    if (index > 0 && index % IMPORT_YIELD_INTERVAL === 0) {
      await yieldToBrowser();
    }
  }

  for (const asset of assets) {
    if (asset.type === ASSET_TYPES.spriteAtlas && asset.imageAssetId) {
      const linkedImage = assets.find((candidate) => candidate.id === asset.imageAssetId);
      if (linkedImage?.src && (!asset.src || isAssetDatabaseUrl(asset.src))) {
        asset.src = linkedImage.src;
      }
    }
  }

  return { restored, missing, failed };
}

export function createObjectUrlForPersistentAsset(storageKey, blob) {
  const existing = session.persistentAssetObjectUrls.get(storageKey);
  if (existing) {
    return existing;
  }

  const url = URL.createObjectURL(blob);
  session.persistentAssetObjectUrls.set(storageKey, url);
  session.assetObjectUrls.set(url, blob);
  return url;
}

export function serializeProjectForStorage(project, options = {}) {
  return {
    ...project,
    assets: (project.assets || []).map((asset) => serializeAssetForStorage(asset, project.project?.id, options))
  };
}

export function serializeAssetForStorage(asset, projectId = state.project.project.id, options = {}) {
  const storageKey = getAssetStorageKey(asset)
    || (options.includeSessionBlobs && isBlobUrl(asset.src) && session.assetObjectUrls.has(asset.src) ? createAssetStorageKey(projectId, asset.id) : null);
  const meta = {
    ...(asset.meta || {})
  };

  if (!storageKey) {
    return {
      ...asset,
      src: isBlobUrl(asset.src) ? null : asset.src,
      meta
    };
  }

  meta.storage = {
    ...(meta.storage || {}),
    adapter: "indexeddb",
    database: ASSET_DATABASE_NAME,
    store: ASSET_BLOB_STORE,
    key: storageKey
  };
  meta.persistentSrc = true;
  meta.transientSrc = false;

  return {
    ...asset,
    src: asset.type === ASSET_TYPES.spriteAtlas && asset.imageAssetId ? null : createAssetDatabaseUrl(storageKey),
    meta
  };
}

export function getAssetStorageKey(asset) {
  return asset?.meta?.storage?.key || null;
}

export function createAssetDatabaseUrl(storageKey) {
  return `${ASSET_DB_URL_PREFIX}${storageKey}`;
}

export function isAssetDatabaseUrl(value) {
  return String(value || "").startsWith(ASSET_DB_URL_PREFIX);
}

export function isBlobUrl(value) {
  return String(value || "").startsWith("blob:");
}

export async function clearPersistentAssetsAndProject() {
  const confirmed = typeof window === "undefined" || window.confirm(
    "Clear imported assets and the persistent asset database? This keeps the UI document, but sprites/fonts will lose their imported asset references."
  );
  if (!confirmed) {
    return false;
  }

  try {
    await clearAssetDatabase();
    revokeSessionAssetObjectUrls();
    session.imageAssetCache.clear();
    session.fontAssetCache.clear();
    state.project = {
      ...state.project,
      project: {
        ...state.project.project,
        updatedAt: new Date().toISOString()
      },
      assets: []
    };
    state.selectedAssetId = null;
    state.selectedAssetFolder = "all";
    state.collapsedAssetFolderPaths.clear();
    state.history = [];
    state.redoStack = [];
    persistCurrentProjectDocument();
    render();
    setExportPreviewPayload({
      action: "clear-assets",
      status: "cleared",
      projectId: state.project.project.id
    });
    return true;
  } catch (error) {
    setExportPreviewPayload({
      action: "clear-assets",
      status: "failed",
      message: error.message
    });
    return false;
  }
}

export function revokeSessionAssetObjectUrls() {
  for (const url of session.assetObjectUrls.keys()) {
    if (String(url).startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  }
  session.assetObjectUrls.clear();
  session.persistentAssetObjectUrls.clear();
}
