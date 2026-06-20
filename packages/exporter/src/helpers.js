import {
  asArray,
  cloneJson,
  createNodePath,
  getNodeAssetId,
  getNodeAssetIds,
  isObject,
  toStableId
} from "../../core/src/document-helpers.js";

export {
  asArray,
  cloneJson,
  createNodePath,
  getNodeAssetId,
  getNodeAssetIds,
  isObject,
  toStableId
};

const hasOwn = Object.prototype.hasOwnProperty;

export function walkNodeTree(rootNode, visitor, parentPath = "", depth = 0, siblingIndex = 0) {
  if (!isObject(rootNode)) {
    return;
  }

  const path = createNodePath(parentPath, rootNode, siblingIndex);
  visitor(rootNode, { path, depth });

  asArray(rootNode.children).forEach((child, index) => {
    walkNodeTree(child, visitor, path, depth + 1, index);
  });
}

export function collectAssetReferences(rootNode) {
  const assetIds = new Set();

  walkNodeTree(rootNode, (node) => {
    for (const assetId of getNodeAssetIds(node)) {
      assetIds.add(assetId);
    }
  });

  return [...assetIds].sort();
}

export function collectTextBindings(rootNode) {
  const bindings = [];

  walkNodeTree(rootNode, (node, meta) => {
    const key = node?.localizationKey || node?.i18nKey || node?.props?.localizationKey || node?.props?.i18nKey;
    if (key) {
      bindings.push({ nodeId: node.id, path: meta.path, key });
    }
  });

  return bindings;
}

export function summarizeNodeTree(rootNode) {
  const summary = {
    nodeCount: 0,
    maxDepth: 0,
    types: {},
    assetIds: collectAssetReferences(rootNode),
    textBindings: collectTextBindings(rootNode)
  };

  walkNodeTree(rootNode, (node, meta) => {
    const type = String(node?.type || "container").toLowerCase();
    summary.nodeCount += 1;
    summary.maxDepth = Math.max(summary.maxDepth, meta.depth);
    summary.types[type] = (summary.types[type] || 0) + 1;
  });

  return summary;
}

export function collectDuplicateIds(rootNodes) {
  const seen = new Set();
  const duplicates = new Set();

  for (const rootNode of asArray(rootNodes)) {
    walkNodeTree(rootNode, (node) => {
      if (!node?.id) {
        return;
      }

      if (seen.has(node.id)) {
        duplicates.add(node.id);
      }

      seen.add(node.id);
    });
  }

  return [...duplicates].sort();
}

export function compactUndefined(value) {
  if (Array.isArray(value)) {
    return value.map(compactUndefined);
  }

  if (!isObject(value)) {
    return value;
  }

  const output = {};
  for (const [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      output[key] = compactUndefined(entry);
    }
  }

  return output;
}

export function hasKey(object, key) {
  return hasOwn.call(object || {}, key);
}
