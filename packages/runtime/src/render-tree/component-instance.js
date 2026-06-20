import {
  childrenOf,
  cloneJson,
  coalesce,
  createNodePath,
  deepMerge,
  isObject
} from "../helpers.js";
import { applyNodeToDisplay } from "./display.js";

const RESERVED_INSTANCE_PROP_KEYS = new Set(["component", "componentId", "variant", "variantId"]);
const hasOwn = Object.prototype.hasOwnProperty;

export function buildComponentInstanceRenderTree(node, context, options, buildRenderTreeNode) {
  const componentId = coalesce(node.componentId, node.props?.componentId, node.props?.component);
  const component = componentId ? context.componentsById?.get(String(componentId)) : undefined;
  const path = options.path || createNodePath(options.parentPath || "", node, options.index || 0);
  const displayObject = context.adapter.createContainer({ node, path, context });
  const renderNode = {
    id: node.id,
    sourceId: node.sourceId || node.id,
    name: node.name,
    type: node.type,
    path,
    sourceNode: node,
    component,
    missingComponentId: component ? null : componentId || null,
    displayObject,
    children: [],
    parentLayoutFrame: options.parentLayoutFrame,
    parentIsRoot: Boolean(options.parentIsRoot),
    layoutFrameOverride: options.layoutFrameOverride,
    resolvedTransform: null
  };

  applyNodeToDisplay(renderNode, context);
  appendComponentRoot(renderNode, node, component, context, path, displayObject, buildRenderTreeNode);
  appendInstanceChildren(renderNode, node, context, path, displayObject, buildRenderTreeNode);
  return renderNode;
}

function appendComponentRoot(renderNode, node, component, context, path, displayObject, buildRenderTreeNode) {
  if (!component?.rootNode) {
    return;
  }

  const rootNode = instantiateComponentRoot(component.rootNode, node, component);
  const childTree = buildRenderTreeNode(rootNode, context, {
    parentPath: path,
    index: 0,
    fallbackId: `${node.id}.componentRoot`
  });
  renderNode.children.push(childTree);
  context.adapter.addChild(displayObject, childTree.displayObject);
}

function appendInstanceChildren(renderNode, node, context, path, displayObject, buildRenderTreeNode) {
  childrenOf(node).forEach((child, index) => {
    const childTree = buildRenderTreeNode(child, context, {
      parentPath: path,
      index: index + renderNode.children.length,
      fallbackId: `${node.id}.child.${index}`
    });
    renderNode.children.push(childTree);
    context.adapter.addChild(displayObject, childTree.displayObject);
  });
}

function instantiateComponentRoot(rootNode, instanceNode, component = {}) {
  const cloned = cloneJson(rootNode);
  const overrides = isObject(instanceNode.overrides) ? instanceNode.overrides : {};
  const variantOverrides = getComponentVariantOverrides(component, instanceNode);
  const exposedProps = getComponentExposedPropValues(component, instanceNode);
  const withVariant = applyComponentOverrides(cloned, variantOverrides);
  const withExposedProps = applyComponentExposedProps(withVariant, exposedProps);
  const withOverrides = applyComponentOverrides(withExposedProps, overrides);

  return prefixNodeIds(withOverrides, instanceNode.id);
}

function prefixNodeIds(node, prefix) {
  const next = {
    ...node,
    sourceId: node.id,
    id: `${prefix}:${node.id || "node"}`
  };

  next.children = childrenOf(node).map((child) => prefixNodeIds(child, prefix));
  return next;
}

function applyComponentOverrides(node, overrides) {
  const byId = overrides[node.id];
  const byName = overrides[node.name];
  const next = deepMerge({}, node, byId || {}, byName || {});
  next.children = childrenOf(node).map((child) => applyComponentOverrides(child, overrides));
  return next;
}

function getComponentVariantOverrides(component = {}, instanceNode = {}) {
  const variantRef = coalesce(instanceNode.variant, instanceNode.props?.variant, instanceNode.props?.variantId);
  if (!variantRef) {
    return {};
  }

  const variant = (component.variants || []).find((candidate) => {
    return candidate?.id === variantRef || candidate?.name === variantRef || candidate?.value === variantRef;
  });
  if (!variant) {
    return {};
  }

  if (isObject(variant.overrides)) {
    return variant.overrides;
  }
  if (isObject(variant.nodes)) {
    return variant.nodes;
  }
  if (isObject(variant.patch)) {
    return variant.patch;
  }
  return {};
}

function getComponentExposedPropValues(component = {}, instanceNode = {}) {
  const schema = isObject(component.exposedProps) ? component.exposedProps : component.propsSchema;
  const values = isObject(instanceNode.props) ? instanceNode.props : {};
  if (!isObject(schema)) {
    return [];
  }

  return Object.entries(schema)
    .filter(([name]) => !RESERVED_INSTANCE_PROP_KEYS.has(name) && hasOwn.call(values, name))
    .map(([name, definition]) => ({
      name,
      definition,
      value: values[name]
    }));
}

function applyComponentExposedProps(rootNode, entries) {
  if (!entries.length) {
    return rootNode;
  }

  const next = cloneJson(rootNode);
  for (const entry of entries) {
    const targetPath = getExposedPropTargetPath(entry.name, entry.definition);
    if (!targetPath) {
      continue;
    }
    writeExposedPropPath(next, targetPath, entry.value);
  }
  return next;
}

function getExposedPropTargetPath(propName, definition) {
  if (typeof definition === "string") {
    return definition;
  }
  if (!isObject(definition)) {
    return null;
  }

  const explicitPath = definition.path || definition.targetPath || definition.binding;
  if (typeof explicitPath === "string" && explicitPath.trim()) {
    return explicitPath;
  }

  const targetNode = definition.nodeId || definition.targetNodeId || definition.node || definition.target;
  const componentRef = definition.componentId || definition.componentType || definition.component;
  const targetProp = definition.prop || definition.property || propName;
  if (targetNode && componentRef && targetProp) {
    return `${targetNode}.components.${componentRef}.props.${targetProp}`;
  }
  if (targetNode && targetProp) {
    return `${targetNode}.props.${targetProp}`;
  }
  if (componentRef && targetProp) {
    return `components.${componentRef}.props.${targetProp}`;
  }
  return null;
}

function writeExposedPropPath(rootNode, path, value) {
  const segments = String(path || "").split(".").filter(Boolean);
  if (!segments.length) {
    return false;
  }

  const target = findPathTargetNode(rootNode, segments[0]);
  const pathSegments = target ? segments.slice(1) : segments;
  const node = target || rootNode;
  if (!pathSegments.length) {
    return false;
  }

  if (pathSegments[0] === "components") {
    return writeComponentPath(node, pathSegments.slice(1), value);
  }
  return writeObjectPath(node, pathSegments, value);
}

function findPathTargetNode(rootNode, ref) {
  const normalizedRef = String(ref || "").toLowerCase();
  if (!normalizedRef) {
    return null;
  }

  let match = null;
  walkComponentNode(rootNode, (node) => {
    if (match) {
      return;
    }
    const candidates = [node.id, node.sourceId, node.name]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    if (candidates.includes(normalizedRef)) {
      match = node;
    }
  });
  return match;
}

function walkComponentNode(node, visit) {
  if (!node || typeof node !== "object") {
    return;
  }
  visit(node);
  for (const child of childrenOf(node)) {
    walkComponentNode(child, visit);
  }
}

function writeComponentPath(node, pathSegments, value) {
  const componentRef = pathSegments[0];
  if (!componentRef) {
    return false;
  }

  const component = findNodeComponent(node, componentRef);
  if (!component) {
    return false;
  }
  return writeObjectPath(component, pathSegments.slice(1), value);
}

function findNodeComponent(node, ref) {
  const components = Array.isArray(node.components) ? node.components : [];
  const numericIndex = Number(ref);
  if (Number.isInteger(numericIndex) && components[numericIndex]) {
    return components[numericIndex];
  }

  const normalizedRef = String(ref || "").toLowerCase();
  return components.find((component) => {
    return [component?.id, component?.type, component?.kind, component?.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase() === normalizedRef);
  }) || null;
}

function writeObjectPath(target, pathSegments, value) {
  if (!target || !pathSegments.length) {
    return false;
  }

  let current = target;
  for (let index = 0; index < pathSegments.length - 1; index += 1) {
    const segment = pathSegments[index];
    if (!isObject(current[segment])) {
      current[segment] = {};
    }
    current = current[segment];
  }

  current[pathSegments.at(-1)] = value;
  return true;
}
