import { ASSET_RENDER_BATCH_SIZE, ASSET_TYPES, applyFontAssetToSelectedText, applyLayoutState, clamp, clearInspectorAssetDropTargets, clearLayerDropIndicators, closeAtlasEditor, createSpriteNodeFromAsset, els, getSelectedNode, isAssetDatabaseUrl, MAX_ASSET_TILE_SIZE, MIN_ASSET_TILE_SIZE, NODE_COMPONENT_TYPES, normalizeNineSlice, openAtlasEditor, openSelectedAssetEditor, render, renderCanvas, saveLayoutState, selectEditorNode, setAddMenuOpen, setAssetContextMenuOpen, setAssetViewMenuOpen, setCanvasContextMenuOpen, setDeviceMenuOpen, setExportPreviewPayload, setHistoryMenuOpen, setLayoutMenuOpen, setPageContextMenuOpen, setProjectMenuOpen, setWindowMenuOpen, state, updateSelectedSpriteAsset } from "./deps.js?v=20260620-designless";
import { hasNodeComponent } from "./nodeComponents.js?v=20260620-designless";

export function renderAssets(options = {}) {
  const assetScroll = options.preserveScroll === false ? null : captureScrollState(els.assetsList);
  renderAssetFolders();
  const assets = getFilteredAssets();

  els.assetsList.classList.toggle("is-grid", state.layout.assetGridEnabled);
  els.assetsList.classList.toggle("is-list", !state.layout.assetGridEnabled);

  if (!assets.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list-message";
    empty.textContent = state.project.assets.length ? "No assets in this view" : "Import files or a whole folder";
    els.assetsList.replaceChildren(empty);
    if (assetScroll) {
      restoreScrollState(els.assetsList, assetScroll);
    }
    return;
  }

  const visibleAssets = assets.slice(0, state.assetRenderLimit);
  const nodes = visibleAssets.map((asset) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `asset-item${state.selectedAssetId === asset.id ? " is-selected" : ""}`;
    item.draggable = true;
    item.dataset.assetId = asset.id;
    item.title = asset.name || asset.id;

    const thumbnail = createAssetThumbnail(asset);
    const info = document.createElement("span");
    info.className = "asset-info";
    const name = document.createElement("strong");
    name.textContent = asset.name || asset.id;
    const meta = document.createElement("span");
    meta.textContent = getAssetMetaLabel(asset);
    info.append(name, meta);

    const action = document.createElement("span");
    action.className = "asset-action";
    action.textContent = asset.type === ASSET_TYPES.font
      ? "Use"
      : asset.type === ASSET_TYPES.spriteAtlas
        ? "Sprite Editor"
        : "Sprite";

    item.append(thumbnail, info, action);
    item.addEventListener("click", () => {
      state.selectedAssetId = asset.id;
      if (asset.type === ASSET_TYPES.font && hasNodeComponent(getSelectedNode(), NODE_COMPONENT_TYPES.text)) {
        applyFontAssetToSelectedText(asset.id);
      }
      render();
    });
    item.addEventListener("dblclick", () => {
      if (asset.type === ASSET_TYPES.font) {
        applyFontAssetToSelectedText(asset.id);
      } else if (asset.type === ASSET_TYPES.spriteAtlas) {
        openAtlasEditor(asset.id);
      } else {
        createSpriteNodeFromAsset(asset.id);
      }
    });
    item.addEventListener("contextmenu", (event) => openAssetContextMenu(event, asset));
    item.addEventListener("dragstart", (event) => {
      state.assetDragId = asset.id;
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/x-pixi-ui-asset-id", asset.id);
      event.dataTransfer.setData("text/plain", asset.id);
    });
    item.addEventListener("dragend", finishAssetBrowserDrag);
    return item;
  });

  els.assetsList.replaceChildren(...nodes);
  if (options.scrollToAssetId) {
    scrollAssetIntoView(options.scrollToAssetId);
  } else if (assetScroll) {
    restoreScrollState(els.assetsList, assetScroll);
  }
}

export function selectAssetInBrowser(assetId, options = {}) {
  const asset = getAssetById(assetId);
  if (!asset) {
    return false;
  }

  state.selectedAssetId = asset.id;
  state.selectedAssetFolder = getAssetFolder(asset) || "all";
  expandAssetFolderPath(state.selectedAssetFolder);
  if (els.assetSearchInput.value) {
    els.assetSearchInput.value = "";
  }
  if (asset.type && [...els.assetTypeFilter.options].some((option) => option.value === asset.type)) {
    els.assetTypeFilter.value = asset.type;
  } else {
    els.assetTypeFilter.value = "all";
  }

  resetAssetRenderLimit();
  const assetIndex = getFilteredAssets().findIndex((candidate) => candidate.id === asset.id);
  if (assetIndex >= 0) {
    state.assetRenderLimit = Math.max(state.assetRenderLimit, assetIndex + 1);
  }
  renderAssets({
    preserveScroll: false,
    scrollToAssetId: options.scroll !== false ? asset.id : null
  });
  return true;
}

export function scrollAssetIntoView(assetId) {
  const item = [...els.assetsList.querySelectorAll(".asset-item")]
    .find((candidate) => candidate.dataset.assetId === assetId);
  if (!item) {
    return;
  }

  item.scrollIntoView({ block: "nearest", inline: "nearest" });
}

function finishAssetBrowserDrag() {
  state.assetDragId = null;
  clearInspectorAssetDropTargets();
  clearLayerDropIndicators();
}

export function getFilteredAssets() {
  const filter = els.assetTypeFilter.value || "all";
  const query = els.assetSearchInput.value.trim().toLowerCase();
  return (state.project.assets || [])
    .filter((asset) => filter === "all" || asset.type === filter)
    .filter((asset) => state.selectedAssetFolder === "all" || getAssetFolder(asset).startsWith(state.selectedAssetFolder))
    .filter((asset) => !query || `${asset.name || ""} ${asset.id || ""} ${asset.type || ""} ${getAssetFolder(asset)}`.toLowerCase().includes(query));
}

export function handleAssetListScroll() {
  const remainingScroll = els.assetsList.scrollHeight - els.assetsList.scrollTop - els.assetsList.clientHeight;
  if (remainingScroll > 240) {
    return;
  }

  const assets = getFilteredAssets();
  if (state.assetRenderLimit >= assets.length) {
    return;
  }

  state.assetRenderLimit = Math.min(assets.length, state.assetRenderLimit + ASSET_RENDER_BATCH_SIZE);
  renderAssets();
}

export function openAssetContextMenu(event, asset) {
  event.preventDefault();
  event.stopPropagation();
  if (!asset) {
    return false;
  }

  state.selectedAssetId = asset.id;
  state.assetContextMenuAssetId = asset.id;
  renderAssets();
  setHistoryMenuOpen(false);
  setProjectMenuOpen(false);
  setDeviceMenuOpen(false);
  setLayoutMenuOpen(false);
  setWindowMenuOpen(false);
  setAddMenuOpen(false);
  setCanvasContextMenuOpen(false);
  setPageContextMenuOpen(false);
  setAssetContextMenuOpen(true, {
    x: event.clientX,
    y: event.clientY
  });
  return true;
}

export function openAssetContextSpriteEditor() {
  const asset = getAssetById(state.assetContextMenuAssetId);
  if (!asset || !isTextureDropAsset(asset)) {
    return false;
  }

  state.selectedAssetId = asset.id;
  setAssetContextMenuOpen(false);
  return openSelectedAssetEditor();
}

export async function openAssetContextFolder() {
  const asset = getAssetById(state.assetContextMenuAssetId);
  setAssetContextMenuOpen(false);
  const revealPath = getAssetRevealPath(asset);

  if (!revealPath) {
    const message = "This asset has no local device path. Reimport it from an environment that exposes file paths, then Reveal in Folder can open the OS folder.";
    setExportPreviewPayload({
      action: "reveal-asset-folder",
      status: "unavailable",
      folder: getAssetFolder(asset) || null,
      message
    });
    notifyEditorAction(message);
    return false;
  }

  try {
    await revealDeviceFolder(revealPath);
    setExportPreviewPayload({
      action: "reveal-asset-folder",
      status: "opened",
      path: revealPath
    });
    return true;
  } catch (error) {
    setExportPreviewPayload({
      action: "reveal-asset-folder",
      status: "failed",
      folder: getAssetFolder(asset) || null,
      message: error.message
    });
    notifyEditorAction(error.message);
    return false;
  }
}

export function getAssetRevealPath(asset) {
  return String(asset?.meta?.deviceFolder || asset?.meta?.devicePath || "").trim();
}

export async function revealDeviceFolder(path) {
  const response = await fetch(new URL("/__pixi/reveal", window.location.origin), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Pixi-Editor-Action": "reveal"
    },
    body: JSON.stringify({ path, reveal: "folder" })
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Reveal failed with HTTP ${response.status}.`);
  }
  return response.json().catch(() => ({}));
}

export function notifyEditorAction(message) {
  if (!message) {
    return;
  }

  console.warn(message);
  if (typeof window !== "undefined" && typeof window.alert === "function") {
    window.alert(message);
  }
}

export function createAssetThumbnail(asset) {
  const thumbnail = document.createElement("span");
  thumbnail.className = `asset-thumbnail asset-thumbnail-${asset.type || "data"}`;

  if ((asset.type === ASSET_TYPES.texture || asset.type === ASSET_TYPES.spriteAtlas) && getAssetImageSrc(asset)) {
    const image = document.createElement("img");
    image.alt = "";
    image.src = getAssetImageSrc(asset);
    thumbnail.append(image);
  } else {
    thumbnail.textContent = asset.type === ASSET_TYPES.font ? "Aa" : "[]";
  }

  return thumbnail;
}

export function renderAssetFolders() {
  const folderScroll = captureScrollState(els.assetFolderList);
  const folders = collectAssetFolders();
  const folderPaths = new Set(folders.map((folder) => folder.path));
  for (const collapsedPath of [...state.collapsedAssetFolderPaths]) {
    if (!folderPaths.has(collapsedPath)) {
      state.collapsedAssetFolderPaths.delete(collapsedPath);
    }
  }
  if (state.selectedAssetFolder !== "all" && !folders.some((folder) => folder.path === state.selectedAssetFolder)) {
    state.selectedAssetFolder = "all";
  }

  const fragment = document.createDocumentFragment();
  fragment.append(createAssetFolderButton({
    path: "all",
    label: "All assets",
    depth: 0,
    count: state.project.assets.length
  }));

  for (const folder of folders) {
    if (isAssetFolderHiddenByCollapsedAncestor(folder.path)) {
      continue;
    }
    fragment.append(createAssetFolderButton(folder));
  }

  els.assetFolderList.replaceChildren(fragment);
  restoreScrollState(els.assetFolderList, folderScroll);
}

export function createAssetFolderButton(folder) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `asset-folder-item${state.selectedAssetFolder === folder.path ? " is-selected" : ""}`;
  if (folder.hasChildren && state.collapsedAssetFolderPaths.has(folder.path)) {
    button.classList.add("is-collapsed");
  }
  button.dataset.assetFolder = folder.path;
  button.style.setProperty("--folder-depth", folder.depth);

  const icon = document.createElement("span");
  if (folder.path === "all") {
    icon.className = "asset-folder-root-icon";
    icon.textContent = "A";
  } else if (folder.hasChildren) {
    icon.className = "asset-folder-disclosure";
    icon.dataset.assetFolderToggle = folder.path;
    icon.setAttribute("aria-hidden", "true");
  } else {
    icon.className = "asset-folder-disclosure-placeholder";
  }
  const label = document.createElement("span");
  label.className = "asset-folder-label";
  label.textContent = folder.label;
  const count = document.createElement("span");
  count.className = "asset-folder-count";
  count.textContent = String(folder.count);

  button.append(icon, label, count);
  return button;
}

export function collectAssetFolders() {
  const folders = new Map();
  for (const asset of state.project.assets || []) {
    const folder = getAssetFolder(asset);
    if (!folder) {
      continue;
    }

    const segments = folder.split("/").filter(Boolean);
    let path = "";
    for (const [index, segment] of segments.entries()) {
      path = path ? `${path}/${segment}` : segment;
      const entry = folders.get(path) || {
        path,
        label: segment,
        depth: index,
        count: 0,
        hasChildren: false
      };
      if (folder === path || folder.startsWith(`${path}/`)) {
        entry.count += 1;
      }
      folders.set(path, entry);
      if (index > 0) {
        const parentPath = segments.slice(0, index).join("/");
        const parentEntry = folders.get(parentPath);
        if (parentEntry) {
          parentEntry.hasChildren = true;
        }
      }
    }
  }

  return [...folders.values()].sort((a, b) => a.path.localeCompare(b.path));
}

export function handleAssetFolderClick(event) {
  const toggle = event.target.closest("[data-asset-folder-toggle]");
  if (toggle) {
    toggleAssetFolderCollapsed(toggle.dataset.assetFolderToggle);
    return;
  }

  const button = event.target.closest("[data-asset-folder]");
  if (!button) {
    return;
  }

  state.selectedAssetFolder = button.dataset.assetFolder || "all";
  resetAssetRenderLimit();
  renderAssets();
}

export function toggleAssetFolderCollapsed(folderPath) {
  if (!folderPath || folderPath === "all") {
    return;
  }

  const shouldCollapse = !state.collapsedAssetFolderPaths.has(folderPath);
  if (shouldCollapse) {
    state.collapsedAssetFolderPaths.add(folderPath);
    if (state.selectedAssetFolder.startsWith(`${folderPath}/`)) {
      state.selectedAssetFolder = folderPath;
      resetAssetRenderLimit();
    }
  } else {
    state.collapsedAssetFolderPaths.delete(folderPath);
  }
  renderAssets();
}

export function expandAssetFolderPath(folderPath) {
  const segments = String(folderPath || "").split("/").filter(Boolean);
  let currentPath = "";
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    state.collapsedAssetFolderPaths.delete(currentPath);
  }
}

export function isAssetFolderHiddenByCollapsedAncestor(folderPath) {
  const segments = folderPath.split("/").filter(Boolean);
  let parentPath = "";
  for (let index = 0; index < segments.length - 1; index += 1) {
    parentPath = parentPath ? `${parentPath}/${segments[index]}` : segments[index];
    if (state.collapsedAssetFolderPaths.has(parentPath)) {
      return true;
    }
  }
  return false;
}

export function captureScrollState(element) {
  return {
    top: element?.scrollTop || 0,
    left: element?.scrollLeft || 0
  };
}

export function restoreScrollState(element, scrollState) {
  if (!element || !scrollState) {
    return;
  }

  const maxTop = Math.max(0, element.scrollHeight - element.clientHeight);
  const maxLeft = Math.max(0, element.scrollWidth - element.clientWidth);
  element.scrollTop = Math.min(scrollState.top, maxTop);
  element.scrollLeft = Math.min(scrollState.left, maxLeft);
}

export function resetAssetRenderLimit() {
  state.assetRenderLimit = ASSET_RENDER_BATCH_SIZE;
}

export function setAssetGridMode(enabled) {
  const nextEnabled = Boolean(enabled);
  if (state.layout.assetGridEnabled === nextEnabled) {
    setAssetViewMenuOpen(false);
    return;
  }

  state.layout = {
    ...state.layout,
    assetGridEnabled: nextEnabled
  };
  saveLayoutState();
  applyLayoutState();
  renderAssets();
  setAssetViewMenuOpen(false);
}

export function updateAssetTileSize() {
  const assetTileSize = clamp(Number(els.assetTileSizeSlider.value), MIN_ASSET_TILE_SIZE, MAX_ASSET_TILE_SIZE);
  state.layout = {
    ...state.layout,
    assetTileSize
  };
  els.appShell.style.setProperty("--asset-tile-size", `${assetTileSize}px`);
  if (els.assetTileSizeValue) {
    els.assetTileSizeValue.textContent = `${assetTileSize}px`;
  }
}

export function getAssetMetaLabel(asset) {
  if (asset.type === ASSET_TYPES.spriteAtlas) {
    return `atlas · ${Object.keys(asset.frames || {}).length} frames`;
  }
  if (asset.type === ASSET_TYPES.font) {
    return `font · ${asset.family || asset.name}`;
  }
  const size = asset.width && asset.height ? `${asset.width}x${asset.height}` : "texture";
  const folder = getAssetFolder(asset);
  return folder ? `${asset.type || "asset"} · ${size} · ${folder}` : `${asset.type || "asset"} · ${size}`;
}

export function getAssetFolder(asset) {
  return String(asset?.meta?.folder || "")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "");
}

export function getAssetById(assetId) {
  return (state.project.assets || []).find((asset) => asset.id === assetId) || null;
}

export function getTextureAssets() {
  return (state.project.assets || []).filter((asset) => asset.type === ASSET_TYPES.texture || asset.type === ASSET_TYPES.spriteAtlas);
}

export function getTextureNineSliceDefault(asset, textureProps = {}) {
  if (!asset) {
    return null;
  }

  if (asset.type === ASSET_TYPES.spriteAtlas) {
    const frames = Object.keys(asset.frames || {});
    const frameName = textureProps.frame || frames[0] || null;
    return normalizeNineSlice(getAtlasFrame(asset, frameName)?.nineSlice || asset.nineSlice);
  }

  return normalizeNineSlice(asset.nineSlice || asset.meta?.nineSlice);
}

export function getTextureRenderType(textureProps = {}, asset = null) {
  const value = String(textureProps.textureType || textureProps.imageType || textureProps.renderMode || "").trim().toLowerCase();
  if (value === "tiled" || value === "tile") {
    return "tiled";
  }
  if (value === "sliced" || value === "slice" || value === "nine-slice" || value === "9-slice") {
    return "sliced";
  }
  if (value === "simple" || value === "sprite") {
    return "simple";
  }
  return normalizeNineSlice(textureProps.nineSlice) || getTextureNineSliceDefault(asset, textureProps)
    ? "sliced"
    : "simple";
}

export function isTextureDropAsset(asset) {
  return asset?.type === ASSET_TYPES.texture || asset?.type === ASSET_TYPES.spriteAtlas;
}

export function getAssetImageSrc(asset) {
  if (!asset) {
    return null;
  }
  if (asset.src && !isAssetDatabaseUrl(asset.src)) {
    return asset.src;
  }
  if (asset.imageAssetId) {
    return getAssetById(asset.imageAssetId)?.src || null;
  }
  return null;
}

export function getAssetSpriteSize(asset, frameName = null) {
  const frame = getAtlasFrame(asset, frameName || getFirstAtlasFrameName(asset));
  if (frame) {
    return {
      width: Math.max(1, Number(frame.sourceWidth || frame.width || 180)),
      height: Math.max(1, Number(frame.sourceHeight || frame.height || 180))
    };
  }

  return {
    width: Math.max(1, Number(asset?.width || 180)),
    height: Math.max(1, Number(asset?.height || 180))
  };
}

export function getAtlasFrame(asset, frameName) {
  if (!asset || asset.type !== ASSET_TYPES.spriteAtlas || !frameName) {
    return null;
  }
  return asset.frames?.[frameName] || null;
}

export function getFirstAtlasFrameName(asset) {
  return asset?.type === ASSET_TYPES.spriteAtlas ? Object.keys(asset.frames || {})[0] || null : null;
}
