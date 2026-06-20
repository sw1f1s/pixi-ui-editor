// event binding and DOM action wiring.
import { els, state, bindEditorApi } from "../app/editorRuntime.js";
import { LAYOUT_PRESETS, createDefaultLayout, createDefaultPanelLayout } from "../app/editorConfig.js";
const {
  addAtlasFrame,
  applyAtlasFrameForm,
  applyCustomDeviceProfile,
  applyDeviceProfile,
  applyLayoutState,
  bindAssetBrowserResize,
  bindDockPanels,
  bindResizeHandles,
  centerCanvasView,
  clearInspectorAssetDropTargets,
  clearPersistentAssetsAndProject,
  cloneLayoutState,
  closeAnchorPresetMenus,
  closeAtlasEditor,
  closeFloatingMenusOnOutsideClick,
  closePanelOptionsMenus,
  closeStartupDialog,
  copySelectedNodeToClipboard,
  createComponentFromSelection,
  createEditorPage,
  createInstanceFromSelectedLayer,
  createNewProjectFromDeviceFlow,
  createNewProjectFromStartup,
  createUiNode,
  deleteActivePage,
  deleteComponentDefinition,
  deletePageById,
  deleteSelectedAtlasFrame,
  deleteSelectedNode,
  detachSelectedInstanceNode,
  drawAtlasPreview,
  enterComponentEditMode,
  exitComponentEditMode,
  exportRuntimeBundle,
  fillCanvasView,
  getAtlasFrameInputs,
  getComponentReferenceId,
  getSelectedNode,
  handleAssetFolderClick,
  handleAssetListScroll,
  handleAtlasFrameListClick,
  handleAtlasPreviewClick,
  handleAtlasSpriteModeChange,
  handleCanvasDragOver,
  handleCanvasDrop,
  handleCanvasWheel,
  handleEditorKeyDown,
  handleInspectorAssetDragOver,
  handleInspectorAssetDrop,
  handleLayerTreeDragOver,
  handleLayerTreeDrop,
  handleNumericInputPointerDown,
  importAssetsFromFiles,
  importProjectFromFile,
  openAssetContextFolder,
  openAssetContextSpriteEditor,
  openCanvasContextMenu,
  openLayersContextMenu,
  openPagesContextMenu,
  openProjectFileFromDevice,
  openProjectFileFromStartup,
  pasteNodeFromClipboard,
  redoLastCommand,
  renameCurrentProject,
  renderAssets,
  renderCanvas,
  renderComponents,
  renderDeviceProfileList,
  renderPages,
  resetAssetRenderLimit,
  saveLayoutState,
  saveProjectFileToDevice,
  selectComponentUsage,
  selectNodeOnCanvasClick,
  setAddMenuOpen,
  setAssetContextMenuOpen,
  setAssetGridMode,
  setAssetViewMenuOpen,
  setCanvasContextMenuOpen,
  setCanvasContextSubmenuOpen,
  setCanvasZoomFromPercent,
  setDeviceMenuOpen,
  setDockPanelVisible,
  setHistoryMenuOpen,
  setInstanceContextMenuOpen,
  setLayoutMenuOpen,
  setPageContextMenuOpen,
  setProjectMenuOpen,
  setWindowMenuOpen,
  startCanvasTransformInteraction,
  startComponentRename,
  startPageRename,
  suppressNumericInputDragClick,
  toggleDockPanelVisibility,
  togglePanel,
  undoLastCommand,
  updateAssetTileSize,
  updateCanvasCursor,
  updateNumericInputHoverState
} = bindEditorApi([
  "addAtlasFrame",
  "applyAtlasFrameForm",
  "applyCustomDeviceProfile",
  "applyDeviceProfile",
  "applyLayoutState",
  "bindAssetBrowserResize",
  "bindDockPanels",
  "bindResizeHandles",
  "centerCanvasView",
  "clearInspectorAssetDropTargets",
  "clearPersistentAssetsAndProject",
  "cloneLayoutState",
  "closeAnchorPresetMenus",
  "closeAtlasEditor",
  "closeFloatingMenusOnOutsideClick",
  "closePanelOptionsMenus",
  "closeStartupDialog",
  "copySelectedNodeToClipboard",
  "createComponentFromSelection",
  "createEditorPage",
  "createInstanceFromSelectedLayer",
  "createNewProjectFromDeviceFlow",
  "createNewProjectFromStartup",
  "createUiNode",
  "deleteActivePage",
  "deleteComponentDefinition",
  "deletePageById",
  "deleteSelectedAtlasFrame",
  "deleteSelectedNode",
  "detachSelectedInstanceNode",
  "drawAtlasPreview",
  "enterComponentEditMode",
  "exitComponentEditMode",
  "exportRuntimeBundle",
  "fillCanvasView",
  "getAtlasFrameInputs",
  "getComponentReferenceId",
  "getSelectedNode",
  "handleAssetFolderClick",
  "handleAssetListScroll",
  "handleAtlasFrameListClick",
  "handleAtlasPreviewClick",
  "handleAtlasSpriteModeChange",
  "handleCanvasDragOver",
  "handleCanvasDrop",
  "handleCanvasWheel",
  "handleEditorKeyDown",
  "handleInspectorAssetDragOver",
  "handleInspectorAssetDrop",
  "handleLayerTreeDragOver",
  "handleLayerTreeDrop",
  "handleNumericInputPointerDown",
  "importAssetsFromFiles",
  "importProjectFromFile",
  "openAssetContextFolder",
  "openAssetContextSpriteEditor",
  "openCanvasContextMenu",
  "openLayersContextMenu",
  "openPagesContextMenu",
  "openProjectFileFromDevice",
  "openProjectFileFromStartup",
  "pasteNodeFromClipboard",
  "redoLastCommand",
  "renameCurrentProject",
  "renderAssets",
  "renderCanvas",
  "renderComponents",
  "renderDeviceProfileList",
  "renderPages",
  "resetAssetRenderLimit",
  "saveLayoutState",
  "saveProjectFileToDevice",
  "selectComponentUsage",
  "selectNodeOnCanvasClick",
  "setAddMenuOpen",
  "setAssetContextMenuOpen",
  "setAssetGridMode",
  "setAssetViewMenuOpen",
  "setCanvasContextMenuOpen",
  "setCanvasContextSubmenuOpen",
  "setCanvasZoomFromPercent",
  "setDeviceMenuOpen",
  "setDockPanelVisible",
  "setHistoryMenuOpen",
  "setInstanceContextMenuOpen",
  "setLayoutMenuOpen",
  "setPageContextMenuOpen",
  "setProjectMenuOpen",
  "setWindowMenuOpen",
  "startCanvasTransformInteraction",
  "startComponentRename",
  "startPageRename",
  "suppressNumericInputDragClick",
  "toggleDockPanelVisibility",
  "togglePanel",
  "undoLastCommand",
  "updateAssetTileSize",
  "updateCanvasCursor",
  "updateNumericInputHoverState"
]);

export function bindActions() {
  window.addEventListener("resize", () => {
    renderCanvas();
    drawAtlasPreview();
  });
  document.addEventListener("click", closeFloatingMenusOnOutsideClick);
  document.addEventListener("click", closeAnchorPresetMenus);
  document.addEventListener("click", suppressNumericInputDragClick, true);
  document.addEventListener("keydown", handleEditorKeyDown);
  document.addEventListener("mousedown", handleNumericInputPointerDown, true);
  document.addEventListener("mousemove", updateNumericInputHoverState, true);
  renderDeviceProfileList();

  els.addMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = els.addMenuButton.getAttribute("aria-expanded") === "true";
    setAddMenuOpen(!expanded);
    setHistoryMenuOpen(false);
    setProjectMenuOpen(false);
    setLayoutMenuOpen(false);
    setDeviceMenuOpen(false);
    setWindowMenuOpen(false);
    setAssetViewMenuOpen(false);
    closePanelOptionsMenus();
    setCanvasContextMenuOpen(false);
    setAssetContextMenuOpen(false);
    setPageContextMenuOpen(false);
  });

  els.addMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  els.projectMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = els.projectMenuButton.getAttribute("aria-expanded") === "true";
    setProjectMenuOpen(!expanded);
    setAddMenuOpen(false);
    setLayoutMenuOpen(false);
    setDeviceMenuOpen(false);
    setWindowMenuOpen(false);
    setAssetViewMenuOpen(false);
    closePanelOptionsMenus();
    setCanvasContextMenuOpen(false);
    setAssetContextMenuOpen(false);
    setPageContextMenuOpen(false);
  });
  els.projectMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  els.undoButton.addEventListener("click", () => {
    if (undoLastCommand()) {
      setProjectMenuOpen(false);
    }
  });
  els.redoButton.addEventListener("click", () => {
    if (redoLastCommand()) {
      setProjectMenuOpen(false);
    }
  });
  els.newProjectButton.addEventListener("click", () => {
    createNewProjectFromDeviceFlow();
    setProjectMenuOpen(false);
  });
  els.renameProjectButton.addEventListener("click", () => {
    renameCurrentProject();
    setProjectMenuOpen(false);
  });
  els.openProjectFileButton.addEventListener("click", () => {
    openProjectFileFromDevice();
    setProjectMenuOpen(false);
  });
  els.saveProjectFileButton.addEventListener("click", () => {
    saveProjectFileToDevice();
    setProjectMenuOpen(false);
  });
  els.importFileInput.addEventListener("change", importProjectFromFile);
  els.startupOpenProjectButton.addEventListener("click", openProjectFileFromStartup);
  els.startupNewProjectButton.addEventListener("click", createNewProjectFromStartup);
  els.startupContinueButton.addEventListener("click", closeStartupDialog);
  els.assetContextSpriteEditorButton.addEventListener("click", openAssetContextSpriteEditor);
  els.assetContextOpenFolderButton.addEventListener("click", openAssetContextFolder);
  els.assetContextMenu.addEventListener("click", (event) => event.stopPropagation());
  els.contextAddMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setCanvasContextSubmenuOpen(!els.canvasContextMenu.classList.contains("is-submenu-open"));
  });
  els.contextCopyNodeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    copySelectedNodeToClipboard();
    setCanvasContextMenuOpen(false);
  });
  els.contextPasteNodeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    pasteNodeFromClipboard(state.contextMenuParentId, state.contextMenuWorldPoint);
    setCanvasContextMenuOpen(false);
  });
  els.contextDeleteNodeButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setCanvasContextMenuOpen(false);
    deleteSelectedNode();
  });
  els.contextCreateInstanceButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setCanvasContextMenuOpen(false);
    createInstanceFromSelectedLayer();
  });
  els.contextEditInstanceButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const componentId = getComponentReferenceId(getSelectedNode());
    setCanvasContextMenuOpen(false);
    enterComponentEditMode(componentId);
  });
  els.contextDetachInstanceButton.addEventListener("click", (event) => {
    event.stopPropagation();
    setCanvasContextMenuOpen(false);
    detachSelectedInstanceNode();
  });
  els.instanceSearchInput.addEventListener("input", renderComponents);
  els.instanceContextEditButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const componentId = state.instanceContextComponentId;
    setInstanceContextMenuOpen(false);
    enterComponentEditMode(componentId);
  });
  els.instanceContextRenameButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const componentId = state.instanceContextComponentId;
    setInstanceContextMenuOpen(false);
    startComponentRename(componentId);
  });
  els.instanceContextSelectUsageButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const componentId = state.instanceContextComponentId;
    setInstanceContextMenuOpen(false);
    selectComponentUsage(componentId);
  });
  els.instanceContextDeleteButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const componentId = state.instanceContextComponentId;
    setInstanceContextMenuOpen(false);
    deleteComponentDefinition(componentId);
  });
  els.instanceContextMenu.addEventListener("click", (event) => event.stopPropagation());
  els.clearAssetsButton.addEventListener("click", () => {
    setAssetViewMenuOpen(false);
    clearPersistentAssetsAndProject();
  });
  els.assetFileInput.addEventListener("change", importAssetsFromFiles);
  els.assetFolderInput.addEventListener("change", importAssetsFromFiles);
  els.importAssetsButton.addEventListener("click", () => {
    setAssetViewMenuOpen(false);
    els.assetFileInput.click();
  });
  els.importAssetFolderButton.addEventListener("click", () => {
    setAssetViewMenuOpen(false);
    els.assetFolderInput.click();
  });
  els.assetTypeFilter.addEventListener("change", () => {
    resetAssetRenderLimit();
    renderAssets();
  });
  els.assetSearchInput.addEventListener("input", () => {
    resetAssetRenderLimit();
    renderAssets();
  });
  els.assetsList.addEventListener("scroll", handleAssetListScroll);
  els.assetViewMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = els.assetViewMenuButton.getAttribute("aria-expanded") === "true";
    setAssetViewMenuOpen(!expanded);
    setHistoryMenuOpen(false);
    setProjectMenuOpen(false);
    setDeviceMenuOpen(false);
    setLayoutMenuOpen(false);
    setWindowMenuOpen(false);
    setAddMenuOpen(false);
    setCanvasContextMenuOpen(false);
    setAssetContextMenuOpen(false);
    setPageContextMenuOpen(false);
    setInstanceContextMenuOpen(false);
  });
  els.assetViewMenu.addEventListener("click", (event) => event.stopPropagation());
  els.assetGridToggle.addEventListener("click", () => setAssetGridMode(true));
  els.assetListToggle.addEventListener("click", () => setAssetGridMode(false));
  els.assetClosePanelButton.addEventListener("click", () => {
    setAssetViewMenuOpen(false);
    setDockPanelVisible("assets", false);
  });
  els.assetTileSizeSlider.addEventListener("input", updateAssetTileSize);
  els.assetTileSizeSlider.addEventListener("change", saveLayoutState);
  els.assetFolderList.addEventListener("click", handleAssetFolderClick);
  els.pageSearchInput.addEventListener("input", renderPages);
  els.addPageButton.addEventListener("click", createEditorPage);
  els.deletePageButton.addEventListener("click", deleteActivePage);
  els.pageContextAddButton.addEventListener("click", () => {
    setPageContextMenuOpen(false);
    createEditorPage();
  });
  els.pageContextRenameButton.addEventListener("click", () => {
    const pageId = state.pageContextPageId;
    setPageContextMenuOpen(false);
    startPageRename(pageId);
  });
  els.pageContextDeleteButton.addEventListener("click", () => {
    const pageId = state.pageContextPageId;
    setPageContextMenuOpen(false);
    deletePageById(pageId);
  });
  els.pagesList.addEventListener("contextmenu", openPagesContextMenu);
  els.createComponentButton.addEventListener("click", createComponentFromSelection);
  els.backToPageButton.addEventListener("click", exitComponentEditMode);

  els.addNodeButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const isContextAction = button.closest("#canvasContextMenu");
      createUiNode(
        button.dataset.addNode,
        isContextAction ? state.contextMenuWorldPoint : null,
        isContextAction ? state.contextMenuParentId : null
      );
      setAddMenuOpen(false);
      setCanvasContextMenuOpen(false);
    });
  });
  els.layersList.addEventListener("contextmenu", openLayersContextMenu);
  els.layersList.addEventListener("dragover", handleLayerTreeDragOver);
  els.layersList.addEventListener("drop", handleLayerTreeDrop);
  els.inspectorForm.addEventListener("dragover", handleInspectorAssetDragOver);
  els.inspectorForm.addEventListener("drop", handleInspectorAssetDrop);
  els.inspectorForm.addEventListener("dragleave", clearInspectorAssetDropTargets);

  els.exportButton.addEventListener("click", () => {
    exportRuntimeBundle();
    setProjectMenuOpen(false);
  });

  els.layoutMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = els.layoutMenuButton.getAttribute("aria-expanded") === "true";
    setLayoutMenuOpen(!expanded);
    setHistoryMenuOpen(false);
    setProjectMenuOpen(false);
    setAddMenuOpen(false);
    setDeviceMenuOpen(false);
    setWindowMenuOpen(false);
    setAssetViewMenuOpen(false);
    closePanelOptionsMenus();
    setCanvasContextMenuOpen(false);
    setAssetContextMenuOpen(false);
    setPageContextMenuOpen(false);
  });

  els.layoutMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  els.layoutMenu.querySelectorAll("[data-layout-preset]").forEach((button) => {
    button.addEventListener("click", () => {
      const preset = LAYOUT_PRESETS[button.dataset.layoutPreset];
      if (!preset) {
        return;
      }
      state.layout = cloneLayoutState(preset);
      saveLayoutState();
      applyLayoutState();
    });
  });
  els.windowMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = els.windowMenuButton.getAttribute("aria-expanded") === "true";
    setWindowMenuOpen(!expanded);
    setHistoryMenuOpen(false);
    setProjectMenuOpen(false);
    setAddMenuOpen(false);
    setLayoutMenuOpen(false);
    setDeviceMenuOpen(false);
    setAssetViewMenuOpen(false);
    closePanelOptionsMenus();
    setCanvasContextMenuOpen(false);
    setAssetContextMenuOpen(false);
    setPageContextMenuOpen(false);
  });
  els.windowMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  els.windowMenuList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-window-panel]");
    if (!button) {
      return;
    }
    toggleDockPanelVisibility(button.dataset.windowPanel);
  });
  els.resetWindowsButton.addEventListener("click", () => {
    state.layout = {
      ...state.layout,
      panels: createDefaultPanelLayout(),
      leftCollapsed: false,
      rightCollapsed: false,
      bottomCollapsed: false
    };
    saveLayoutState();
    applyLayoutState();
  });
  els.deviceMenuButton.addEventListener("click", (event) => {
    event.stopPropagation();
    const expanded = els.deviceMenuButton.getAttribute("aria-expanded") === "true";
    setDeviceMenuOpen(!expanded);
    setHistoryMenuOpen(false);
    setProjectMenuOpen(false);
    setAddMenuOpen(false);
    setLayoutMenuOpen(false);
    setWindowMenuOpen(false);
    setAssetViewMenuOpen(false);
    closePanelOptionsMenus();
    setCanvasContextMenuOpen(false);
    setAssetContextMenuOpen(false);
    setPageContextMenuOpen(false);
  });

  els.deviceMenu.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  els.deviceProfileList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-device-profile]");
    if (!button) {
      return;
    }
    applyDeviceProfile(button.dataset.deviceProfile);
    setDeviceMenuOpen(false);
  });

  els.customDeviceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (applyCustomDeviceProfile()) {
      setDeviceMenuOpen(false);
    }
  });

  els.toggleLeftPanelButton.addEventListener("click", () => togglePanel("leftCollapsed"));
  els.toggleRightPanelButton.addEventListener("click", () => togglePanel("rightCollapsed"));
  els.toggleBottomPanelButton.addEventListener("click", () => togglePanel("bottomCollapsed"));

  els.resetLayoutButton.addEventListener("click", () => {
    state.layout = createDefaultLayout();
    saveLayoutState();
    applyLayoutState();
  });

  els.canvas.addEventListener("click", selectNodeOnCanvasClick);
  els.canvas.addEventListener("contextmenu", openCanvasContextMenu);
  els.canvas.addEventListener("wheel", handleCanvasWheel, { passive: false });
  els.canvas.addEventListener("dragover", handleCanvasDragOver);
  els.canvas.addEventListener("drop", handleCanvasDrop);
  els.atlasEditorDialog.addEventListener("click", (event) => {
    if (event.target === els.atlasEditorDialog) {
      closeAtlasEditor();
    }
  });
  els.atlasEditorCloseButton.addEventListener("click", closeAtlasEditor);
  els.atlasEditorAddFrameButton.addEventListener("click", addAtlasFrame);
  els.atlasEditorApplyButton.addEventListener("click", applyAtlasFrameForm);
  els.atlasEditorDeleteFrameButton.addEventListener("click", deleteSelectedAtlasFrame);
  els.atlasSpriteMode.addEventListener("change", handleAtlasSpriteModeChange);
  els.atlasFrameList.addEventListener("click", handleAtlasFrameListClick);
  els.atlasPreviewCanvas.addEventListener("click", handleAtlasPreviewClick);
  els.atlasFrameForm.addEventListener("submit", (event) => {
    event.preventDefault();
    applyAtlasFrameForm();
  });
  for (const input of getAtlasFrameInputs()) {
    input.addEventListener("input", drawAtlasPreview);
  }
  els.zoomSlider.addEventListener("input", () => {
    setCanvasZoomFromPercent(Number(els.zoomSlider.value));
  });
  els.centerCanvasButton.addEventListener("click", centerCanvasView);
  els.fillCanvasButton.addEventListener("click", fillCanvasView);

  const pointerEventName = window.PointerEvent ? "pointer" : "mouse";
  els.canvas.addEventListener(`${pointerEventName}down`, startCanvasTransformInteraction);
  els.canvas.addEventListener(`${pointerEventName}move`, updateCanvasCursor);
  els.canvas.addEventListener(`${pointerEventName}leave`, () => {
    if (!state.canvasInteraction) {
      els.canvas.style.cursor = "grab";
    }
  });

  bindResizeHandles();
  bindDockPanels();
  bindAssetBrowserResize();
}
