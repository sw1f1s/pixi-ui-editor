import { getNodeComponent as findNodeComponent, getNodeComponentProps as findNodeComponentProps } from "../../app/editorDeps.js";

export function getNodeComponents(node) {
  const components = Array.isArray(node?.components) ? node.components : [];
  return components
    .filter((component) => component && typeof component === "object" && (component.type || component.kind || component.id))
    .map((component, index) => {
      const type = String(component.type || component.kind || component.id || `component_${index}`);
      return {
        ...component,
        id: String(component.id || type),
        type,
        enabled: component.enabled !== false,
        props: component.props && typeof component.props === "object" && !Array.isArray(component.props)
          ? component.props
          : {}
      };
    });
}

export function createNodeComponent(type, props = {}, options = {}) {
  return {
    id: options.id || type,
    type,
    enabled: options.enabled !== false,
    props
  };
}

export function getNodeComponent(node, componentType) {
  return findNodeComponent(node, componentType) || null;
}

export function getNodeComponentProps(node, componentType) {
  return findNodeComponentProps(node, componentType);
}

export function hasNodeComponent(node, componentType) {
  return Boolean(getNodeComponent(node, componentType));
}

export function hasExplicitNodeComponents(node) {
  return Array.isArray(node?.components) && node.components.length > 0;
}

export function componentKey(componentType, propKey) {
  return `component:${componentType}:${propKey}`;
}

export function parseComponentKey(key) {
  const match = /^component:([^:]+):(.+)$/.exec(String(key || ""));
  return match ? { componentType: match[1], propKey: match[2] } : null;
}
