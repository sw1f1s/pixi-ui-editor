import { ASSET_TYPES, createId, els, IMPORT_YIELD_INTERVAL, persistCurrentProjectDocument, render, renderAssets, resetAssetRenderLimit, runCommand, setExportPreviewPayload, state } from "./deps.js";
import { createObjectUrlForFile, findLinkedAtlasImageAsset, getFileBaseName, getFileDeviceMeta, getFileExtension, getFileFolder, getFileRelativePath, inferImageMime, isFontFile, isImageFile, isJsonFile, isSpriteAtlasJson, normalizeAtlasFrames, readFileAsText, sanitizeAssetId, yieldToBrowser } from "./fileMeta.js";
import { persistFileBackedAssets } from "./storage.js";

export async function importAssetsFromFiles(event) {
  const files = [...(event.target.files || [])];
  event.target.value = "";
  if (!files.length) {
    return false;
  }

  try {
    showAssetImportStatus(files.length);
    await yieldToBrowser();
    const assets = await createAssetsFromFiles(files);
    if (!assets.length) {
      renderAssets();
      return false;
    }

    runCommand({
      type: "asset.import_many",
      args: { assets },
      meta: { source: "user", label: `Import ${assets.length} assets` }
    }, { preserveInspector: true });

    state.selectedAssetId = assets.at(-1)?.id || state.selectedAssetId;
    resetAssetRenderLimit();
    setExportPreviewPayload({
      action: "import-assets",
      imported: assets.length,
      firstAssets: assets.slice(0, 20).map((asset) => ({ id: asset.id, type: asset.type, name: asset.name })),
      truncated: assets.length > 20
    });
    render();
    persistCurrentProjectDocument();
    return true;
  } catch (error) {
    setExportPreviewPayload({
      action: "import-assets",
      status: "failed",
      message: error.message
    });
    return false;
  }
}

export async function createAssetsFromFiles(files) {
  const imageFiles = files.filter(isImageFile);
  const fontFiles = files.filter(isFontFile);
  const jsonFiles = files.filter(isJsonFile);
  const imageAssets = [];
  const fileBackedAssets = [];
  const assetsByFileName = new Map();
  const assetsByBaseName = new Map();

  for (const [index, file] of imageFiles.entries()) {
    const src = createObjectUrlForFile(file);
    const relativePath = getFileRelativePath(file);
    const folder = getFileFolder(file);
    const asset = {
      id: createId(sanitizeAssetId(getFileBaseName(file.name) || "texture")),
      name: getFileBaseName(file.name) || file.name,
      type: ASSET_TYPES.texture,
      src,
      mime: file.type || inferImageMime(file.name),
      meta: {
        fileName: file.name,
        relativePath,
        folder,
        byteSize: file.size,
        transientSrc: true,
        importedAt: new Date().toISOString(),
        ...getFileDeviceMeta(file)
      }
    };
    imageAssets.push(asset);
    fileBackedAssets.push({ asset, file });
    assetsByFileName.set(file.name.toLowerCase(), asset);
    assetsByFileName.set(relativePath.toLowerCase(), asset);
    assetsByBaseName.set(getFileBaseName(file.name).toLowerCase(), asset);
    if (index > 0 && index % IMPORT_YIELD_INTERVAL === 0) {
      await yieldToBrowser();
    }
  }

  const atlasAssets = [];
  for (const [index, file] of jsonFiles.entries()) {
    const text = await readFileAsText(file);
    const parsed = JSON.parse(text);
    const relativePath = getFileRelativePath(file);
    const folder = getFileFolder(file);
    if (!isSpriteAtlasJson(parsed)) {
      atlasAssets.push({
        id: createId(sanitizeAssetId(getFileBaseName(file.name) || "data")),
        name: getFileBaseName(file.name) || file.name,
        type: ASSET_TYPES.data,
        src: `data:application/json,${encodeURIComponent(text)}`,
        meta: {
          fileName: file.name,
          relativePath,
          folder,
          importedAt: new Date().toISOString(),
          ...getFileDeviceMeta(file)
        }
      });
      continue;
    }

    const imageName = parsed.meta?.image || parsed.meta?.texture || parsed.image;
    const linkedImage = findLinkedAtlasImageAsset(file, imageName, assetsByFileName, assetsByBaseName);
    atlasAssets.push({
      id: createId(sanitizeAssetId(getFileBaseName(file.name) || "atlas")),
      name: getFileBaseName(file.name) || file.name,
      type: ASSET_TYPES.spriteAtlas,
      src: linkedImage?.src || null,
      width: linkedImage?.width,
      height: linkedImage?.height,
      imageAssetId: linkedImage?.id,
      frames: normalizeAtlasFrames(parsed.frames),
      meta: {
        fileName: file.name,
        relativePath,
        folder,
        image: imageName,
        scale: parsed.meta?.scale,
        importedAt: new Date().toISOString(),
        ...getFileDeviceMeta(file)
      }
    });
    if (index > 0 && index % IMPORT_YIELD_INTERVAL === 0) {
      await yieldToBrowser();
    }
  }

  const fontAssets = [];
  for (const [index, file] of fontFiles.entries()) {
    const src = createObjectUrlForFile(file);
    const family = getFileBaseName(file.name) || file.name;
    const relativePath = getFileRelativePath(file);
    const folder = getFileFolder(file);
    const asset = {
      id: createId(sanitizeAssetId(family || "font")),
      name: family,
      type: ASSET_TYPES.font,
      src,
      family,
      format: getFileExtension(file.name),
      mime: file.type || "font/woff2",
      meta: {
        fileName: file.name,
        relativePath,
        folder,
        byteSize: file.size,
        transientSrc: true,
        importedAt: new Date().toISOString(),
        ...getFileDeviceMeta(file)
      }
    };
    fontAssets.push(asset);
    fileBackedAssets.push({ asset, file });
    if (index > 0 && index % IMPORT_YIELD_INTERVAL === 0) {
      await yieldToBrowser();
    }
  }

  await persistFileBackedAssets(fileBackedAssets);

  return [...imageAssets, ...atlasAssets, ...fontAssets];
}

export function showAssetImportStatus(fileCount) {
  const message = document.createElement("div");
  message.className = "empty-list-message";
  message.textContent = `Importing ${fileCount} files...`;
  els.assetsList.replaceChildren(message);
}
