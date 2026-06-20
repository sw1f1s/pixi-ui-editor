// selection, geometry and primitive utilities.
import { els, state, bindEditorApi } from "../app/editorRuntime.js?v=20260620-designless";
import { collectNodes, findNodeInProject, getNodeComponentProps, NODE_COMPONENT_TYPES, NODE_TYPES, resolveChildLayoutFrames, roundCanvasNumber } from "../app/editorDeps.js?v=20260620-designless";
import { ANCHOR_PRESETS, CANVAS_VIEW_PADDING, HORIZONTAL_ANCHOR_KEYS, MAX_CANVAS_ZOOM, MIN_CANVAS_ZOOM, VERTICAL_ANCHOR_KEYS } from "../app/editorConfig.js?v=20260620-designless";
const { getComponentDisplayName, getLayerNodeName, isRootNode } = bindEditorApi(["getComponentDisplayName","getLayerNodeName","isRootNode"]);

const LAYOUT_MANAGED_MODES = new Set(["flex", "list", "grid"]);

export function updateSelectionLabel(node) {
  const frame = getNodeResolvedLocalFrame(node);
  els.selectionLabel.textContent = `Selected: ${getLayerNodeName(node)} · x ${Math.round(frame.x)} y ${Math.round(frame.y)} w ${Math.round(frame.width)} h ${Math.round(frame.height)}`;
}

export function getViewport(rect, page, view = state.canvasView) {
  const canvasSize = getCanvasSize(page);
  const fitScale = getCanvasFitScale(rect, canvasSize, CANVAS_VIEW_PADDING);
  const scale = fitScale * clamp(view.zoom, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM);
  const width = canvasSize.width * scale;
  const height = canvasSize.height * scale;
  return {
    scale,
    x: (rect.width - width) / 2 + Number(view.panX || 0),
    y: (rect.height - height) / 2 + Number(view.panY || 0)
  };
}

export function getCanvasFitScale(rect, canvasSize, padding) {
  const availableWidth = Math.max(1, rect.width - padding * 2);
  const availableHeight = Math.max(1, rect.height - padding * 2);
  return Math.max(0.01, Math.min(availableWidth / canvasSize.width, availableHeight / canvasSize.height));
}

export function getCanvasSize(page) {
  const rootTransform = page.root?.transform || {};
  const width = Number(rootTransform.width);
  const height = Number(rootTransform.height);

  return {
    width: Number.isFinite(width) && width > 0 ? roundCanvasNumber(width) : page.canvas.width,
    height: Number.isFinite(height) && height > 0 ? roundCanvasNumber(height) : page.canvas.height
  };
}

export function normalizeSafeArea(safeArea = {}) {
  return {
    top: Math.max(0, Number(safeArea.top || 0)),
    right: Math.max(0, Number(safeArea.right || 0)),
    bottom: Math.max(0, Number(safeArea.bottom || 0)),
    left: Math.max(0, Number(safeArea.left || 0))
  };
}

export function safeAreaHasInsets(safeArea) {
  return safeArea.top > 0 || safeArea.right > 0 || safeArea.bottom > 0 || safeArea.left > 0;
}

export function getSafeAreaFrame(rootFrame, canvasSize, safeArea) {
  return {
    x: rootFrame.x + safeArea.left,
    y: rootFrame.y + safeArea.top,
    width: Math.max(0, canvasSize.width - safeArea.left - safeArea.right),
    height: Math.max(0, canvasSize.height - safeArea.top - safeArea.bottom)
  };
}

export function isBoundsInside(inner, outer) {
  return inner.x >= outer.x - 0.5 &&
    inner.y >= outer.y - 0.5 &&
    inner.x + inner.width <= outer.x + outer.width + 0.5 &&
    inner.y + inner.height <= outer.y + outer.height + 0.5;
}

export function getNodeLocalFrame(node) {
  const transform = node?.transform || {};
  return {
    x: Number(transform.x || 0),
    y: Number(transform.y || 0),
    width: Math.max(0, Number(transform.width || 0)),
    height: Math.max(0, Number(transform.height || 0))
  };
}

export function getNodeResolvedLocalFrame(node, options = {}) {
  if (options.layoutFrameOverride) {
    return normalizeResolvedFrame(options.layoutFrameOverride);
  }

  const frame = getNodeLocalFrame(node);
  const anchors = getNodeAnchors(node);
  if (!anchors || isRootNode(node)) {
    return frame;
  }

  return resolveAnchoredFrame(frame, anchors, getNodeAnchorFrame(node, options));
}

export function resolveAnchoredFrame(frame, anchors, anchorFrame) {
  const resolved = { ...frame };

  if (anchors.left !== undefined && anchors.right !== undefined) {
    resolved.width = Math.max(0, anchorFrame.width - anchors.left - anchors.right);
  }
  if (anchors.top !== undefined && anchors.bottom !== undefined) {
    resolved.height = Math.max(0, anchorFrame.height - anchors.top - anchors.bottom);
  }

  if (anchors.left !== undefined) {
    resolved.x = anchorFrame.x + anchors.left;
  } else if (anchors.centerX !== undefined) {
    resolved.x = anchorFrame.x + (anchorFrame.width - resolved.width) / 2 + anchors.centerX;
  } else if (anchors.right !== undefined) {
    resolved.x = anchorFrame.x + anchorFrame.width - resolved.width - anchors.right;
  }

  if (anchors.top !== undefined) {
    resolved.y = anchorFrame.y + anchors.top;
  } else if (anchors.centerY !== undefined) {
    resolved.y = anchorFrame.y + (anchorFrame.height - resolved.height) / 2 + anchors.centerY;
  } else if (anchors.bottom !== undefined) {
    resolved.y = anchorFrame.y + anchorFrame.height - resolved.height - anchors.bottom;
  }

  return {
    x: roundCanvasNumber(resolved.x),
    y: roundCanvasNumber(resolved.y),
    width: roundCanvasNumber(resolved.width),
    height: roundCanvasNumber(resolved.height)
  };
}

export function getNodeAnchorFrame(node, options = {}) {
  const page = getActivePage();
  const safeArea = options.safeArea ?? (node?.layout?.safeArea === true);
  const parentFrame = options.parentFrame || getNodeParentLayoutFrame(node);
  if (safeArea && node?.parentId === page.root.id) {
    return getSafeAreaFrame({ x: 0, y: 0 }, getCanvasSize(page), normalizeSafeArea(page.canvas.safeArea));
  }

  return {
    x: 0,
    y: 0,
    width: Math.max(0, Number(parentFrame.width || 0)),
    height: Math.max(0, Number(parentFrame.height || 0))
  };
}

export function getNodeWorldAnchorFrame(node) {
  const parentOrigin = getNodeWorldOrigin(node?.parentId);
  const frame = getNodeAnchorFrame(node);
  return {
    x: parentOrigin.x + frame.x,
    y: parentOrigin.y + frame.y,
    width: frame.width,
    height: frame.height
  };
}

export function getNodeParentLayoutFrame(node) {
  const page = getActivePage();
  if (!node?.parentId || node.parentId === page.root.id) {
    return getCanvasSize(page);
  }

  const parent = findNodeInProject(state.project, node.parentId)?.node;
  if (!parent) {
    return getCanvasSize(page);
  }

  const bounds = getNodeWorldTransform(parent);
  return {
    width: bounds.width,
    height: bounds.height
  };
}

export function getNodeAnchors(node) {
  const anchors = node?.layout?.anchors || node?.layout?.anchor;
  return anchors && typeof anchors === "object" && !Array.isArray(anchors) ? anchors : null;
}

export function isNodeLayoutManagedByParent(node) {
  const parent = getNodeParent(node);
  return LAYOUT_MANAGED_MODES.has(getChildLayoutMode(parent));
}

export function getNodeParent(node) {
  if (!node?.id) {
    return null;
  }

  return findNodeInProject(state.project, node.id)?.parent || null;
}

export function getChildLayoutMode(node) {
  if (!node) {
    return "absolute";
  }

  const layout = {
    ...(node.layout || {}),
    ...getNodeComponentProps(node, NODE_COMPONENT_TYPES.layout)
  };
  const explicitMode = String(layout.mode || "").trim().toLowerCase();
  if (LAYOUT_MANAGED_MODES.has(explicitMode)) {
    return explicitMode;
  }

  const type = String(node.type || "").trim().toLowerCase();
  return LAYOUT_MANAGED_MODES.has(type) ? type : "absolute";
}

export function getNodeAnchorPresetId(node) {
  const anchors = getNodeAnchors(node);
  if (!anchors) {
    return "none";
  }

  if (node.layout?.anchorPreset === "custom") {
    return "custom";
  }

  const presetId = node.layout?.anchorPreset;
  if (presetId && ANCHOR_PRESETS[presetId] && anchorKeysMatch(anchors, ANCHOR_PRESETS[presetId].keys)) {
    return presetId;
  }

  const match = Object.entries(ANCHOR_PRESETS)
    .find(([id, preset]) => id !== "none" && anchorKeysMatch(anchors, preset.keys));
  return match?.[0] || "custom";
}

export function anchorKeysMatch(anchors, keys) {
  const activeKeys = [...HORIZONTAL_ANCHOR_KEYS, ...VERTICAL_ANCHOR_KEYS]
    .filter((key) => anchors[key] !== undefined)
    .sort();
  const presetKeys = [...keys].sort();
  return activeKeys.length === presetKeys.length && activeKeys.every((key, index) => key === presetKeys[index]);
}

export function createAnchorsFromFrame(frame, anchorFrame, keys) {
  const anchors = {};
  for (const key of keys) {
    if (key === "left") {
      anchors.left = roundCanvasNumber(frame.x - anchorFrame.x);
    } else if (key === "centerX") {
      anchors.centerX = roundCanvasNumber(frame.x + frame.width / 2 - (anchorFrame.x + anchorFrame.width / 2));
    } else if (key === "right") {
      anchors.right = roundCanvasNumber(anchorFrame.x + anchorFrame.width - frame.x - frame.width);
    } else if (key === "top") {
      anchors.top = roundCanvasNumber(frame.y - anchorFrame.y);
    } else if (key === "centerY") {
      anchors.centerY = roundCanvasNumber(frame.y + frame.height / 2 - (anchorFrame.y + anchorFrame.height / 2));
    } else if (key === "bottom") {
      anchors.bottom = roundCanvasNumber(anchorFrame.y + anchorFrame.height - frame.y - frame.height);
    }
  }
  return anchors;
}

export function normalizeResolvedFrame(frame = {}) {
  return {
    x: roundCanvasNumber(Number(frame.x || 0)),
    y: roundCanvasNumber(Number(frame.y || 0)),
    width: roundCanvasNumber(Math.max(0, Number(frame.width || 0))),
    height: roundCanvasNumber(Math.max(0, Number(frame.height || 0)))
  };
}

export function getAnchorValueFromLocalPoint(key, value, anchorFrame) {
  if (key === "left") {
    return roundCanvasNumber(value - anchorFrame.x);
  }
  if (key === "right") {
    return roundCanvasNumber(anchorFrame.x + anchorFrame.width - value);
  }
  if (key === "centerX") {
    return roundCanvasNumber(value - (anchorFrame.x + anchorFrame.width / 2));
  }
  if (key === "top") {
    return roundCanvasNumber(value - anchorFrame.y);
  }
  if (key === "bottom") {
    return roundCanvasNumber(anchorFrame.y + anchorFrame.height - value);
  }
  return roundCanvasNumber(value - (anchorFrame.y + anchorFrame.height / 2));
}

export function collectWorldNodes(node, parentWorld = { x: 0, y: 0 }, entries = [], parentFrame = null, layoutFrameOverride = null, options = {}) {
  if (!node) {
    return entries;
  }
  if (!options.includeInactive && !isNodeActive(node)) {
    return entries;
  }

  const page = getActivePage();
  const frame = node.parentId === null
    ? getNodeLocalFrame(node)
    : getNodeResolvedLocalFrame(node, {
      parentFrame: parentFrame || getCanvasSize(page),
      layoutFrameOverride
    });
  const bounds = {
    x: parentWorld.x + frame.x,
    y: parentWorld.y + frame.y,
    width: frame.width,
    height: frame.height
  };
  entries.push({ node, bounds });

  const childLayoutFrames = resolveChildLayoutFrames(node, frame, {
    viewport: {
      width: page.canvas?.width || frame.width,
      height: page.canvas?.height || frame.height,
      safeArea: normalizeSafeArea(page.canvas?.safeArea)
    }
  });
  for (const child of node.children || []) {
    collectWorldNodes(child, { x: bounds.x, y: bounds.y }, entries, frame, childLayoutFrames.get(child.id), options);
  }

  return entries;
}

export function isNodeActive(node) {
  if (!node) {
    return false;
  }

  return node.active !== false &&
    node.enabled !== false &&
    node.style?.visible !== false &&
    node.props?.active !== false &&
    node.props?.enabled !== false &&
    node.props?.visible !== false;
}

export function getNodeWorldTransform(node) {
  const page = getActivePage();
  return collectWorldNodes(page.root, { x: 0, y: 0 }, [], null, null, { includeInactive: true })
    .find((entry) => entry.node.id === node.id)?.bounds || getNodeLocalFrame(node);
}

export function getNodeWorldOrigin(nodeId) {
  const page = getActivePage();
  const node = findNodeInProject(state.project, nodeId)?.node || page.root;
  const bounds = getNodeWorldTransform(node);
  return {
    x: bounds.x,
    y: bounds.y
  };
}

export function worldPointToLocalPoint(parentId, worldPoint) {
  const parentOrigin = getNodeWorldOrigin(parentId);
  return {
    x: worldPoint.x - parentOrigin.x,
    y: worldPoint.y - parentOrigin.y
  };
}

export function getActivePage() {
  const component = getActiveEditingComponent();
  if (component?.rootNode) {
    const rootFrame = getNodeLocalFrame(component.rootNode);
    return {
      id: `component:${component.id}`,
      name: getComponentDisplayName(component),
      canvas: {
        width: Math.max(1, rootFrame.width || component.rootNode.transform?.width || 240),
        height: Math.max(1, rootFrame.height || component.rootNode.transform?.height || 96),
        orientation: "custom",
        background: "transparent",
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      variables: {},
      root: component.rootNode,
      interactions: [],
      animations: [],
      editorMeta: { editingComponentId: component.id }
    };
  }

  return state.project.pages.find((page) => page.id === state.pageId) || state.project.pages[0];
}

export function getSelectedNode() {
  return state.selectedNodeId ? findNodeInProject(state.project, state.selectedNodeId)?.node || null : null;
}

export function getActiveEditingComponent() {
  return state.editingComponentId ? getComponentById(state.editingComponentId) : null;
}

export function getComponentById(componentId) {
  return (state.project.components || []).find((component) => component.id === componentId) || null;
}

export function getComponentUsageEntries(componentId) {
  if (!componentId) {
    return [];
  }

  const entries = [];
  for (const page of state.project.pages || []) {
    for (const { node } of collectNodes(page.root)) {
      if (isComponentUsageNode(node, componentId)) {
        entries.push({
          scope: "page",
          pageId: page.id,
          ownerName: page.name || page.id,
          nodeId: node.id,
          nodeName: node.name || "Instance"
        });
      }
    }
  }

  for (const component of state.project.components || []) {
    for (const { node } of collectNodes(component.rootNode)) {
      if (isComponentUsageNode(node, componentId)) {
        entries.push({
          scope: "component",
          ownerComponentId: component.id,
          ownerName: getComponentDisplayName(component),
          nodeId: node.id,
          nodeName: node.name || "Instance"
        });
      }
    }
  }

  return entries;
}

export function getComponentSummary(component) {
  const nodes = collectNodes(component?.rootNode).map((entry) => entry.node);
  const variants = Array.isArray(component?.variants) ? component.variants : [];
  const exposedProps = component?.exposedProps && typeof component.exposedProps === "object"
    ? Object.keys(component.exposedProps).length
    : 0;
  return {
    nodes: nodes.length,
    variants: variants.length,
    variantLabels: variants.map((variant, index) => String(variant?.name || variant?.id || `Variant ${index + 1}`)),
    exposedProps,
    usageCount: getComponentUsageEntries(component?.id).length
  };
}

function isComponentUsageNode(node, componentId) {
  return Boolean(node?.type === NODE_TYPES.componentInstance && getComponentInstanceReferenceId(node) === componentId);
}

function getComponentInstanceReferenceId(node) {
  return node?.props?.componentId || node?.componentId || node?.editorMeta?.componentId || null;
}

export function getEditableSelectedNode() {
  const node = getSelectedNode();
  return node?.parentId === null ? null : node;
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

export function normalizeColorToHex(value) {
  const color = String(value || "").trim();
  const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return `#${hex.split("").map((part) => part + part).join("")}`.toLowerCase();
    }
    return `#${hex}`.toLowerCase();
  }

  const rgbMatch = color.match(/^rgba?\((.+)\)$/i);
  if (rgbMatch) {
    const channels = rgbMatch[1]
      .replace("/", " ")
      .split(/[,\s]+/)
      .filter(Boolean)
      .slice(0, 3)
      .map(colorChannelToHex);

    if (channels.length === 3 && channels.every(Boolean)) {
      return `#${channels.join("")}`;
    }
  }

  return "#ffffff";
}

export function colorChannelToHex(value) {
  const channel = String(value || "").trim();
  const number = channel.endsWith("%")
    ? Number.parseFloat(channel) * 2.55
    : Number.parseFloat(channel);

  if (!Number.isFinite(number)) {
    return null;
  }

  return Math.round(clamp(number, 0, 255)).toString(16).padStart(2, "0");
}

export function cssColorIsSupported(value) {
  return Boolean(String(value || "").trim()) &&
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("color", value);
}

export function isTransparentColor(value) {
  const color = String(value || "").trim().toLowerCase();
  return !color ||
    color === "transparent" ||
    color === "rgba(0,0,0,0)" ||
    color === "rgba(0, 0, 0, 0)" ||
    color === "#0000" ||
    color === "#00000000";
}

export function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.min(max, Math.max(min, value));
}
