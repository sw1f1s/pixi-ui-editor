import {
  getActivePage,
  getNodeAnchors,
  getNodeResolvedLocalFrame,
  isNodeLayoutManagedByParent
} from "./deps.js";

const NODE_VALUE_RESOLVERS = Object.freeze({
  name: (node) => node.name,
  active: (node) => node.active !== false,
  x: getFrameNodeValue,
  y: getFrameNodeValue,
  width: getFrameNodeValue,
  height: getFrameNodeValue,
  textFill: (node) => node.props?.fill
});

export function getSelectedNodeValue(node, key) {
  const resolver = NODE_VALUE_RESOLVERS[key] || getPropNodeValue;
  return resolver(node, key);
}

export function isRootNode(node) {
  return Boolean(node && node.id === getActivePage()?.root?.id);
}

function getFrameNodeValue(node, key) {
  return getNodeAnchors(node) && !isNodeLayoutManagedByParent(node)
    ? getNodeResolvedLocalFrame(node)?.[key]
    : node.transform?.[key];
}

function getPropNodeValue(node, key) {
  return node.props?.[key];
}
