// menus and keyboard shortcuts.
import { els, state, bindEditorApi } from "../app/editorRuntime.js?v=20260620-designless";
const {
  canCopySelectedNode,
  canCreateInstanceFromSelectedLayer,
  canDeleteSelectedNode,
  canEditSelectedInstanceNode,
  canPasteNodeFromClipboard,
  clamp,
  closeAnchorPresetMenus,
  closeComponentAddMenus,
  copySelectedNodeToClipboard,
  createNewProjectFromDeviceFlow,
  getAssetById,
  getComponentById,
  getSelectedNode,
  handleDeleteSelectedNodeShortcut,
  handleDeleteSelectedPageShortcut,
  isComponentInstanceNode,
  isMissingComponentInstanceNode,
  isTextEditingTarget,
  isTextureDropAsset,
  openProjectFileFromDevice,
  pasteNodeFromClipboard,
  redoLastCommand,
  renderWindowMenu,
  saveProjectFileToDevice,
  undoLastCommand
} = bindEditorApi([
  "canCopySelectedNode",
  "canCreateInstanceFromSelectedLayer",
  "canDeleteSelectedNode",
  "canEditSelectedInstanceNode",
  "canPasteNodeFromClipboard",
  "clamp",
  "closeAnchorPresetMenus",
  "closeComponentAddMenus",
  "copySelectedNodeToClipboard",
  "createNewProjectFromDeviceFlow",
  "getAssetById",
  "getComponentById",
  "getSelectedNode",
  "handleDeleteSelectedNodeShortcut",
  "handleDeleteSelectedPageShortcut",
  "isComponentInstanceNode",
  "isMissingComponentInstanceNode",
  "isTextEditingTarget",
  "isTextureDropAsset",
  "openProjectFileFromDevice",
  "pasteNodeFromClipboard",
  "redoLastCommand",
  "renderWindowMenu",
  "saveProjectFileToDevice",
  "undoLastCommand"
]);

export function setLayoutMenuOpen(open) {
  els.layoutMenu.hidden = !open;
  els.layoutMenuButton.setAttribute("aria-expanded", String(open));
}

export function setWindowMenuOpen(open) {
  els.windowMenu.hidden = !open;
  els.windowMenuButton.setAttribute("aria-expanded", String(open));
  if (open) {
    renderWindowMenu();
  }
}

export function setAddMenuOpen(open) {
  els.addMenu.hidden = !open;
  els.addMenuButton.setAttribute("aria-expanded", String(open));
}

export function setHistoryMenuOpen(open) {
  void open;
}

export function setProjectMenuOpen(open) {
  els.projectMenu.hidden = !open;
  els.projectMenuButton.setAttribute("aria-expanded", String(open));
}

export function setDeviceMenuOpen(open) {
  els.deviceMenu.hidden = !open;
  els.deviceMenuButton.setAttribute("aria-expanded", String(open));
}

export function setAssetViewMenuOpen(open) {
  els.assetViewMenu.hidden = !open;
  els.assetViewMenuButton.setAttribute("aria-expanded", String(open));
  if (!open) {
    els.assetViewMenu.style.left = "";
    els.assetViewMenu.style.top = "";
    return;
  }

  syncAssetViewMenu();
  closePanelOptionsMenus();
  positionAssetViewMenu();
  requestAnimationFrame(() => {
    if (!els.assetViewMenu.hidden) {
      positionAssetViewMenu();
    }
  });
}

export function positionAssetViewMenu() {
  const buttonRect = els.assetViewMenuButton.getBoundingClientRect();
  const menuRect = els.assetViewMenu.getBoundingClientRect();
  const left = clamp(buttonRect.right - menuRect.width, 8, Math.max(8, window.innerWidth - menuRect.width - 8));
  let top = buttonRect.bottom + 6;
  if (top + menuRect.height > window.innerHeight - 8) {
    top = buttonRect.top - menuRect.height - 6;
  }
  top = clamp(top, 8, Math.max(8, window.innerHeight - menuRect.height - 8));
  els.assetViewMenu.style.left = `${Math.round(left)}px`;
  els.assetViewMenu.style.top = `${Math.round(top)}px`;
}

export function syncAssetViewMenu() {
  const isGrid = Boolean(state.layout.assetGridEnabled);
  els.assetGridToggle.setAttribute("aria-pressed", String(isGrid));
  els.assetListToggle.setAttribute("aria-pressed", String(!isGrid));
  els.assetViewMenuButton.setAttribute("aria-label", `Asset view options: ${isGrid ? "Grid" : "List"}`);
  els.assetViewMenuButton.title = `Asset view: ${isGrid ? "Grid" : "List"}`;
}

export function setPanelOptionsMenuOpen(controls, open) {
  const menu = controls?.querySelector(".panel-options-menu");
  const button = controls?.querySelector(".panel-options-menu-button");
  if (!menu || !button) {
    return;
  }

  menu.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  if (open) {
    closePanelOptionsMenus(controls);
  }
}

export function closePanelOptionsMenus(exceptControls = null) {
  document.querySelectorAll(".panel-options-controls").forEach((controls) => {
    if (controls === exceptControls) {
      return;
    }

    setPanelOptionsMenuOpen(controls, false);
  });
}

export function setCanvasContextMenuOpen(open, position = null) {
  els.canvasContextMenu.hidden = !open;

  if (!open) {
    setCanvasContextSubmenuOpen(false);
    els.canvasContextMenu.classList.remove("is-submenu-left");
    els.canvasContextMenu.style.left = "";
    els.canvasContextMenu.style.top = "";
    state.contextMenuWorldPoint = null;
    state.contextMenuParentId = null;
    return;
  }

  syncCanvasContextMenuActions();
  setCanvasContextSubmenuOpen(false);

  if (position) {
    els.canvasContextMenu.style.left = `${Math.round(position.x)}px`;
    els.canvasContextMenu.style.top = `${Math.round(position.y)}px`;
    positionCanvasContextMenu(position);
    requestAnimationFrame(() => {
      if (!els.canvasContextMenu.hidden) {
        positionCanvasContextMenu(position);
      }
    });
  }
}

export function setCanvasContextSubmenuOpen(open) {
  els.canvasContextMenu.classList.toggle("is-submenu-open", open);
  els.contextAddMenuButton.setAttribute("aria-expanded", String(open));
}

export function positionCanvasContextMenu(position) {
  const rect = els.canvasContextMenu.getBoundingClientRect();
  const submenuWidth = 164;
  const left = clamp(position.x, 8, Math.max(8, window.innerWidth - rect.width - 8));
  const top = clamp(position.y, 8, Math.max(8, window.innerHeight - rect.height - 8));
  els.canvasContextMenu.style.left = `${Math.round(left)}px`;
  els.canvasContextMenu.style.top = `${Math.round(top)}px`;
  els.canvasContextMenu.classList.toggle("is-submenu-left", left + rect.width + submenuWidth > window.innerWidth);
}

export function syncCanvasContextMenuActions() {
  const selectedNode = getSelectedNode();
  els.contextCopyNodeButton.hidden = !canCopySelectedNode();
  els.contextPasteNodeButton.hidden = !canPasteNodeFromClipboard();
  els.contextDeleteNodeButton.hidden = !canDeleteSelectedNode();
  els.contextCreateInstanceButton.hidden = !canCreateInstanceFromSelectedLayer();
  els.contextEditInstanceButton.hidden = !canEditSelectedInstanceNode();
  els.contextDetachInstanceButton.hidden = !isComponentInstanceNode(selectedNode) || isMissingComponentInstanceNode(selectedNode);
}

export function setAssetContextMenuOpen(open, position = null) {
  els.assetContextMenu.hidden = !open;

  if (!open) {
    state.assetContextMenuAssetId = null;
    return;
  }

  const asset = getAssetById(state.assetContextMenuAssetId);
  els.assetContextSpriteEditorButton.hidden = !isTextureDropAsset(asset);
  els.assetContextSpriteEditorButton.disabled = !isTextureDropAsset(asset);
  els.assetContextOpenFolderButton.title = "Reveal the asset folder on this device";

  if (position) {
    const rect = els.assetContextMenu.getBoundingClientRect();
    const left = clamp(position.x, 8, window.innerWidth - rect.width - 8);
    const top = clamp(position.y, 8, window.innerHeight - rect.height - 8);
    els.assetContextMenu.style.left = `${left}px`;
    els.assetContextMenu.style.top = `${top}px`;
  }
}

export function setPageContextMenuOpen(open, position = null) {
  els.pageContextMenu.hidden = !open;
  if (!open) {
    state.pageContextPageId = null;
    return;
  }

  const canDelete = state.project.pages.length > 1 && Boolean(state.pageContextPageId);
  els.pageContextRenameButton.disabled = !state.pageContextPageId;
  els.pageContextDeleteButton.hidden = !canDelete;
  els.pageContextDeleteButton.disabled = !canDelete;

  if (position) {
    const rect = els.pageContextMenu.getBoundingClientRect();
    const left = clamp(position.x, 8, window.innerWidth - rect.width - 8);
    const top = clamp(position.y, 8, window.innerHeight - rect.height - 8);
    els.pageContextMenu.style.left = `${left}px`;
    els.pageContextMenu.style.top = `${top}px`;
  }
}

export function setInstanceContextMenuOpen(open, position = null) {
  els.instanceContextMenu.hidden = !open;
  if (!open) {
    state.instanceContextComponentId = null;
    return;
  }

  const component = getComponentById(state.instanceContextComponentId);
  els.instanceContextEditButton.disabled = !component;
  els.instanceContextRenameButton.disabled = !component;
  els.instanceContextDeleteButton.disabled = !component;

  if (position) {
    const rect = els.instanceContextMenu.getBoundingClientRect();
    const left = clamp(position.x, 8, Math.max(8, window.innerWidth - rect.width - 8));
    const top = clamp(position.y, 8, Math.max(8, window.innerHeight - rect.height - 8));
    els.instanceContextMenu.style.left = `${Math.round(left)}px`;
    els.instanceContextMenu.style.top = `${Math.round(top)}px`;
  }
}

export function closeFloatingMenusOnOutsideClick(event) {
  if (!els.projectMenu.hidden && !event.target.closest(".project-controls")) {
    setProjectMenuOpen(false);
  }
  if (!els.deviceMenu.hidden && !event.target.closest(".device-controls")) {
    setDeviceMenuOpen(false);
  }
  if (!els.layoutMenu.hidden && !event.target.closest(".layout-controls")) {
    setLayoutMenuOpen(false);
  }
  if (!els.windowMenu.hidden && !event.target.closest(".window-controls")) {
    setWindowMenuOpen(false);
  }
  if (!els.addMenu.hidden && !event.target.closest(".add-controls")) {
    setAddMenuOpen(false);
  }
  if (!els.assetViewMenu.hidden && !event.target.closest(".asset-view-controls") && !event.target.closest("#assetViewMenu")) {
    setAssetViewMenuOpen(false);
  }
  if (!event.target.closest(".panel-options-controls")) {
    closePanelOptionsMenus();
  }
  if (!els.canvasContextMenu.hidden && !event.target.closest("#canvasContextMenu")) {
    setCanvasContextMenuOpen(false);
  }
  if (!els.assetContextMenu.hidden && !event.target.closest("#assetContextMenu")) {
    setAssetContextMenuOpen(false);
  }
  if (!els.pageContextMenu.hidden && !event.target.closest("#pageContextMenu")) {
    setPageContextMenuOpen(false);
  }
  if (!els.instanceContextMenu.hidden && !event.target.closest("#instanceContextMenu")) {
    setInstanceContextMenuOpen(false);
  }
  if (!event.target.closest(".component-add-popover") && !event.target.closest(".component-add-button")) {
    closeComponentAddMenus();
  }
}

export function handleEditorKeyDown(event) {
  closeFloatingMenusOnEscape(event);

  if (handleCommandShortcut(event)) {
    event.preventDefault();
    return;
  }

  if (handleDeleteSelectedPageShortcut(event)) {
    event.preventDefault();
    return;
  }

  if (handleDeleteSelectedNodeShortcut(event)) {
    event.preventDefault();
  }
}

export function handleCommandShortcut(event) {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) {
    return false;
  }

  const key = event.key.toLowerCase();
  const editingText = isTextEditingTarget(event.target);
  if (key === "s") {
    void saveProjectFileToDevice();
    setProjectMenuOpen(false);
    return true;
  }

  if (key === "o") {
    void openProjectFileFromDevice();
    setProjectMenuOpen(false);
    return true;
  }

  if (key === "n") {
    void createNewProjectFromDeviceFlow();
    setProjectMenuOpen(false);
    return true;
  }

  if (editingText) {
    return false;
  }

  if (key === "z" && event.shiftKey) {
    redoLastCommand();
    return true;
  }

  if (key === "z") {
    undoLastCommand();
    return true;
  }

  if (key === "y") {
    redoLastCommand();
    return true;
  }

  if (key === "c") {
    return copySelectedNodeToClipboard();
  }

  if (key === "v") {
    return pasteNodeFromClipboard();
  }

  return false;
}

export function closeFloatingMenusOnEscape(event) {
  if (event.key === "Escape") {
    setHistoryMenuOpen(false);
    setProjectMenuOpen(false);
    setDeviceMenuOpen(false);
    setLayoutMenuOpen(false);
    setWindowMenuOpen(false);
    setAddMenuOpen(false);
    setAssetViewMenuOpen(false);
    closePanelOptionsMenus();
    setCanvasContextMenuOpen(false);
    setAssetContextMenuOpen(false);
    setPageContextMenuOpen(false);
    setInstanceContextMenuOpen(false);
    closeAnchorPresetMenus();
    closeComponentAddMenus();
  }
}
