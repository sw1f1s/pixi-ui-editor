import {
  childrenOf,
  createNodePath,
  getNodeTypeBucket,
  normalizeNode
} from "../helpers.js";
import { COMPONENT_TYPES } from "./types.js";
import { buildComponentInstanceRenderTree } from "./component-instance.js";
import { applyControlStateToNode } from "./control-state.js";
import { applyNodeToDisplay, createDisplayObject } from "./display.js";
import {
  getChildLayoutFrame,
  resolveChildLayoutFrames
} from "./layout.js";
import {
  buildNodeComponentRenderTree,
  getRenderComponents
} from "./node-components.js";

export function buildRenderTreeNode(sourceNode, context, options = {}) {
  const node = applyControlStateToNode(normalizeNode(sourceNode, options.fallbackId || "node"));
  const path = options.path || createNodePath(options.parentPath || "", node, options.index || 0);
  const type = getNodeTypeBucket(node);

  if (COMPONENT_TYPES.has(type)) {
    return buildComponentInstanceRenderTree(node, context, { ...options, path }, buildRenderTreeNode);
  }

  const displayObject = createDisplayObject(node, context, path);
  const renderNode = createRenderNode(node, displayObject, path, options);

  applyNodeToDisplay(renderNode, context);
  appendRenderComponents(renderNode, node, context, path, displayObject);
  appendChildNodes(renderNode, node, context, path, displayObject);

  return renderNode;
}

export function refreshRenderTree(renderNode, context) {
  applyNodeToDisplay(renderNode, context);

  const childLayoutFrames = resolveChildLayoutFrames(renderNode.sourceNode, renderNode.resolvedTransform, context);
  for (const child of renderNode.children) {
    child.parentLayoutFrame = getChildLayoutFrame(renderNode.resolvedTransform);
    child.parentIsRoot = renderNode.sourceNode?.parentId == null;
    if (!child.componentType) {
      child.layoutFrameOverride = childLayoutFrames.get(child.sourceNode?.id) || childLayoutFrames.get(child.sourceId);
    }
    refreshRenderTree(child, context);
  }

  return renderNode;
}

function createRenderNode(node, displayObject, path, options = {}) {
  return {
    id: node.id,
    sourceId: node.sourceId || node.id,
    name: node.name,
    type: node.type,
    path,
    sourceNode: node,
    displayObject,
    children: [],
    parentLayoutFrame: options.parentLayoutFrame,
    parentIsRoot: Boolean(options.parentIsRoot),
    layoutFrameOverride: options.layoutFrameOverride,
    resolvedTransform: null
  };
}

function appendRenderComponents(renderNode, node, context, path, displayObject) {
  const renderComponents = getRenderComponents(node);
  renderComponents.forEach((component, index) => {
    const componentTree = buildNodeComponentRenderTree(node, component, context, {
      parentPath: path,
      index,
      parentTransform: renderNode.resolvedTransform
    });
    renderNode.children.push(componentTree);
    context.adapter.addChild(displayObject, componentTree.displayObject);
  });
}

function appendChildNodes(renderNode, node, context, path, displayObject) {
  const renderComponents = getRenderComponents(node);
  const childLayoutFrames = resolveChildLayoutFrames(node, renderNode.resolvedTransform, context);
  childrenOf(node).forEach((child, index) => {
    const childTree = buildRenderTreeNode(child, context, {
      parentPath: path,
      index: index + renderComponents.length,
      fallbackId: `${node.id}.${index}`,
      parentLayoutFrame: getChildLayoutFrame(renderNode.resolvedTransform),
      parentIsRoot: node.parentId == null,
      layoutFrameOverride: childLayoutFrames.get(child.id) || childLayoutFrames.get(child.sourceId)
    });
    renderNode.children.push(childTree);
    context.adapter.addChild(displayObject, childTree.displayObject);
  });
}
