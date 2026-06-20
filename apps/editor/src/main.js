import { createPlainPixiAdapter, createRendererFactory } from "./app/editorDeps.js";
import { ASSET_RENDER_BATCH_SIZE, DEFAULT_CANVAS_VIEW } from "./app/editorConfig.js";
import { createEditorElements } from "./app/editorElements.js";
import { editorApi, registerEditorApi, session, setEditorElements, setEditorState } from "./app/editorRuntime.js";
import * as projectFactory from "./features/projectFactory.js";
import * as actions from "./features/actions.js";
import * as layoutController from "./features/layoutController.js";
import * as menus from "./features/menus.js";
import * as projectFiles from "./features/projectFiles.js";
import * as assets from "./features/assets.js";
import * as documentController from "./features/documentController.js";
import * as nodeActions from "./features/nodeActions.js";
import * as sidebarViews from "./features/sidebarViews.js";
import * as inspector from "./features/inspector.js";
import * as canvasRenderer from "./features/canvasRenderer.js";
import * as canvasInteractions from "./features/canvasInteractions.js";
import * as selectors from "./features/selectors.js";

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
  previewTheme: "default",
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
