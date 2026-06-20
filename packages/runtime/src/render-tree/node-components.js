import {
  componentsOf,
  createNodePath
} from "../helpers.js";
import { normalizeProgressValue } from "./control-shared.js";
import { createDisplayObject, applyNodeToDisplay } from "./display.js";
import { getNodeEffectProps } from "./effects.js";
import { RENDER_COMPONENT_TYPES } from "./types.js";

const COMPONENT_NODE_TYPES = {
  texture: "sprite",
  text: "text"
};

const COMPONENT_PROP_ENRICHERS = {
  progressbar: enrichProgressComponentProps,
  mask: enrichMaskComponentProps
};

export function getRenderComponents(node) {
  return componentsOf(node).filter((component) => RENDER_COMPONENT_TYPES.has(String(component.type || "").toLowerCase()));
}

export function buildNodeComponentRenderTree(sourceNode, component, context, options = {}) {
  const componentType = String(component.type || "").toLowerCase();
  const props = {
    ...(component.props || {}),
    ...(COMPONENT_PROP_ENRICHERS[componentType]?.(component.props || {}) || {}),
    ...getNodeEffectProps(sourceNode)
  };
  const parentTransform = options.parentTransform || sourceNode.transform || {};
  const nodeType = COMPONENT_NODE_TYPES[componentType] || "graphics";
  const componentNode = {
    id: `${sourceNode.id}#${component.id || componentType}`,
    sourceId: `${sourceNode.id}#${component.id || componentType}`,
    name: `${sourceNode.name || sourceNode.id} ${componentType}`,
    type: nodeType,
    parentId: sourceNode.id,
    transform: {
      x: 0,
      y: 0,
      width: parentTransform.width,
      height: parentTransform.height
    },
    layout: { mode: "component" },
    style: {},
    props,
    children: []
  };
  const path = createNodePath(options.parentPath || "", componentNode, options.index || 0);
  const displayObject = createDisplayObject(componentNode, context, path);
  const renderNode = {
    id: componentNode.id,
    sourceId: componentNode.sourceId,
    name: componentNode.name,
    type: componentNode.type,
    componentType,
    path,
    sourceNode: componentNode,
    displayObject,
    children: [],
    parentLayoutFrame: undefined,
    parentIsRoot: false,
    layoutFrameOverride: undefined,
    resolvedTransform: null
  };

  applyNodeToDisplay(renderNode, context);
  return renderNode;
}

function enrichProgressComponentProps(props = {}) {
  return {
    progress: normalizeProgressValue(props.value ?? props.progress ?? props.current, props),
    shape: props.shape || "roundedRect",
    fill: props.trackFill ?? props.backgroundFill ?? props.fill,
    radius: props.radius ?? 0
  };
}

function enrichMaskComponentProps(props = {}) {
  return { mask: props };
}
