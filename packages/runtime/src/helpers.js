import {
  asArray,
  childrenOf,
  cloneJson,
  coalesce,
  componentsOf,
  createNodePath,
  getNodeAssetId,
  getNodeAssetIds,
  getNodeComponent,
  getNodeComponentProps,
  isObject,
  normalizeNodeComponent,
  toStableId
} from "../../core/src/document-helpers.js";

export {
  asArray,
  childrenOf,
  cloneJson,
  coalesce,
  componentsOf,
  createNodePath,
  getNodeAssetId,
  getNodeAssetIds,
  getNodeComponent,
  getNodeComponentProps,
  isObject,
  normalizeNodeComponent,
  toStableId
};

const hasOwn = Object.prototype.hasOwnProperty;

export function deepMerge(target = {}, ...sources) {
  const output = isObject(target) ? { ...target } : {};

  for (const source of sources) {
    if (!isObject(source)) {
      continue;
    }

    for (const [key, value] of Object.entries(source)) {
      if (Array.isArray(value)) {
        output[key] = value.map((item) => cloneJson(item));
      } else if (isObject(value) && isObject(output[key])) {
        output[key] = deepMerge(output[key], value);
      } else if (isObject(value)) {
        output[key] = deepMerge({}, value);
      } else if (value !== undefined) {
        output[key] = value;
      }
    }
  }

  return output;
}

export function mergeData(base, patch) {
  return deepMerge(base || {}, patch || {});
}

export function readPath(source, path, fallback = undefined) {
  if (!path || typeof path !== "string") {
    return fallback;
  }

  const segments = path.split(".").filter(Boolean);
  let current = source;

  for (const segment of segments) {
    if (current === undefined || current === null) {
      return fallback;
    }

    current = current[segment];
  }

  return current === undefined ? fallback : current;
}

export function interpolateString(template, data = {}) {
  if (typeof template !== "string") {
    return template;
  }

  return template.replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_match, key) => {
    const value = readPath(data, key, "");
    return value === undefined || value === null ? "" : String(value);
  });
}

export function normalizeNode(node, fallbackId = "node") {
  const source = isObject(node) ? node : {};
  const id = toStableId(source.id, fallbackId);

  return {
    ...source,
    id,
    name: toStableId(source.name, id),
    type: toStableId(source.type, "container"),
    props: isObject(source.props) ? source.props : {},
    style: isObject(source.style) ? source.style : {},
    transform: isObject(source.transform) ? source.transform : {},
    layout: isObject(source.layout) ? source.layout : {},
    components: allComponentsOf(source),
    children: childrenOf(source).map((child, index) => normalizeNode(child, `${id}.${index}`))
  };
}

export function allComponentsOf(node) {
  return asArray(node?.components)
    .filter((component) => isObject(component) && (component.type || component.kind || component.id))
    .map(normalizeNodeComponent);
}

export function walkNodeTree(rootNode, visitor, parentPath = "", depth = 0, siblingIndex = 0) {
  const node = normalizeNode(rootNode);
  const path = createNodePath(parentPath, node, siblingIndex);
  visitor(node, { path, depth });

  node.children.forEach((child, index) => {
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

export function getStateDefinition(node, stateName) {
  if (!stateName || !node?.states) {
    return undefined;
  }

  if (isObject(node.states) && hasOwn.call(node.states, stateName)) {
    return node.states[stateName];
  }

  return asArray(node.states).find((state) => state?.id === stateName || state?.name === stateName);
}

export function getNodeTypeBucket(node) {
  return String(node?.type || "container").toLowerCase();
}

export function summarizeNodeTree(rootNode) {
  const summary = {
    nodeCount: 0,
    maxDepth: 0,
    types: {},
    assetIds: collectAssetReferences(rootNode)
  };

  walkNodeTree(rootNode, (node, meta) => {
    const type = getNodeTypeBucket(node);
    summary.nodeCount += 1;
    summary.maxDepth = Math.max(summary.maxDepth, meta.depth);
    summary.types[type] = (summary.types[type] || 0) + 1;
  });

  return summary;
}
