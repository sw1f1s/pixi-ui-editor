// document export, validation and saved layout state.
import { els, state, session, bindEditorApi } from "../app/editorRuntime.js";
import { validateProject, exportPixiUiBundle } from "../app/editorDeps.js";
import { ASSET_RENDER_BATCH_SIZE, DOCK_ZONE_NAMES, LAYOUT_PROFILE_VERSION, LAYOUT_STORAGE_KEY, MAX_ASSET_TILE_SIZE, MIN_ASSET_TILE_SIZE, PANEL_DEFINITIONS, PROJECT_STORAGE_KEY, createDefaultLayout, createDefaultPanelLayout } from "../app/editorConfig.js";
const { applyLayoutState, clamp, deleteActivePage, deleteSelectedNode, getAssetStorageKey, getInitialPageId, getPanelIdsForZone, normalizeEditorStateAfterProjectChange, persistCurrentProjectDocument, render, restorePersistentAssetSources, serializeProjectForStorage, updateProjectLoading, yieldToBrowser } = bindEditorApi(["applyLayoutState","clamp","deleteActivePage","deleteSelectedNode","getAssetStorageKey","getInitialPageId","getPanelIdsForZone","normalizeEditorStateAfterProjectChange","persistCurrentProjectDocument","render","restorePersistentAssetSources","serializeProjectForStorage","updateProjectLoading","yieldToBrowser"]);

export function exportRuntimeBundle() {
  const bundle = exportPixiUiBundle(state.project, {
    profileId: "development",
    includeEditorData: false
  });
  const filename = `${sanitizeFileName(state.project.project.id)}.bundle.json`;
  downloadJsonFile(filename, bundle);
  setExportPreviewPayload({
    action: "export-bundle",
    filename,
    bundle
  });
}

export async function loadProjectDocument(project, action, options = {}) {
  updateProjectLoading("Validating project", project.project?.name || "Checking project document...");
  const validation = validateProject(project);
  const errors = validation.filter((message) => message.severity === "error");
  if (errors.length > 0) {
    setExportPreviewPayload({
      action,
      status: "invalid",
      errors
    });
    return false;
  }

  await yieldToBrowser();
  updateProjectLoading("Preparing workspace", project.project?.name || "Applying project document...");
  state.project = project;
  state.pageId = getInitialPageId(project);
  state.selectedPageId = state.pageId;
  state.selectedNodeId = null;
  state.selectedAssetId = null;
  state.selectedAssetFolder = "all";
  state.assetRenderLimit = ASSET_RENDER_BATCH_SIZE;
  state.history = [];
  state.redoStack = [];
  state.collapsedLayerIds.clear();
  state.collapsedAssetFolderPaths.clear();
  session.activeProjectFileHandle = options.fileHandle || null;
  session.activeProjectFileName = options.fileName || null;
  if (options.layout) {
    state.layout = normalizeLayoutState(options.layout);
    saveLayoutState();
    applyLayoutState();
  }
  normalizeEditorStateAfterProjectChange();
  if (options.persist !== false) {
    persistCurrentProjectDocument();
  }
  render();
  if ((project.assets || []).some((asset) => getAssetStorageKey(asset))) {
    updateProjectLoading("Restoring assets", `${project.assets.length} assets`);
    await restorePersistentAssetSources(action);
  } else {
    await yieldToBrowser();
  }
  setExportPreviewPayload({
    action,
    status: "loaded",
    projectId: project.project.id,
    pages: project.pages.length,
    warnings: validation.filter((message) => message.severity !== "error")
  });
  return true;
}

export function loadStoredProject() {
  try {
    const raw = localStorage.getItem(PROJECT_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const project = JSON.parse(raw);
    const hasValidationErrors = validateProject(project).some((message) => message.severity === "error");
    return hasValidationErrors ? null : project;
  } catch {
    return null;
  }
}

export function downloadJsonFile(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function setExportPreviewPayload(payload) {
  state.lastStatusPayload = payload;
  if (els.exportPreview) {
    els.exportPreview.textContent = JSON.stringify(payload, null, 2);
  }
}

export function sanitizeFileName(value) {
  return String(value || "pixi-ui-project")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "") || "pixi-ui-project";
}

export function handleDeleteSelectedNodeShortcut(event) {
  if (!["Delete", "Backspace"].includes(event.key) || event.metaKey || event.ctrlKey || event.altKey) {
    return false;
  }

  if (isTextEditingTarget(event.target) || state.canvasInteraction) {
    return false;
  }

  return deleteSelectedNode();
}

export function handleDeleteSelectedPageShortcut(event) {
  if (!["Delete", "Backspace"].includes(event.key) || event.metaKey || event.ctrlKey || event.altKey) {
    return false;
  }

  if (isTextEditingTarget(event.target) || state.canvasInteraction || (!isPagesKeyboardContext(event.target) && !isActivePageSelected())) {
    return false;
  }

  return deleteActivePage();
}

export function isPagesKeyboardContext(target) {
  return target instanceof Element && Boolean(target.closest("#pagesList"));
}

export function isActivePageSelected() {
  if (state.editingComponentId) {
    return false;
  }

  return state.selectedPageId === state.pageId && !state.selectedNodeId;
}

export function isTextEditingTarget(target) {
  if (!(target instanceof Element)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return target.isContentEditable || ["input", "textarea", "select"].includes(tagName);
}

export function loadLayoutState() {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY);
    if (!raw) {
      return createDefaultLayout();
    }
    const parsed = JSON.parse(raw);
    if (parsed?.profileVersion !== LAYOUT_PROFILE_VERSION) {
      return createDefaultLayout();
    }
    return normalizeLayoutState(parsed);
  } catch {
    return createDefaultLayout();
  }
}

export function saveLayoutState() {
  try {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(state.layout));
  } catch {
    // Layout persistence is nice-to-have; editing must keep working without storage.
  }
}

export function normalizeLayoutState(layout) {
  const defaultLayout = createDefaultLayout();
  return {
    ...defaultLayout,
    ...layout,
    profileVersion: LAYOUT_PROFILE_VERSION,
    leftPanelWidth: clamp(Number(layout?.leftPanelWidth ?? defaultLayout.leftPanelWidth), 180, 560),
    rightPanelWidth: clamp(Number(layout?.rightPanelWidth ?? defaultLayout.rightPanelWidth), 260, 680),
    bottomPanelHeight: clamp(Number(layout?.bottomPanelHeight ?? defaultLayout.bottomPanelHeight), 96, 460),
    validationPanelHeight: clamp(Number(layout?.validationPanelHeight ?? defaultLayout.validationPanelHeight), 88, 420),
    assetFolderWidth: clamp(Number(layout?.assetFolderWidth ?? defaultLayout.assetFolderWidth), 140, 380),
    assetTileSize: clamp(Number(layout?.assetTileSize ?? defaultLayout.assetTileSize), MIN_ASSET_TILE_SIZE, MAX_ASSET_TILE_SIZE),
    assetGridEnabled: layout?.assetGridEnabled !== false,
    leftCollapsed: Boolean(layout?.leftCollapsed),
    rightCollapsed: Boolean(layout?.rightCollapsed),
    bottomCollapsed: Boolean(layout?.bottomCollapsed),
    panels: normalizePanelLayout(layout?.panels)
  };
}

export function normalizePanelLayout(panels = {}) {
  const normalized = createDefaultPanelLayout();
  for (const [panelId, definition] of Object.entries(PANEL_DEFINITIONS)) {
    const source = panels?.[panelId] || {};
    const zone = DOCK_ZONE_NAMES.includes(source.zone) ? source.zone : definition.defaultZone;
    const size = Number.isFinite(Number(source.size)) && Number(source.size) > 0
      ? Number(source.size)
      : Number(definition.defaultSize);
    normalized[panelId] = {
      zone,
      order: Number.isFinite(Number(source.order)) ? Number(source.order) : definition.defaultOrder,
      visible: source.visible ?? (definition.defaultVisible !== false),
      ...(Number.isFinite(size) && size > 0 ? { size } : {})
    };
  }

  for (const zoneName of DOCK_ZONE_NAMES) {
    getPanelIdsForZone(zoneName, normalized)
      .forEach((panelId, order) => {
        normalized[panelId].order = order;
      });
  }

  return normalized;
}

export function cloneLayoutState(layout) {
  return normalizeLayoutState(JSON.parse(JSON.stringify(layout || createDefaultLayout())));
}
