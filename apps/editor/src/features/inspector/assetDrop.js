import {
  ASSET_TYPES,
  els,
  finishAssetDrag,
  getAssetById,
  getDraggedAssetId,
  getSelectedNode,
  hasNodeComponent,
  isTextureDropAsset,
  NODE_COMPONENT_TYPES
} from "./deps.js";
import {
  applyFontAssetToSelectedText,
  updateSelectedSpriteAsset
} from "./componentMutations.js";

const INSPECTOR_DROP_APPLIERS = Object.freeze({
  font: applyFontAssetToSelectedText,
  texture: updateSelectedSpriteAsset
});

const INSPECTOR_DROP_TARGET_MATCHERS = Object.freeze({
  font: (asset, selectedNode) => asset.type === ASSET_TYPES.font && hasNodeComponent(selectedNode, NODE_COMPONENT_TYPES.text),
  texture: (asset, selectedNode) => isTextureDropAsset(asset) && hasNodeComponent(selectedNode, NODE_COMPONENT_TYPES.texture)
});

export function handleInspectorAssetDragOver(event) {
  const assetId = getDraggedAssetId(event);
  const target = getInspectorAssetDropTarget(event, assetId);
  if (!target) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  clearInspectorAssetDropTargets();
  target.classList.add("is-drag-over");
}

export function handleInspectorAssetDrop(event) {
  const assetId = getDraggedAssetId(event);
  const target = getInspectorAssetDropTarget(event, assetId);
  if (!target) {
    return;
  }

  event.preventDefault();
  clearInspectorAssetDropTargets();
  applyAssetDropToInspector(assetId, target.dataset.assetDropAccept);
  finishAssetDrag();
}

export function clearInspectorAssetDropTargets() {
  els.inspectorForm.querySelectorAll(".asset-drop-field.is-drag-over")
    .forEach((field) => field.classList.remove("is-drag-over"));
}

export function getInspectorAssetDropTarget(event, assetId) {
  const asset = getAssetById(assetId);
  const field = event.target.closest(".asset-drop-field");
  if (!asset || !field || !els.inspectorForm.contains(field)) {
    return null;
  }

  const accept = field.dataset.assetDropAccept;
  const matcher = INSPECTOR_DROP_TARGET_MATCHERS[accept];
  return matcher?.(asset, getSelectedNode()) ? field : null;
}

export function applyAssetDropToInspector(assetId, accept) {
  const applyDrop = INSPECTOR_DROP_APPLIERS[accept];
  return applyDrop ? applyDrop(assetId) : false;
}
