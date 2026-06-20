import {
  ANCHOR_PRESETS,
  createAnchorsFromFrame,
  getNodeAnchorFrame,
  getNodeAnchorPresetId,
  getNodeAnchors,
  getNodeResolvedLocalFrame,
  getSelectedNode,
  isNodeLayoutManagedByParent,
  runCommand
} from "./deps.js?v=20260620-designless";
import { updateNodeLayout } from "./layoutMutations.js?v=20260620-designless";
import { isRootNode } from "./nodeState.js?v=20260620-designless";
import { normalizeInspectorValue } from "./valueNormalizers.js?v=20260620-designless";

export function updateSelectedNodeAnchorOffset(key, rawValue, renderOptions = {}) {
  const node = getSelectedNode();
  const anchors = getNodeAnchors(node);
  if (!node || isNodeLayoutManagedByParent(node) || !anchors || anchors[key] === undefined) {
    return false;
  }

  const value = normalizeInspectorValue(rawValue, "number");
  if (value === null || anchors[key] === value) {
    return false;
  }

  updateNodeLayout(node, {
    ...node.layout,
    anchors: {
      ...anchors,
      [key]: value
    }
  }, `Update ${node.name} anchors`, renderOptions);
  return true;
}

export function updateAnchoredNodeFrameValue(node, key, value, renderOptions = {}) {
  const anchors = getNodeAnchors(node);
  if (!anchors || isNodeLayoutManagedByParent(node)) {
    return false;
  }

  const frame = {
    ...getNodeResolvedLocalFrame(node),
    [key]: value
  };
  const nextLayout = {
    ...node.layout,
    anchors: createAnchorsFromFrame(frame, getNodeAnchorFrame(node), Object.keys(anchors)),
    anchorPreset: getNodeAnchorPresetId(node)
  };

  runCommand({
    type: "node.update_props",
    args: {
      nodeId: node.id,
      transform: frame,
      layout: nextLayout
    },
    meta: { source: "user", label: `Update ${node.name}` }
  }, renderOptions);
  return true;
}

export function applyAnchorPreset(node, presetId) {
  if (!node || isRootNode(node) || isNodeLayoutManagedByParent(node)) {
    return false;
  }

  const visualFrame = getNodeResolvedLocalFrame(node);
  if (presetId === "none") {
    updateNodeLayout(node, {
      ...node.layout,
      anchors: null,
      anchorPreset: "none",
      safeArea: false
    }, `Disable ${node.name} anchors`, {
      transform: visualFrame
    });
    return true;
  }

  const preset = ANCHOR_PRESETS[presetId];
  if (!preset) {
    return false;
  }

  const anchorFrame = getNodeAnchorFrame(node, { safeArea: node.layout?.safeArea === true });
  updateNodeLayout(node, {
    ...node.layout,
    mode: "absolute",
    anchorPreset: presetId,
    anchors: createAnchorsFromFrame(visualFrame, anchorFrame, preset.keys)
  }, `Apply ${preset.label} anchors to ${node.name}`);
  return true;
}

export function updateNodeAnchorSafeArea(node, safeArea) {
  if (!node || isRootNode(node) || isNodeLayoutManagedByParent(node)) {
    return false;
  }

  const anchors = getNodeAnchors(node);
  const nextLayout = {
    ...node.layout,
    safeArea
  };

  if (anchors) {
    const visualFrame = getNodeResolvedLocalFrame(node);
    const anchorFrame = getNodeAnchorFrame(node, { safeArea });
    nextLayout.anchors = createAnchorsFromFrame(visualFrame, anchorFrame, Object.keys(anchors));
  }

  updateNodeLayout(node, nextLayout, `Update ${node.name} safe area anchors`);
  return true;
}
