import { els, state, session, bindEditorApi } from "../../app/editorRuntime.js";
import { ASSET_TYPES, createId, NODE_COMPONENT_TYPES } from "../../app/editorDeps.js";
import { ASSET_BLOB_STORE, ASSET_DATABASE_NAME, ASSET_DATABASE_VERSION, ASSET_DB_URL_PREFIX, IMPORT_YIELD_INTERVAL } from "../../app/editorConfig.js";

const api = bindEditorApi([
  "clamp",
  "escapeHtml",
  "getAssetById",
  "getAssetImageSrc",
  "getAtlasFrame",
  "getCachedAssetImage",
  "getFirstAtlasFrameName",
  "getNodeComponentProps",
  "getSelectedNode",
  "hasNodeComponent",
  "normalizeNineSlice",
  "persistCurrentProjectDocument",
  "render",
  "renderAssets",
  "renderCanvas",
  "resetAssetRenderLimit",
  "runCommand",
  "setExportPreviewPayload",
  "updateSelectedSpriteFrame"
]);

export {
  ASSET_BLOB_STORE,
  ASSET_DATABASE_NAME,
  ASSET_DATABASE_VERSION,
  ASSET_DB_URL_PREFIX,
  ASSET_TYPES,
  createId,
  els,
  IMPORT_YIELD_INTERVAL,
  NODE_COMPONENT_TYPES,
  session,
  state
};

export const {
  clamp,
  escapeHtml,
  getAssetById,
  getAssetImageSrc,
  getAtlasFrame,
  getCachedAssetImage,
  getFirstAtlasFrameName,
  getNodeComponentProps,
  getSelectedNode,
  hasNodeComponent,
  normalizeNineSlice,
  persistCurrentProjectDocument,
  render,
  renderAssets,
  renderCanvas,
  resetAssetRenderLimit,
  runCommand,
  setExportPreviewPayload,
  updateSelectedSpriteFrame
} = api;
