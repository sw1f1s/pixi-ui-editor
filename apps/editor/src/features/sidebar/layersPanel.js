import { ASSET_TYPES, applyFontAssetToSelectedText, canInstantiateComponent, clearInspectorAssetDropTargets, createSpriteNodeFromAsset, els, findNodeInProject, finishComponentDrag, getActivePage, getComponentById, getComponentDisplayName, getComponentReferenceId, instantiateComponent, isComponentInstanceNode, isMissingComponentInstanceNode, isNodeActive, NODE_COMPONENT_TYPES, render, runCommand, selectEditorNode, state, updateSelectedSpriteAsset } from "./deps.js";
import { hasExplicitNodeComponents, hasNodeComponent, getNodeComponents } from "./nodeComponents.js";
import { getAssetById, isTextureDropAsset } from "./assetBrowserPanel.js";

export function renderLayers() {
  const page = getActivePage();
  const fragment = document.createDocumentFragment();
  const rootChildren = page.root.children || [];
  for (const [index, child] of rootChildren.entries()) {
    renderLayerNode(child, fragment, 0, page.root, index, true);
  }
  if (!rootChildren.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list-message";
    empty.textContent = "No layers";
    fragment.append(empty);
  }
  els.layersList.replaceChildren(fragment);
}

export function renderLayerNode(node, parent, depth, parentNode, index, parentActive = true) {
  const children = node.children || [];
  const hasChildren = children.length > 0;
  const isCollapsed = state.collapsedLayerIds.has(node.id);
  const isInstance = isComponentInstanceNode(node);
  const isMissingInstance = isMissingComponentInstanceNode(node);
  const isActive = isNodeActive(node);
  const effectiveActive = parentActive && isActive;
  const item = document.createElement("div");
  item.className = `tree-item${state.selectedNodeId === node.id ? " is-selected" : ""}${isCollapsed ? " is-collapsed" : ""}${isInstance ? " is-instance" : ""}${isMissingInstance ? " is-missing-instance" : ""}${!effectiveActive ? " is-inactive" : ""}`;
  item.dataset.nodeId = node.id;
  item.style.setProperty("--layer-depth", String(depth));
  item.draggable = node.parentId !== null;

  const main = document.createElement("span");
  main.className = "layer-main";

  if (hasChildren) {
    const disclosure = document.createElement("button");
    disclosure.type = "button";
    disclosure.className = "layer-disclosure";
    disclosure.setAttribute("aria-label", isCollapsed ? `Expand ${node.name}` : `Collapse ${node.name}`);
    disclosure.setAttribute("aria-expanded", String(!isCollapsed));
    disclosure.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleLayerCollapsed(node.id);
    });
    disclosure.addEventListener("mousedown", (event) => {
      event.stopPropagation();
    });
    main.append(disclosure);
  } else {
    const spacer = document.createElement("span");
    spacer.className = "layer-disclosure-placeholder";
    main.append(spacer);
  }

  const activeToggle = document.createElement("button");
  activeToggle.type = "button";
  activeToggle.className = `layer-active-toggle${isActive ? " is-active" : ""}`;
  activeToggle.textContent = isActive ? "✓" : "–";
  activeToggle.title = isActive ? `Deactivate ${node.name}` : `Activate ${node.name}`;
  activeToggle.setAttribute("aria-label", activeToggle.title);
  activeToggle.setAttribute("aria-pressed", String(isActive));
  activeToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    setLayerNodeActive(node, !isActive);
  });
  activeToggle.addEventListener("mousedown", (event) => {
    event.stopPropagation();
  });
  main.append(activeToggle);

  const name = document.createElement("span");
  name.className = "layer-name";
  name.textContent = getLayerNodeName(node);
  const type = document.createElement("span");
  type.className = "node-type";
  type.textContent = getNodeLayerTypeLabel(node);

  main.append(name);
  item.append(main, type);
  item.addEventListener("click", () => {
    selectEditorNode(node.id);
    render();
  });
  item.addEventListener("dragstart", (event) => startLayerDrag(event, node));
  item.addEventListener("dragover", (event) => handleLayerItemDragOver(event, node, parentNode, index));
  item.addEventListener("drop", (event) => handleLayerItemDrop(event, node, parentNode, index));
  item.addEventListener("dragend", finishLayerDrag);
  parent.append(item);

  if (isCollapsed) {
    return;
  }

  for (const [childIndex, child] of children.entries()) {
    renderLayerNode(child, parent, depth + 1, node, childIndex, effectiveActive);
  }
}

export function getLayerNodeName(node) {
  if (isComponentInstanceNode(node) && !isMissingComponentInstanceNode(node)) {
    return getComponentDisplayName(getComponentById(getComponentReferenceId(node)));
  }

  return node.name;
}

export function setLayerNodeActive(node, active) {
  if (!node || node.parentId === null) {
    return false;
  }

  runCommand({
    type: "node.update_props",
    args: {
      nodeId: node.id,
      active
    },
    meta: { source: "user", label: `${active ? "Activate" : "Deactivate"} ${node.name}` }
  });
  return true;
}

export function getNodeLayerTypeLabel(node) {
  if (isMissingComponentInstanceNode(node)) {
    return "missing";
  }

  if (isComponentInstanceNode(node)) {
    return "instance";
  }

  const components = getNodeComponents(node);
  if (hasExplicitNodeComponents(node) && components.length) {
    return components.map((component) => component.type).join(" + ");
  }

  return node.type;
}

export function toggleLayerCollapsed(nodeId) {
  if (state.collapsedLayerIds.has(nodeId)) {
    state.collapsedLayerIds.delete(nodeId);
  } else {
    state.collapsedLayerIds.add(nodeId);
  }
  renderLayers();
}

export function startLayerDrag(event, node) {
  if (node.parentId === null) {
    event.preventDefault();
    return;
  }

  state.layerDragNodeId = node.id;
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", node.id);
  event.currentTarget.classList.add("is-dragging");
}

export function handleLayerItemDragOver(event, targetNode, parentNode, index) {
  const componentId = getDraggedComponentId(event);
  if (componentId && canInstantiateComponent(componentId) && canLayerContainChildren(targetNode)) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    showLayerDropIndicator(event.currentTarget, "inside");
    return;
  }

  const assetId = getDraggedAssetId(event);
  if (assetId && canDropAssetOnLayer(assetId, targetNode)) {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    showLayerDropIndicator(event.currentTarget, "inside");
    return;
  }

  const target = getLayerDropTarget(event, targetNode, parentNode, index);
  if (!target) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.dataTransfer.dropEffect = "move";
  showLayerDropIndicator(event.currentTarget, target.position);
}

export function handleLayerItemDrop(event, targetNode, parentNode, index) {
  const componentId = getDraggedComponentId(event);
  if (componentId && canInstantiateComponent(componentId) && canLayerContainChildren(targetNode)) {
    event.preventDefault();
    event.stopPropagation();
    clearLayerDropIndicators();
    instantiateComponent(componentId, null, targetNode.id);
    finishComponentDrag();
    return;
  }

  const assetId = getDraggedAssetId(event);
  if (assetId && canDropAssetOnLayer(assetId, targetNode)) {
    event.preventDefault();
    event.stopPropagation();
    clearLayerDropIndicators();
    dropAssetOnLayer(assetId, targetNode);
    return;
  }

  const target = getLayerDropTarget(event, targetNode, parentNode, index);
  if (!target) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  moveLayerNode(target);
}

export function handleLayerTreeDragOver(event) {
  if (event.target.closest(".tree-item")) {
    return;
  }

  const componentId = getDraggedComponentId(event);
  if (componentId && canInstantiateComponent(componentId)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    clearLayerDropIndicators();
    els.layersList.classList.add("is-drop-root");
    return;
  }

  if (getDraggedAssetId(event)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    clearLayerDropIndicators();
    els.layersList.classList.add("is-drop-root");
    return;
  }

  const target = getRootLayerDropTarget();
  if (!target) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
  clearLayerDropIndicators();
  els.layersList.classList.add("is-drop-root");
}

export function handleLayerTreeDrop(event) {
  if (event.target.closest(".tree-item")) {
    return;
  }

  const componentId = getDraggedComponentId(event);
  if (componentId && canInstantiateComponent(componentId)) {
    event.preventDefault();
    clearLayerDropIndicators();
    instantiateComponent(componentId, null, getActivePage().root.id);
    finishComponentDrag();
    return;
  }

  const assetId = getDraggedAssetId(event);
  if (assetId) {
    event.preventDefault();
    clearLayerDropIndicators();
    dropAssetOnLayer(assetId, getActivePage().root);
    return;
  }

  const target = getRootLayerDropTarget();
  if (!target) {
    return;
  }

  event.preventDefault();
  moveLayerNode(target);
}

export function finishLayerDrag() {
  state.layerDragNodeId = null;
  clearLayerDropIndicators();
  els.layersList.querySelectorAll(".is-dragging")
    .forEach((item) => item.classList.remove("is-dragging"));
}

export function getLayerDropTarget(event, targetNode, parentNode, targetIndex) {
  const draggedNodeId = getDraggedLayerNodeId(event);
  if (!draggedNodeId || draggedNodeId === targetNode.id) {
    return null;
  }

  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = rect.height > 0 ? (event.clientY - rect.top) / rect.height : 0.5;
  let position = ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside";

  if (targetNode.parentId === null) {
    position = "inside";
  } else if (position === "inside" && !canLayerContainChildren(targetNode)) {
    position = ratio < 0.5 ? "before" : "after";
  }

  const target = position === "inside"
    ? {
      nodeId: draggedNodeId,
      parentId: targetNode.id,
      index: (targetNode.children || []).length,
      position
    }
    : {
      nodeId: draggedNodeId,
      parentId: parentNode?.id || getActivePage().root.id,
      index: position === "before" ? targetIndex : targetIndex + 1,
      position
    };

  return isValidLayerDropTarget(target) ? target : null;
}

export function getRootLayerDropTarget() {
  const page = getActivePage();
  const target = {
    nodeId: state.layerDragNodeId,
    parentId: page.root.id,
    index: page.root.children.length,
    position: "inside"
  };

  return isValidLayerDropTarget(target) ? target : null;
}

export function getDraggedLayerNodeId(event) {
  return state.layerDragNodeId || event.dataTransfer?.getData("text/plain") || null;
}

export function getDraggedComponentId(event) {
  const explicitId = event.dataTransfer?.getData("application/x-pixi-ui-component-id");
  if (explicitId) {
    return explicitId;
  }

  if (state.componentDragId) {
    return state.componentDragId;
  }

  const plainId = event.dataTransfer?.getData("text/plain");
  return plainId && !state.layerDragNodeId && getComponentById(plainId) ? plainId : null;
}

export function getDraggedAssetId(event) {
  const explicitId = event.dataTransfer?.getData("application/x-pixi-ui-asset-id");
  if (explicitId) {
    return explicitId;
  }

  if (state.assetDragId) {
    return state.assetDragId;
  }

  const plainId = event.dataTransfer?.getData("text/plain");
  return plainId && !state.layerDragNodeId && getAssetById(plainId) ? plainId : null;
}

export function finishAssetDrag() {
  state.assetDragId = null;
  clearInspectorAssetDropTargets();
  clearLayerDropIndicators();
}

export function canDropAssetOnLayer(assetId, targetNode) {
  const asset = getAssetById(assetId);
  if (!asset || !targetNode) {
    return false;
  }

  if (asset.type === ASSET_TYPES.font) {
    return hasNodeComponent(targetNode, NODE_COMPONENT_TYPES.text);
  }

  return isTextureDropAsset(asset) && (hasNodeComponent(targetNode, NODE_COMPONENT_TYPES.texture) || canLayerContainChildren(targetNode));
}

export function dropAssetOnLayer(assetId, targetNode) {
  const asset = getAssetById(assetId);
  if (!asset || !targetNode) {
    return false;
  }

  state.selectedAssetId = assetId;
  if (asset.type === ASSET_TYPES.font && hasNodeComponent(targetNode, NODE_COMPONENT_TYPES.text)) {
    selectEditorNode(targetNode.id);
    const result = applyFontAssetToSelectedText(assetId);
    finishAssetDrag();
    return result;
  }

  if (isTextureDropAsset(asset) && hasNodeComponent(targetNode, NODE_COMPONENT_TYPES.texture)) {
    selectEditorNode(targetNode.id);
    const result = updateSelectedSpriteAsset(assetId);
    finishAssetDrag();
    return result;
  }

  if (isTextureDropAsset(asset) && canLayerContainChildren(targetNode)) {
    selectEditorNode(targetNode.id);
    const result = createSpriteNodeFromAsset(assetId, null, targetNode.id);
    finishAssetDrag();
    return result;
  }

  return false;
}

export function isValidLayerDropTarget(target) {
  if (!target?.nodeId || !target.parentId) {
    return false;
  }

  const dragged = findNodeInProject(state.project, target.nodeId);
  const nextParent = findNodeInProject(state.project, target.parentId);
  if (!dragged?.parent || !nextParent) {
    return false;
  }

  if (target.nodeId === target.parentId || isLayerDescendant(dragged.node, target.parentId)) {
    return false;
  }

  if (!canLayerContainChildren(nextParent.node)) {
    return false;
  }

  const originalIndex = dragged.parent.children.findIndex((child) => child.id === target.nodeId);
  const sameParent = dragged.parent.id === target.parentId;
  return !(sameParent && (target.index === originalIndex || target.index === originalIndex + 1));
}

export function canLayerContainChildren(node) {
  return Boolean(node);
}

export function isLayerDescendant(node, candidateId) {
  return (node.children || []).some((child) => child.id === candidateId || isLayerDescendant(child, candidateId));
}

export function moveLayerNode(target) {
  clearLayerDropIndicators();
  state.layerDragNodeId = null;
  selectEditorNode(target.nodeId);
  if (target.position === "inside") {
    state.collapsedLayerIds.delete(target.parentId);
  }
  runCommand({
    type: "node.reparent",
    args: {
      nodeId: target.nodeId,
      parentId: target.parentId,
      index: target.index,
      preserveWorldTransform: true
    },
    meta: { source: "user", label: "Move layer" }
  });
}

export function showLayerDropIndicator(item, position) {
  clearLayerDropIndicators();
  item.classList.add(`is-drop-${position}`);
}

export function clearLayerDropIndicators() {
  els.layersList.classList.remove("is-drop-root");
  els.layersList.querySelectorAll(".is-drop-before, .is-drop-after, .is-drop-inside")
    .forEach((item) => item.classList.remove("is-drop-before", "is-drop-after", "is-drop-inside"));
}
