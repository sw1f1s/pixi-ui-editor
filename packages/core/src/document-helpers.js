export function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function cloneJson(value) {
  if (value === undefined || value === null) {
    return value;
  }

  return JSON.parse(JSON.stringify(value));
}

export function asArray(value) {
  if (value === undefined || value === null) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export function coalesce(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null) {
      return value;
    }
  }

  return undefined;
}

export function toStableId(value, fallback) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return fallback;
}

export function childrenOf(node) {
  return asArray(node?.children);
}

export function normalizeNodeComponent(component, index = 0) {
  const source = isObject(component) ? component : {};
  const type = toStableId(source.type || source.kind || source.id, `component_${index}`);

  return {
    ...source,
    id: toStableId(source.id, type),
    type,
    enabled: source.enabled !== false,
    props: isObject(source.props) ? source.props : {}
  };
}

export function componentsOf(node) {
  return asArray(node?.components)
    .filter((component) => isObject(component) && component.enabled !== false && (component.type || component.kind || component.id))
    .map(normalizeNodeComponent);
}

export function allComponentsOf(node) {
  return asArray(node?.components)
    .filter((component) => isObject(component) && (component.type || component.kind || component.id))
    .map(normalizeNodeComponent);
}

export function getNodeComponent(node, type) {
  const targetType = String(type || "").toLowerCase();
  return componentsOf(node).find((component) => String(component.type || "").toLowerCase() === targetType);
}

export function getNodeComponentProps(node, type, fallback = {}) {
  return getNodeComponent(node, type)?.props || fallback;
}

export function createNodePath(parentPath, node, index = 0) {
  const rawName = toStableId(node?.name, node?.id);
  const safeName = String(rawName || `node_${index}`).replace(/[\/\s]+/g, "_");
  return parentPath ? `${parentPath}/${safeName}` : safeName;
}

export function getNodeAssetId(node, options = {}) {
  const includeTextureComponent = options.includeTextureComponent !== false;
  const textureProps = includeTextureComponent ? getNodeComponentProps(node, "texture") : {};

  return coalesce(
    node?.assetId,
    node?.textureId,
    textureProps.assetId,
    textureProps.textureId,
    textureProps.imageAssetId,
    textureProps.srcAssetId,
    node?.props?.assetId,
    node?.props?.textureId,
    node?.props?.imageAssetId,
    node?.props?.srcAssetId
  );
}

export function getNodeAssetIds(node, options = {}) {
  const ids = [getNodeAssetId(node, options)];
  if (options.includeTextComponent !== false) {
    const textProps = getNodeComponentProps(node, "text");
    ids.push(textProps.fontAssetId);
  }

  return [...new Set(ids.filter(Boolean).map(String))].sort();
}

export function collectNodeComponentUsage(rootNode, options = {}) {
  const usage = [];
  const includeDisabled = options.includeDisabled === true;

  walkPlainNodeTree(rootNode, (node, meta) => {
    const components = includeDisabled ? allComponentsOf(node) : componentsOf(node);
    for (const component of components) {
      usage.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        path: meta.path,
        componentId: component.id,
        componentType: component.type,
        enabled: component.enabled !== false,
        props: component.props
      });
    }
  });

  return usage;
}

export function collectComponentUsage(project, options = {}) {
  const usage = [];

  for (const page of asArray(project?.pages)) {
    walkPlainNodeTree(page?.root || page?.rootNode || page?.node, (node, meta) => {
      const componentId = getComponentInstanceReferenceId(node);
      if (componentId) {
        usage.push({
          kind: "instance",
          pageId: page.id,
          nodeId: node.id,
          nodeName: node.name,
          path: meta.path,
          componentId,
          variant: node?.props?.variant ?? node?.variant ?? null
        });
      }
    });

    for (const entry of collectNodeComponentUsage(page?.root || page?.rootNode || page?.node, options)) {
      usage.push({ kind: "nodeComponent", pageId: page.id, ...entry });
    }
  }

  for (const component of asArray(project?.components)) {
    for (const entry of collectNodeComponentUsage(component?.rootNode || component?.root || component?.node, options)) {
      usage.push({ kind: "nodeComponent", ownerComponentId: component.id, ...entry });
    }
  }

  return usage;
}

function walkPlainNodeTree(rootNode, visitor, path = "", depth = 0, siblingIndex = 0) {
  if (!isObject(rootNode)) {
    return;
  }

  const nodePath = createNodePath(path, rootNode, siblingIndex);
  visitor(rootNode, { path: nodePath, depth, siblingIndex });
  asArray(rootNode.children).forEach((child, index) => {
    walkPlainNodeTree(child, visitor, nodePath, depth + 1, index);
  });
}

function getComponentInstanceReferenceId(node) {
  return node?.props?.componentId || node?.componentId || node?.editorMeta?.componentId || null;
}
