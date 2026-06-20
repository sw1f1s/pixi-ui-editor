// canvas interactions and smart guides.
import { els, state, bindEditorApi } from "../app/editorRuntime.js?v=20260620-designless";
import { findNodeInProject, moveTransform, resizeTransform, roundCanvasNumber } from "../app/editorDeps.js?v=20260620-designless";
import { ANCHOR_HANDLE_OFFSET, ANCHOR_HANDLE_SIZE, CANVAS_FILL_PADDING, CANVAS_VIEW_PADDING, HORIZONTAL_ANCHOR_KEYS, MAX_CANVAS_ZOOM, MIN_CANVAS_ZOOM, SELECTION_HANDLE_SIZE, VERTICAL_ANCHOR_KEYS } from "../app/editorConfig.js?v=20260620-designless";
import { getSmartSnappedTransform } from "./canvas/smartGuides.js?v=20260620-designless";
export * from "./canvas/smartGuides.js?v=20260620-designless";
const { canInstantiateComponent, clamp, collectWorldNodes, createAnchorsFromFrame, createSpriteNodeFromAsset, finishAssetDrag, finishComponentDrag, getActivePage, getAnchorValueFromLocalPoint, getAssetById, getCanvasFitScale, getCanvasSize, getCreationParentId, getDraggedAssetId, getDraggedComponentId, getEditableSelectedNode, getLayerContextMenuParentId, getNodeAnchorFrame, getNodeAnchorPresetId, getNodeAnchors, getNodeResolvedLocalFrame, getNodeWorldAnchorFrame, getNodeWorldOrigin, getNodeWorldTransform, getViewport, instantiateComponent, isNodeActive, isNodeLayoutManagedByParent, isTextureDropAsset, render, renderCanvas, runCommand, selectEditorNode, setAddMenuOpen, setAssetContextMenuOpen, setCanvasContextMenuOpen, setDeviceMenuOpen, setHistoryMenuOpen, setInstanceContextMenuOpen, setLayoutMenuOpen, setPageContextMenuOpen, setProjectMenuOpen, setWindowMenuOpen, updateSelectionLabel } = bindEditorApi(["canInstantiateComponent","clamp","collectWorldNodes","createAnchorsFromFrame","createSpriteNodeFromAsset","finishAssetDrag","finishComponentDrag","getActivePage","getAnchorValueFromLocalPoint","getAssetById","getCanvasFitScale","getCanvasSize","getCreationParentId","getDraggedAssetId","getDraggedComponentId","getEditableSelectedNode","getLayerContextMenuParentId","getNodeAnchorFrame","getNodeAnchorPresetId","getNodeAnchors","getNodeResolvedLocalFrame","getNodeWorldAnchorFrame","getNodeWorldOrigin","getNodeWorldTransform","getViewport","instantiateComponent","isNodeActive","isNodeLayoutManagedByParent","isTextureDropAsset","render","renderCanvas","runCommand","selectEditorNode","setAddMenuOpen","setAssetContextMenuOpen","setCanvasContextMenuOpen","setDeviceMenuOpen","setHistoryMenuOpen","setInstanceContextMenuOpen","setLayoutMenuOpen","setPageContextMenuOpen","setProjectMenuOpen","setWindowMenuOpen","updateSelectionLabel"]);

export function hitTest(canvasX, canvasY) {
  const page = getActivePage();
  const viewport = getViewport(els.canvas.getBoundingClientRect(), page);
  const x = (canvasX - viewport.x) / viewport.scale;
  const y = (canvasY - viewport.y) / viewport.scale;
  const nodes = collectWorldNodes(page.root).reverse();
  const hit = nodes.find(({ node, bounds }) => {
    if (node.id === page.root.id || !isNodeActive(node)) {
      return false;
    }
    return x >= bounds.x &&
      x <= bounds.x + bounds.width &&
      y >= bounds.y &&
      y <= bounds.y + bounds.height;
  });
  return hit?.node || null;
}

export function startCanvasTransformInteraction(event) {
  if (state.canvasInteraction) {
    return;
  }

  if (event.button === 1) {
    beginCanvasPan(event);
    return;
  }

  if (event.button > 0) {
    return;
  }

  const canvasPoint = getCanvasPoint(event);
  const selectedNode = getEditableSelectedNode();
  const viewport = getViewport(els.canvas.getBoundingClientRect(), getActivePage());
  const anchorHandle = selectedNode && !isNodeLayoutManagedByParent(selectedNode)
    ? getAnchorHandleAtCanvasPoint(canvasPoint, selectedNode, viewport)
    : null;

  if (anchorHandle && selectedNode) {
    beginAnchorDrag(event, selectedNode, anchorHandle);
    return;
  }

  const handle = selectedNode ? getResizeHandleAtCanvasPoint(canvasPoint, selectedNode, viewport) : null;

  if (handle && selectedNode) {
    beginNodeTransformDrag(event, selectedNode, "resize", handle);
    return;
  }

  const hit = hitTest(canvasPoint.x, canvasPoint.y);
  if (!hit) {
    selectEditorNode(null);
    render();
    beginCanvasPan(event);
    return;
  }

  selectEditorNode(hit.id);
  beginNodeTransformDrag(event, hit, "move", "move");
}

export function openCanvasContextMenu(event) {
  event.preventDefault();
  event.stopPropagation();
  const canvasPoint = getCanvasPoint(event);
  const page = getActivePage();
  state.contextMenuWorldPoint = canvasPointToWorld(canvasPoint);
  state.contextMenuParentId = getCreationParentId(page);
  setLayoutMenuOpen(false);
  setAddMenuOpen(false);
  setAssetContextMenuOpen(false);
  setPageContextMenuOpen(false);
  setInstanceContextMenuOpen(false);
  setCanvasContextMenuOpen(true, {
    x: event.clientX,
    y: event.clientY
  });
}

export function openLayersContextMenu(event) {
  event.preventDefault();
  event.stopPropagation();

  const page = getActivePage();
  const item = event.target.closest(".tree-item");
  const nodeId = item && els.layersList.contains(item) ? item.dataset.nodeId : page.root.id;
  const node = findNodeInProject(state.project, nodeId)?.node || page.root;

  setHistoryMenuOpen(false);
  setProjectMenuOpen(false);
  setDeviceMenuOpen(false);
  setLayoutMenuOpen(false);
  setWindowMenuOpen(false);
  setAddMenuOpen(false);
  setCanvasContextMenuOpen(false);
  setAssetContextMenuOpen(false);
  setPageContextMenuOpen(false);
  setInstanceContextMenuOpen(false);

  if (node.id === page.root.id) {
    state.selectedPageId = null;
    state.selectedNodeId = null;
  } else {
    selectEditorNode(node.id);
  }
  state.contextMenuWorldPoint = null;
  state.contextMenuParentId = getLayerContextMenuParentId(node, page);
  render();
  setCanvasContextMenuOpen(true, {
    x: event.clientX,
    y: event.clientY
  });
}

export function handleCanvasWheel(event) {
  event.preventDefault();
  const point = getCanvasPoint(event);
  const currentZoom = state.canvasView.zoom;
  const factor = Math.exp(-event.deltaY * 0.0012);
  const nextZoom = clamp(currentZoom * factor, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM);

  if (nextZoom === currentZoom) {
    return;
  }

  zoomCanvasViewAtPoint(point, nextZoom);
  render();
}

export function setCanvasZoomFromPercent(percent) {
  if (!Number.isFinite(percent)) {
    return;
  }

  const nextZoom = clamp(percent / 100, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM);
  if (Math.abs(nextZoom - state.canvasView.zoom) < 0.0001) {
    return;
  }

  zoomCanvasViewAtPoint(getCanvasViewportCenter(), nextZoom);
  render();
}

export function centerCanvasView() {
  state.canvasView = {
    ...state.canvasView,
    panX: 0,
    panY: 0
  };
  render();
}

export function fillCanvasView() {
  const page = getActivePage();
  const rect = els.canvas.getBoundingClientRect();
  const canvasSize = getCanvasSize(page);
  const baseFitScale = getCanvasFitScale(rect, canvasSize, CANVAS_VIEW_PADDING);
  const fillFitScale = getCanvasFitScale(rect, canvasSize, CANVAS_FILL_PADDING);
  const nextZoom = clamp(fillFitScale / baseFitScale, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM);
  state.canvasView = {
    zoom: nextZoom,
    panX: 0,
    panY: 0
  };
  render();
}

export function getCanvasZoomPercent() {
  return Math.round(clamp(state.canvasView.zoom, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM) * 100);
}

export function getCanvasViewportCenter() {
  const rect = els.canvas.getBoundingClientRect();
  return {
    x: rect.width / 2,
    y: rect.height / 2
  };
}

export function zoomCanvasViewAtPoint(point, nextZoom) {
  const page = getActivePage();
  const rect = els.canvas.getBoundingClientRect();
  const worldPoint = canvasPointToWorld(point);
  const nextViewport = getViewport(rect, page, {
    zoom: nextZoom,
    panX: 0,
    panY: 0
  });

  state.canvasView = {
    zoom: nextZoom,
    panX: point.x - nextViewport.x - worldPoint.x * nextViewport.scale,
    panY: point.y - nextViewport.y - worldPoint.y * nextViewport.scale
  };
}

export function selectNodeOnCanvasClick(event) {
  if (state.suppressNextCanvasClick) {
    state.suppressNextCanvasClick = false;
    return;
  }

  if (state.canvasInteraction) {
    return;
  }

  const canvasPoint = getCanvasPoint(event);
  const hit = hitTest(canvasPoint.x, canvasPoint.y);
  selectEditorNode(hit?.id || null);
  render();
}

export function beginCanvasPan(event) {
  const startPoint = getCanvasPoint(event);
  state.canvasInteraction = {
    kind: "pan",
    startPoint,
    startPan: {
      x: state.canvasView.panX,
      y: state.canvasView.panY
    },
    moved: false
  };

  if (event.pointerId !== undefined) {
    els.canvas.setPointerCapture?.(event.pointerId);
  }

  els.canvas.style.cursor = "grabbing";
  event.preventDefault();

  const isMouseDrag = event.type === "mousedown";
  const moveEventName = isMouseDrag ? "mousemove" : "pointermove";
  const upEventName = isMouseDrag ? "mouseup" : "pointerup";
  const cancelEventName = isMouseDrag ? null : "pointercancel";
  const captureLostEventName = isMouseDrag ? null : "lostpointercapture";

  const onPointerMove = (moveEvent) => {
    updateCanvasPanDrag(moveEvent);
  };

  const onPointerUp = () => {
    window.removeEventListener(moveEventName, onPointerMove);
    window.removeEventListener(upEventName, onPointerUp);
    if (cancelEventName) {
      window.removeEventListener(cancelEventName, onPointerUp);
    }
    if (captureLostEventName) {
      els.canvas.removeEventListener(captureLostEventName, onPointerUp);
    }
    commitCanvasPan();
  };

  window.addEventListener(moveEventName, onPointerMove);
  window.addEventListener(upEventName, onPointerUp, { once: true });
  if (cancelEventName) {
    window.addEventListener(cancelEventName, onPointerUp, { once: true });
  }
  if (captureLostEventName) {
    els.canvas.addEventListener(captureLostEventName, onPointerUp, { once: true });
  }
}

export function updateCanvasPanDrag(event) {
  const interaction = state.canvasInteraction;
  if (interaction?.kind !== "pan") {
    return;
  }

  state.smartGuides = null;
  const point = getCanvasPoint(event);
  const dx = point.x - interaction.startPoint.x;
  const dy = point.y - interaction.startPoint.y;

  if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
    interaction.moved = true;
  }

  state.canvasView.panX = interaction.startPan.x + dx;
  state.canvasView.panY = interaction.startPan.y + dy;
  render();
}

export function commitCanvasPan() {
  const interaction = state.canvasInteraction;
  state.canvasInteraction = null;
  state.smartGuides = null;
  updateCanvasCursor();

  if (interaction?.moved) {
    state.suppressNextCanvasClick = true;
    window.setTimeout(() => {
      state.suppressNextCanvasClick = false;
    }, 0);
  }
}

export function beginAnchorDrag(event, node, handle) {
  const anchors = getNodeAnchors(node);
  if (!node || !anchors || isNodeLayoutManagedByParent(node)) {
    return;
  }

  state.smartGuides = null;
  const startTransform = {
    x: Number(node.transform.x || 0),
    y: Number(node.transform.y || 0),
    width: Number(node.transform.width || 0),
    height: Number(node.transform.height || 0)
  };

  state.canvasInteraction = {
    kind: "anchor",
    nodeId: node.id,
    handle,
    startAnchors: { ...anchors },
    startNodeTransform: startTransform,
    startAnchorPreset: node.layout?.anchorPreset,
    startSafeArea: node.layout?.safeArea === true,
    moved: false,
    startedWithMouse: event.type === "mousedown"
  };

  if (event.pointerId !== undefined) {
    els.canvas.setPointerCapture?.(event.pointerId);
  }
  els.canvas.style.cursor = "move";
  event.preventDefault();

  const isMouseDrag = event.type === "mousedown";
  const moveEventName = isMouseDrag ? "mousemove" : "pointermove";
  const upEventName = isMouseDrag ? "mouseup" : "pointerup";
  const cancelEventName = isMouseDrag ? null : "pointercancel";
  const captureLostEventName = isMouseDrag ? null : "lostpointercapture";

  const onPointerMove = (moveEvent) => {
    updateAnchorDrag(moveEvent);
  };

  const onPointerUp = () => {
    window.removeEventListener(moveEventName, onPointerMove);
    window.removeEventListener(upEventName, onPointerUp);
    if (cancelEventName) {
      window.removeEventListener(cancelEventName, onPointerUp);
    }
    if (captureLostEventName) {
      els.canvas.removeEventListener(captureLostEventName, onPointerUp);
    }
    commitAnchorDrag();
  };

  window.addEventListener(moveEventName, onPointerMove);
  window.addEventListener(upEventName, onPointerUp, { once: true });
  if (cancelEventName) {
    window.addEventListener(cancelEventName, onPointerUp, { once: true });
  }
  if (captureLostEventName) {
    els.canvas.addEventListener(captureLostEventName, onPointerUp, { once: true });
  }
}

export function updateAnchorDrag(event) {
  const interaction = state.canvasInteraction;
  const node = interaction ? findNodeInProject(state.project, interaction.nodeId)?.node : null;
  if (interaction?.kind !== "anchor" || !node || isNodeLayoutManagedByParent(node)) {
    return;
  }

  const canvasPoint = getCanvasPoint(event);
  const actualAnchorPoint = {
    x: canvasPoint.x - interaction.handle.offsetX,
    y: canvasPoint.y - interaction.handle.offsetY
  };
  const worldPoint = canvasPointToWorld(actualAnchorPoint);
  const parentOrigin = getNodeWorldOrigin(node.parentId);
  const anchorFrame = getNodeAnchorFrame(node);
  const localPoint = {
    x: worldPoint.x - parentOrigin.x,
    y: worldPoint.y - parentOrigin.y
  };
  const nextAnchors = {
    ...getNodeAnchors(node)
  };

  if (interaction.handle.hKey) {
    nextAnchors[interaction.handle.hKey] = getAnchorValueFromLocalPoint(interaction.handle.hKey, localPoint.x, anchorFrame);
  }
  if (interaction.handle.vKey) {
    nextAnchors[interaction.handle.vKey] = getAnchorValueFromLocalPoint(interaction.handle.vKey, localPoint.y, anchorFrame);
  }

  node.layout = {
    ...node.layout,
    anchors: nextAnchors,
    anchorPreset: "custom"
  };

  interaction.moved = true;
  state.smartGuides = null;
  updateSelectionLabel(node);
  renderCanvas();
}

export function commitAnchorDrag() {
  const interaction = state.canvasInteraction;
  state.canvasInteraction = null;
  state.smartGuides = null;
  updateCanvasCursor();

  if (interaction?.kind !== "anchor" || !interaction.moved) {
    render();
    return;
  }

  state.suppressNextCanvasClick = true;
  window.setTimeout(() => {
    state.suppressNextCanvasClick = false;
  }, 0);

  const node = findNodeInProject(state.project, interaction.nodeId)?.node;
  if (!node || isNodeLayoutManagedByParent(node)) {
    render();
    return;
  }

  const finalLayout = {
    ...node.layout,
    anchors: { ...getNodeAnchors(node) },
    anchorPreset: "custom"
  };
  const finalTransform = getNodeResolvedLocalFrame(node);

  node.transform = {
    ...node.transform,
    ...interaction.startNodeTransform
  };
  node.layout = {
    ...node.layout,
    anchors: { ...interaction.startAnchors },
    anchorPreset: interaction.startAnchorPreset,
    safeArea: interaction.startSafeArea
  };

  runCommand({
    type: "node.update_props",
    args: {
      nodeId: interaction.nodeId,
      transform: finalTransform,
      layout: finalLayout
    },
    meta: { source: "user", label: `Adjust ${node.name} anchors` }
  });
}

export function beginNodeTransformDrag(event, node, mode, handle) {
  if (!node || node.parentId === null) {
    selectEditorNode(null);
    render();
    return;
  }

  state.smartGuides = null;
  const startWorld = canvasPointToWorld(getCanvasPoint(event));
  const startVisualTransform = getNodeResolvedLocalFrame(node);
  const startTransform = {
    x: Number(node.transform.x || 0),
    y: Number(node.transform.y || 0),
    width: Number(node.transform.width || 0),
    height: Number(node.transform.height || 0)
  };
  const startAnchors = getNodeAnchors(node);

  state.canvasInteraction = {
    kind: "node",
    nodeId: node.id,
    mode,
    handle,
    startWorld,
    startTransform: startVisualTransform,
    startNodeTransform: startTransform,
    startAnchors: startAnchors ? { ...startAnchors } : null,
    startAnchorPreset: node.layout?.anchorPreset,
    startSafeArea: node.layout?.safeArea === true,
    moved: false,
    startedWithMouse: event.type === "mousedown"
  };

  if (event.pointerId !== undefined) {
    els.canvas.setPointerCapture?.(event.pointerId);
  }
  els.canvas.style.cursor = getCursorForHandle(handle);
  event.preventDefault();
  const isMouseDrag = event.type === "mousedown";
  const moveEventName = isMouseDrag ? "mousemove" : "pointermove";
  const upEventName = isMouseDrag ? "mouseup" : "pointerup";
  const cancelEventName = isMouseDrag ? null : "pointercancel";
  const captureLostEventName = isMouseDrag ? null : "lostpointercapture";

  const onPointerMove = (moveEvent) => {
    updateNodeTransformDrag(moveEvent);
  };

  const onPointerUp = () => {
    window.removeEventListener(moveEventName, onPointerMove);
    window.removeEventListener(upEventName, onPointerUp);
    if (cancelEventName) {
      window.removeEventListener(cancelEventName, onPointerUp);
    }
    if (captureLostEventName) {
      els.canvas.removeEventListener(captureLostEventName, onPointerUp);
    }
    commitNodeTransformDrag();
  };

  window.addEventListener(moveEventName, onPointerMove);
  window.addEventListener(upEventName, onPointerUp, { once: true });
  if (cancelEventName) {
    window.addEventListener(cancelEventName, onPointerUp, { once: true });
  }
  if (captureLostEventName) {
    els.canvas.addEventListener(captureLostEventName, onPointerUp, { once: true });
  }
}

export function updateNodeTransformDrag(event) {
  const interaction = state.canvasInteraction;
  const node = interaction ? findNodeInProject(state.project, interaction.nodeId)?.node : null;
  if (interaction?.kind !== "node" || !node) {
    return;
  }

  const currentWorld = canvasPointToWorld(getCanvasPoint(event));
  const dx = currentWorld.x - interaction.startWorld.x;
  const dy = currentWorld.y - interaction.startWorld.y;
  const nextTransform = interaction.mode === "move"
    ? moveTransform(interaction.startTransform, dx, dy)
    : resizeTransform(interaction.startTransform, interaction.handle, dx, dy);
  const snapped = getSmartSnappedTransform(node, nextTransform, interaction);

  node.transform = {
    ...node.transform,
    ...snapped.transform
  };
  if (interaction.startAnchors) {
    node.layout = {
      ...node.layout,
      anchors: createAnchorsFromFrame(
        snapped.transform,
        getNodeAnchorFrame(node),
        Object.keys(interaction.startAnchors)
      )
    };
  }
  state.smartGuides = snapped.guides;
  interaction.moved = true;
  updateSelectionLabel(node);
  renderCanvas();
}

export function commitNodeTransformDrag() {
  const interaction = state.canvasInteraction;
  state.canvasInteraction = null;
  state.smartGuides = null;
  updateCanvasCursor();

  if (interaction?.kind !== "node" || !interaction.moved) {
    render();
    return;
  }

  state.suppressNextCanvasClick = true;
  window.setTimeout(() => {
    state.suppressNextCanvasClick = false;
  }, 0);

  const node = findNodeInProject(state.project, interaction.nodeId)?.node;
  if (!node) {
    render();
    return;
  }

  const finalLayout = interaction.startAnchors
    ? {
      ...node.layout,
      anchors: { ...getNodeAnchors(node) },
      anchorPreset: getNodeAnchorPresetId(node),
      safeArea: node.layout?.safeArea === true
    }
    : null;
  const finalTransform = {
    x: roundCanvasNumber(node.transform.x),
    y: roundCanvasNumber(node.transform.y),
    width: roundCanvasNumber(node.transform.width),
    height: roundCanvasNumber(node.transform.height)
  };

  node.transform = {
    ...node.transform,
    ...interaction.startNodeTransform
  };
  if (interaction.startAnchors) {
    node.layout = {
      ...node.layout,
      anchors: { ...interaction.startAnchors },
      anchorPreset: interaction.startAnchorPreset,
      safeArea: interaction.startSafeArea
    };
  }

  const args = {
    nodeId: interaction.nodeId,
    transform: finalTransform
  };
  if (finalLayout) {
    args.layout = finalLayout;
  }

  runCommand({
    type: "node.update_props",
    args,
    meta: { source: "user", label: interaction.mode === "move" ? "Move node on canvas" : "Resize node on canvas" }
  });
}

export function updateCanvasCursor(event) {
  if (state.canvasInteraction) {
    els.canvas.style.cursor = state.canvasInteraction.kind === "pan"
      ? "grabbing"
      : state.canvasInteraction.kind === "anchor"
        ? "move"
        : getCursorForHandle(state.canvasInteraction.handle);
    return;
  }

  if (!event) {
    els.canvas.style.cursor = "grab";
    return;
  }

  const selectedNode = getEditableSelectedNode();
  const viewport = getViewport(els.canvas.getBoundingClientRect(), getActivePage());
  const point = getCanvasPoint(event);
  const anchorHandle = selectedNode && !isNodeLayoutManagedByParent(selectedNode)
    ? getAnchorHandleAtCanvasPoint(point, selectedNode, viewport)
    : null;
  if (anchorHandle) {
    els.canvas.style.cursor = "move";
    return;
  }

  const handle = selectedNode ? getResizeHandleAtCanvasPoint(point, selectedNode, viewport) : null;

  if (handle) {
    els.canvas.style.cursor = getCursorForHandle(handle);
    return;
  }

  els.canvas.style.cursor = hitTest(point.x, point.y) ? "move" : "grab";
}

export function getResizeHandleAtCanvasPoint(point, node, viewport) {
  const bounds = getNodeCanvasBounds(node, viewport);
  return getSelectionHandles(bounds).find((handle) => {
    const half = SELECTION_HANDLE_SIZE / 2 + 3;
    return point.x >= handle.x - half &&
      point.x <= handle.x + half &&
      point.y >= handle.y - half &&
      point.y <= handle.y + half;
  })?.name || null;
}

export function getAnchorHandleAtCanvasPoint(point, node, viewport) {
  const bounds = getNodeCanvasBounds(node, viewport);
  return getAnchorHandlesForNode(node, viewport, bounds).find((handle) => {
    const half = ANCHOR_HANDLE_SIZE / 2 + 5;
    return point.x >= handle.x - half &&
      point.x <= handle.x + half &&
      point.y >= handle.y - half &&
      point.y <= handle.y + half;
  }) || null;
}

export function getAnchorHandlesForNode(node, viewport, selectionBounds = null) {
  const anchors = getNodeAnchors(node);
  if (!anchors || isNodeLayoutManagedByParent(node)) {
    return [];
  }

  const horizontalKeys = HORIZONTAL_ANCHOR_KEYS.filter((key) => anchors[key] !== undefined);
  const verticalKeys = VERTICAL_ANCHOR_KEYS.filter((key) => anchors[key] !== undefined);
  if (!horizontalKeys.length || !verticalKeys.length) {
    return [];
  }

  const anchorFrame = getNodeWorldAnchorFrame(node);
  const bounds = selectionBounds || getNodeCanvasBounds(node, viewport);
  const center = {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2
  };

  const handles = [];
  for (const hKey of horizontalKeys) {
    for (const vKey of verticalKeys) {
      const anchorPoint = worldPointToCanvasPoint({
        x: getAnchorWorldCoordinate(hKey, anchorFrame, anchors),
        y: getAnchorWorldCoordinate(vKey, anchorFrame, anchors)
      }, viewport);
      const offset = getAnchorHandleOffset(anchorPoint, center);
      handles.push({
        name: `${hKey}:${vKey}`,
        hKey,
        vKey,
        anchorX: anchorPoint.x,
        anchorY: anchorPoint.y,
        x: anchorPoint.x + offset.x,
        y: anchorPoint.y + offset.y,
        offsetX: offset.x,
        offsetY: offset.y
      });
    }
  }

  return handles;
}

export function getAnchorWorldCoordinate(key, anchorFrame, anchors) {
  if (key === "left") {
    return anchorFrame.x + anchors.left;
  }
  if (key === "right") {
    return anchorFrame.x + anchorFrame.width - anchors.right;
  }
  if (key === "centerX") {
    return anchorFrame.x + anchorFrame.width / 2 + anchors.centerX;
  }
  if (key === "top") {
    return anchorFrame.y + anchors.top;
  }
  if (key === "bottom") {
    return anchorFrame.y + anchorFrame.height - anchors.bottom;
  }
  return anchorFrame.y + anchorFrame.height / 2 + anchors.centerY;
}

export function getAnchorHandleOffset(anchorPoint, center) {
  const dx = anchorPoint.x - center.x;
  const dy = anchorPoint.y - center.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) {
    return { x: ANCHOR_HANDLE_OFFSET, y: -ANCHOR_HANDLE_OFFSET };
  }

  return {
    x: dx / length * ANCHOR_HANDLE_OFFSET,
    y: dy / length * ANCHOR_HANDLE_OFFSET
  };
}

export function getSelectionHandles(bounds) {
  const left = bounds.x;
  const centerX = bounds.x + bounds.width / 2;
  const right = bounds.x + bounds.width;
  const top = bounds.y;
  const centerY = bounds.y + bounds.height / 2;
  const bottom = bounds.y + bounds.height;

  return [
    { name: "nw", x: left, y: top },
    { name: "n", x: centerX, y: top },
    { name: "ne", x: right, y: top },
    { name: "e", x: right, y: centerY },
    { name: "se", x: right, y: bottom },
    { name: "s", x: centerX, y: bottom },
    { name: "sw", x: left, y: bottom },
    { name: "w", x: left, y: centerY }
  ];
}

export function getNodeCanvasBounds(node, viewport) {
  const transform = getNodeWorldTransform(node);
  return worldBoundsToCanvasBounds(transform, viewport);
}

export function worldBoundsToCanvasBounds(bounds, viewport) {
  return {
    x: viewport.x + bounds.x * viewport.scale,
    y: viewport.y + bounds.y * viewport.scale,
    width: bounds.width * viewport.scale,
    height: bounds.height * viewport.scale
  };
}

export function worldPointToCanvasPoint(point, viewport) {
  return {
    x: viewport.x + point.x * viewport.scale,
    y: viewport.y + point.y * viewport.scale
  };
}

export function canvasPointToWorld(point) {
  const page = getActivePage();
  const viewport = getViewport(els.canvas.getBoundingClientRect(), page);
  return {
    x: (point.x - viewport.x) / viewport.scale,
    y: (point.y - viewport.y) / viewport.scale
  };
}

export function getCanvasPoint(event) {
  const rect = els.canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top
  };
}

export function handleCanvasDragOver(event) {
  const componentId = getDraggedComponentId(event);
  if (componentId && canInstantiateComponent(componentId)) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    return;
  }

  const assetId = getDraggedAssetId(event);
  const asset = getAssetById(assetId);
  if (!isTextureDropAsset(asset)) {
    return;
  }

  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
}

export function handleCanvasDrop(event) {
  const componentId = getDraggedComponentId(event);
  if (componentId && canInstantiateComponent(componentId)) {
    event.preventDefault();
    const worldPoint = canvasPointToWorld(getCanvasPoint(event));
    instantiateComponent(componentId, worldPoint, getActivePage().root.id);
    finishComponentDrag();
    return;
  }

  const assetId = getDraggedAssetId(event);
  const asset = getAssetById(assetId);
  if (!isTextureDropAsset(asset)) {
    return;
  }

  event.preventDefault();
  const worldPoint = canvasPointToWorld(getCanvasPoint(event));
  state.selectedAssetId = assetId;
  createSpriteNodeFromAsset(assetId, worldPoint, getActivePage().root.id);
  finishAssetDrag();
}

export function getCursorForHandle(handle) {
  if (handle === "move") {
    return "move";
  }

  return {
    n: "ns-resize",
    s: "ns-resize",
    e: "ew-resize",
    w: "ew-resize",
    ne: "nesw-resize",
    sw: "nesw-resize",
    nw: "nwse-resize",
    se: "nwse-resize"
  }[handle] || "default";
}
