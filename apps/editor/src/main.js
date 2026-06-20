import { createPlainPixiAdapter, createRendererFactory } from "./app/editorDeps.js?v=20260620-designless";
import { ASSET_RENDER_BATCH_SIZE, DEFAULT_CANVAS_VIEW } from "./app/editorConfig.js?v=20260620-designless";
import { createEditorElements } from "./app/editorElements.js?v=20260620-designless";
import { editorApi, registerEditorApi, session, setEditorElements, setEditorState } from "./app/editorRuntime.js?v=20260620-designless";
import * as projectFactory from "./features/projectFactory.js?v=20260620-designless";
import * as actions from "./features/actions.js?v=20260620-designless";
import * as layoutController from "./features/layoutController.js?v=20260620-designless";
import * as menus from "./features/menus.js?v=20260620-designless";
import * as projectFiles from "./features/projectFiles.js?v=20260620-designless";
import * as assets from "./features/assets.js?v=20260620-designless";
import * as documentController from "./features/documentController.js?v=20260620-designless";
import * as nodeActions from "./features/nodeActions.js?v=20260620-designless";
import * as sidebarViews from "./features/sidebarViews.js?v=20260620-designless";
import * as inspector from "./features/inspector.js?v=20260620-designless";
import * as canvasRenderer from "./features/canvasRenderer.js?v=20260620-designless";
import * as canvasInteractions from "./features/canvasInteractions.js?v=20260620-designless";
import * as selectors from "./features/selectors.js?v=20260620-designless";

registerEditorApi(
  projectFactory,
  actions,
  layoutController,
  menus,
  projectFiles,
  assets,
  documentController,
  nodeActions,
  sidebarViews,
  inspector,
  canvasRenderer,
  canvasInteractions,
  selectors
);

const elements = createEditorElements(document);
setEditorElements(elements);
session.canvasContext = elements.canvas.getContext("2d");
session.editorPreviewRenderer = createRendererFactory({ adapter: createPlainPixiAdapter() });

const initialProject = editorApi.loadStoredProject() || editorApi.seedProject();
setEditorState({
  project: initialProject,
  pageId: editorApi.getInitialPageId(initialProject),
  selectedNodeId: null,
  selectedAssetId: null,
  selectedAssetFolder: "all",
  assetRenderLimit: ASSET_RENDER_BATCH_SIZE,
  canvasInteraction: null,
  canvasView: { ...DEFAULT_CANVAS_VIEW },
  contextMenuWorldPoint: null,
  contextMenuParentId: null,
  pageContextPageId: null,
  selectedPageId: editorApi.getInitialPageId(initialProject),
  renamingPageId: null,
  assetContextMenuAssetId: null,
  instanceContextComponentId: null,
  editingComponentId: null,
  renamingComponentId: null,
  componentDragId: null,
  layerDragNodeId: null,
  assetDragId: null,
  nodeClipboard: null,
  dockDragPanelId: null,
  collapsedLayerIds: new Set(),
  collapsedAssetFolderPaths: new Set(),
  atlasEditor: null,
  smartGuides: null,
  suppressNextCanvasClick: false,
  lastStatusPayload: null,
  history: [],
  redoStack: [],
  layout: editorApi.loadLayoutState()
});

editorApi.applyLayoutState();
editorApi.bindActions();
editorApi.render();
editorApi.restorePersistentAssetSources("startup");
editorApi.showStartupDialogIfNeeded();
