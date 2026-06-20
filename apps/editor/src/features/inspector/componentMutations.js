import {
  ASSET_TYPES,
  EDITABLE_NODE_COMPONENTS,
  createNodeComponent,
  getAssetById,
  getNodeComponentProps,
  getSelectedNode,
  hasExplicitNodeComponents,
  hasNodeComponent,
  isComponentInstanceNode,
  NODE_COMPONENT_TYPES,
  registerFontAsset,
  runCommand,
  state
} from "./deps.js";
import {
  getDefaultNodeComponentProps,
  getNodeComponentLabel
} from "./componentRegistry.js";
import { getComponentStackPreset } from "./componentPresets.js";
import {
  normalizeComponentInspectorValue,
  normalizeLayoutInspectorValue
} from "./valueNormalizers.js";

const LAYOUT_COMPONENT_KEYS = Object.freeze([
  "mode",
  "direction",
  "flexDirection",
  "orientation",
  "wrap",
  "alignItems",
  "align",
  "alignSelf",
  "justifyContent",
  "justify",
  "justifyItems",
  "gap",
  "rowGap",
  "columnGap",
  "padding",
  "margin",
  "grow",
  "flexGrow",
  "basis",
  "flexBasis",
  "aspectRatio",
  "minWidth",
  "minHeight",
  "maxWidth",
  "maxHeight",
  "columns",
  "column",
  "row",
  "columnSpan",
  "colSpan",
  "rowSpan",
  "cellWidth",
  "cellHeight"
]);

export function updateSelectedNodeComponent(componentType, propKey, rawValue, type, renderOptions = {}) {
  const node = getSelectedNode();
  if (!node) {
    return false;
  }

  const isLayoutComponent = componentType === NODE_COMPONENT_TYPES.layout;
  const value = isLayoutComponent
    ? normalizeLayoutInspectorValue(propKey, rawValue, type)
    : normalizeComponentInspectorValue(propKey, rawValue, type);
  if (!isLayoutComponent && value === null && type === "number" && propKey !== "strokeWidth") {
    return false;
  }

  const currentValue = getComponentPropValue(getNodeComponentProps(node, componentType), propKey);
  if (currentValue === value) {
    return false;
  }

  const components = getEditableNodeComponents(node);
  const component = ensureEditableComponent(components, componentType);
  component.props = setComponentPropValue(component.props || {}, propKey, value);

  const args = {
    nodeId: node.id,
    components
  };
  if (isLayoutComponent) {
    args.layout = createLayoutUpdatePatch(node.layout, propKey, value);
  }

  runCommand({
    type: "node.update_props",
    args,
    meta: { source: "user", label: `Update ${node.name} ${componentType}` }
  }, renderOptions);
  return true;
}

export function addSelectedNodeComponent(componentType) {
  const node = getSelectedNode();
  if (!node || isComponentInstanceNode(node) || !EDITABLE_NODE_COMPONENTS.includes(componentType) || getEditableNodeComponents(node).some((component) => component.type === componentType)) {
    return false;
  }

  const components = getEditableNodeComponents(node);
  const componentProps = getInitialComponentProps(node, componentType);
  components.push(createNodeComponent(componentType, componentProps));
  const args = {
    nodeId: node.id,
    components
  };
  if (componentType === NODE_COMPONENT_TYPES.layout) {
    args.layout = componentProps;
  }
  runCommand({
    type: "node.update_props",
    args,
    meta: { source: "user", label: `Add ${getNodeComponentLabel(componentType)} component` }
  });
  return true;
}

export function applySelectedNodeComponentPreset(presetId) {
  const node = getSelectedNode();
  const preset = getComponentStackPreset(presetId);
  if (!node || isComponentInstanceNode(node) || !preset) {
    return false;
  }

  const components = getEditableNodeComponents(node);
  for (const presetComponent of preset.components) {
    if (!EDITABLE_NODE_COMPONENTS.includes(presetComponent.type)) {
      continue;
    }
    const component = ensureEditableComponent(components, presetComponent.type);
    component.enabled = true;
    component.props = {
      ...(component.props || {}),
      ...(presetComponent.props || {})
    };
  }

  const args = {
    nodeId: node.id,
    components
  };
  const layout = components.find((component) => component.type === NODE_COMPONENT_TYPES.layout);
  if (layout) {
    args.layout = { ...(layout.props || {}) };
  }

  runCommand({
    type: "node.update_props",
    args,
    meta: { source: "user", label: `Apply ${preset.label} component preset` }
  });
  return true;
}

export function reorderSelectedNodeComponent(componentType, direction) {
  const node = getSelectedNode();
  if (!node || isComponentInstanceNode(node) || !hasExplicitNodeComponents(node)) {
    return false;
  }

  const components = getEditableNodeComponents(node);
  const fromIndex = components.findIndex((component) => component.type === componentType);
  if (fromIndex < 0) {
    return false;
  }
  const offset = direction === "down" ? 1 : -1;
  const toIndex = fromIndex + offset;
  if (toIndex < 0 || toIndex >= components.length) {
    return false;
  }

  const [component] = components.splice(fromIndex, 1);
  components.splice(toIndex, 0, component);
  runCommand({
    type: "node.update_props",
    args: {
      nodeId: node.id,
      components
    },
    meta: { source: "user", label: `Reorder ${getNodeComponentLabel(componentType)} component` }
  }, { preserveInspector: true });
  return true;
}

export function setSelectedNodeComponentEnabled(componentType, enabled) {
  const node = getSelectedNode();
  if (!node || !hasExplicitNodeComponents(node)) {
    return false;
  }

  const components = getEditableNodeComponents(node);
  const component = components.find((candidate) => candidate.type === componentType);
  if (!component || component.enabled === enabled) {
    return false;
  }

  component.enabled = enabled;
  const args = {
    nodeId: node.id,
    components
  };
  if (componentType === NODE_COMPONENT_TYPES.layout) {
    args.layout = enabled
      ? { ...(component.props || {}) }
      : createLayoutRemovePatch(node.layout);
  }

  runCommand({
    type: "node.update_props",
    args,
    meta: { source: "user", label: `${enabled ? "Enable" : "Disable"} ${getNodeComponentLabel(componentType)} component` }
  });
  return true;
}

export function removeSelectedNodeComponent(componentType) {
  const node = getSelectedNode();
  if (!node || !hasExplicitNodeComponents(node)) {
    return false;
  }

  const components = getEditableNodeComponents(node).filter((component) => component.type !== componentType);
  const args = {
    nodeId: node.id,
    components
  };
  if (componentType === NODE_COMPONENT_TYPES.layout) {
    args.layout = createLayoutRemovePatch(node.layout);
  }
  runCommand({
    type: "node.update_props",
    args,
    meta: { source: "user", label: `Remove ${getNodeComponentLabel(componentType)} component` }
  });
  return true;
}

export function getEditableNodeComponents(node) {
  const components = Array.isArray(node?.components) ? node.components : [];
  return components.map((component) => ({
    id: component.id || component.type,
    type: component.type,
    enabled: component.enabled !== false,
    props: { ...(component.props || {}) }
  }));
}

export function ensureEditableComponent(components, componentType) {
  let component = components.find((candidate) => candidate.type === componentType);
  if (!component) {
    component = createNodeComponent(componentType, {});
    components.push(component);
  }
  return component;
}

function getComponentPropValue(props, propKey) {
  const path = getComponentPropPath(propKey);
  let value = props || {};
  for (const key of path) {
    if (!value || typeof value !== "object") {
      return undefined;
    }
    value = value[key];
  }
  return value;
}

function setComponentPropValue(props, propKey, value) {
  const path = getComponentPropPath(propKey);
  if (path.length === 1) {
    return {
      ...props,
      [propKey]: value
    };
  }

  const nextProps = { ...props };
  let target = nextProps;
  for (const key of path.slice(0, -1)) {
    target[key] = target[key] && typeof target[key] === "object" && !Array.isArray(target[key])
      ? { ...target[key] }
      : {};
    target = target[key];
  }
  target[path[path.length - 1]] = value;
  return nextProps;
}

function getComponentPropPath(propKey) {
  return String(propKey || "").split(".").filter(Boolean);
}

function getInitialComponentProps(node, componentType) {
  const defaults = getDefaultNodeComponentProps(componentType);
  if (componentType !== NODE_COMPONENT_TYPES.layout) {
    return defaults;
  }
  return {
    ...defaults,
    ...(node.layout || {})
  };
}

function createLayoutUpdatePatch(layout = {}, key, value) {
  const nextLayout = {
    ...(layout || {}),
    [key]: value
  };
  if (key === "mode" && value === "absolute") {
    nextLayout.wrap = false;
  }
  return nextLayout;
}

function createLayoutRemovePatch(layout = {}) {
  const nextLayout = {
    ...(layout || {}),
    mode: "absolute"
  };
  for (const key of LAYOUT_COMPONENT_KEYS) {
    if (key !== "mode") {
      nextLayout[key] = null;
    }
  }
  return nextLayout;
}

export function updateSelectedSpriteAsset(assetId) {
  const node = getSelectedNode();
  if (!node || !hasNodeComponent(node, NODE_COMPONENT_TYPES.texture)) {
    return false;
  }

  const asset = getAssetById(assetId);
  const firstFrame = asset?.type === ASSET_TYPES.spriteAtlas ? Object.keys(asset.frames || {})[0] : undefined;
  const components = getEditableNodeComponents(node);
  const texture = ensureEditableComponent(components, NODE_COMPONENT_TYPES.texture);
  texture.props = {
    ...(texture.props || {}),
    assetId: assetId || null,
    frame: firstFrame
  };
  state.selectedAssetId = assetId || state.selectedAssetId;
  runCommand({
    type: "node.update_props",
    args: {
      nodeId: node.id,
      components
    },
    meta: { source: "user", label: `Update ${node.name} texture` }
  }, { preserveInspector: true });
  return true;
}

export function updateSelectedSpriteFrame(frameName, renderOptions = { preserveInspector: true }) {
  const node = getSelectedNode();
  if (!node || !hasNodeComponent(node, NODE_COMPONENT_TYPES.texture)) {
    return false;
  }

  const components = getEditableNodeComponents(node);
  const texture = ensureEditableComponent(components, NODE_COMPONENT_TYPES.texture);
  texture.props = {
    ...(texture.props || {}),
    frame: frameName || null
  };
  runCommand({
    type: "node.update_props",
    args: {
      nodeId: node.id,
      components
    },
    meta: { source: "user", label: `Update ${node.name} frame` }
  }, renderOptions);
  return true;
}

export function applyFontAssetToSelectedText(assetId) {
  const node = getSelectedNode();
  const asset = getAssetById(assetId);
  if (!node || !hasNodeComponent(node, NODE_COMPONENT_TYPES.text) || !asset || asset.type !== ASSET_TYPES.font) {
    return false;
  }

  registerFontAsset(asset);
  state.selectedAssetId = asset.id;
  const components = getEditableNodeComponents(node);
  const text = ensureEditableComponent(components, NODE_COMPONENT_TYPES.text);
  text.props = {
    ...(text.props || {}),
    fontAssetId: asset.id,
    fontFamily: asset.family || asset.name || text.props?.fontFamily || "Inter"
  };
  runCommand({
    type: "node.update_props",
    args: {
      nodeId: node.id,
      components
    },
    meta: { source: "user", label: `Apply ${asset.name || asset.id} font` }
  }, { preserveInspector: true });
  return true;
}
