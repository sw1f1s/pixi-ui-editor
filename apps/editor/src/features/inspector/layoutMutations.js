import {
  getNodeComponentProps,
  getSelectedNode,
  hasNodeComponent,
  NODE_COMPONENT_TYPES,
  runCommand
} from "./deps.js?v=20260620-designless";
import {
  ensureEditableComponent,
  getEditableNodeComponents
} from "./componentMutations.js?v=20260620-designless";
import { normalizeLayoutInspectorValue } from "./valueNormalizers.js?v=20260620-designless";

export function updateNodeLayout(node, layout, label, options = {}) {
  const args = {
    nodeId: node.id,
    layout
  };
  if (hasNodeComponent(node, NODE_COMPONENT_TYPES.layout)) {
    const components = getEditableNodeComponents(node);
    const layoutComponent = ensureEditableComponent(components, NODE_COMPONENT_TYPES.layout);
    layoutComponent.props = {
      ...getNodeComponentProps(node, NODE_COMPONENT_TYPES.layout),
      ...layout
    };
    args.components = components;
  }
  if (options.transform) {
    args.transform = options.transform;
  }
  const renderOptions = options.renderOptions || (options.preserveInspector !== undefined ? { preserveInspector: options.preserveInspector } : {});

  runCommand({
    type: "node.update_props",
    args,
    meta: { source: "user", label }
  }, renderOptions);
}

export function updateSelectedNodeLayoutProp(node, key, rawValue, type, renderOptions = { preserveInspector: true }) {
  const selectedNode = getSelectedNode();
  if (!node || !selectedNode || node.id !== selectedNode.id) {
    return false;
  }

  const value = normalizeLayoutInspectorValue(key, rawValue, type);
  if (node.layout?.[key] === value) {
    return false;
  }

  const nextLayout = {
    ...(node.layout || {}),
    [key]: value
  };

  if (key === "mode" && value === "absolute") {
    nextLayout.wrap = false;
  }

  updateNodeLayout(node, nextLayout, `Update ${node.name} layout`, renderOptions);
  return true;
}
