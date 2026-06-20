import {
  getComponentReferenceId,
  getNodeAnchors,
  getSelectedNode,
  isNodeLayoutManagedByParent,
  isComponentInstanceNode,
  isEditingComponentPrimaryNode,
  isMissingComponentInstanceNode,
  parseComponentKey,
  renameComponentDefinition,
  runCommand,
  state
} from "./deps.js?v=20260620-designless";
import { updateAnchoredNodeFrameValue } from "./anchorMutations.js?v=20260620-designless";
import { updateSelectedNodeComponent } from "./componentMutations.js?v=20260620-designless";
import {
  getSelectedNodeValue,
  isRootNode
} from "./nodeState.js?v=20260620-designless";
import { normalizeInspectorValue } from "./valueNormalizers.js?v=20260620-designless";

const FRAME_KEYS = new Set(["x", "y", "width", "height"]);

const NODE_UPDATE_RESOLVERS = Object.freeze({
  name: createNameUpdateArgs,
  active: createActiveUpdateArgs,
  textFill: (_node, value) => ({ props: { fill: value } })
});

export function updateSelectedNode(key, rawValue, type, renderOptions = {}) {
  const node = getSelectedNode();
  if (!node) {
    return false;
  }

  const componentInfo = parseComponentKey(key);
  if (componentInfo) {
    return updateSelectedNodeComponent(componentInfo.componentType, componentInfo.propKey, rawValue, type, renderOptions);
  }

  if (isRootNode(node) && FRAME_KEYS.has(key)) {
    return false;
  }

  const value = normalizeInspectorValue(rawValue, type);
  if (value === null) {
    return false;
  }

  if (key === "name") {
    const renamed = renameComponentBackedNode(node, value, renderOptions);
    if (renamed !== null) {
      return renamed;
    }
  }

  if (getSelectedNodeValue(node, key) === value) {
    return false;
  }

  if (FRAME_KEYS.has(key) && getNodeAnchors(node) && !isNodeLayoutManagedByParent(node)) {
    return updateAnchoredNodeFrameValue(node, key, value, renderOptions);
  }

  const args = createNodeUpdateArgs(node, key, value);
  runCommand({
    type: "node.update_props",
    args,
    meta: { source: "user", label: `Update ${node.name}` }
  }, renderOptions);
  return true;
}

function renameComponentBackedNode(node, value, renderOptions) {
  if (isComponentInstanceNode(node) && !isMissingComponentInstanceNode(node)) {
    return renameComponentDefinition(getComponentReferenceId(node), value, renderOptions);
  }
  if (isEditingComponentPrimaryNode(node)) {
    return renameComponentDefinition(state.editingComponentId, value, renderOptions);
  }
  return null;
}

function createNodeUpdateArgs(node, key, value) {
  if (FRAME_KEYS.has(key)) {
    return { nodeId: node.id, transform: { [key]: value } };
  }

  const resolver = NODE_UPDATE_RESOLVERS[key] || createPropsUpdateArgs;
  return {
    nodeId: node.id,
    ...resolver(node, value, key)
  };
}

function createNameUpdateArgs(_node, value) {
  return { name: value };
}

function createActiveUpdateArgs(_node, value) {
  return { active: value };
}

function createPropsUpdateArgs(_node, value, key) {
  return { props: { [key]: value } };
}
