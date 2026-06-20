// canvas rendering.
import { els, state, session, bindEditorApi } from "../app/editorRuntime.js";
import { NODE_COMPONENT_TYPES, NODE_TYPES, validateProject } from "../app/editorDeps.js";
import { ANCHOR_HANDLE_SIZE, SELECTION_HANDLE_SIZE } from "../app/editorConfig.js";
const { collectWorldNodes, getActivePage, getAnchorHandlesForNode, getAssetById, getAssetImageSrc, getAtlasFrame, getCanvasSize, getComponentById, getComponentReferenceId, getEditableSelectedNode, getFirstAtlasFrameName, getNodeAnchors, getNodeCanvasBounds, getNodeComponentProps, getNodeLocalFrame, getNodeResolvedLocalFrame, getNodeWorldAnchorFrame, getSafeAreaFrame, getSelectionHandles, getTextureNineSliceDefault, getTextureRenderType, getViewport, hasExplicitNodeComponents, hasNodeComponent, isBoundsInside, isComponentInstanceNode, isNodeActive, isNodeLayoutManagedByParent, isTransparentColor, normalizeSafeArea, safeAreaHasInsets, worldBoundsToCanvasBounds } = bindEditorApi(["collectWorldNodes","getActivePage","getAnchorHandlesForNode","getAssetById","getAssetImageSrc","getAtlasFrame","getCanvasSize","getComponentById","getComponentReferenceId","getEditableSelectedNode","getFirstAtlasFrameName","getNodeAnchors","getNodeCanvasBounds","getNodeComponentProps","getNodeLocalFrame","getNodeResolvedLocalFrame","getNodeWorldAnchorFrame","getSafeAreaFrame","getSelectionHandles","getTextureNineSliceDefault","getTextureRenderType","getViewport","hasExplicitNodeComponents","hasNodeComponent","isBoundsInside","isComponentInstanceNode","isNodeActive","isNodeLayoutManagedByParent","isTransparentColor","normalizeSafeArea","safeAreaHasInsets","worldBoundsToCanvasBounds"]);

export function renderValidation() {
  const messages = [
    ...validateProject(state.project),
    ...getLayoutValidationMessages()
  ];
  if (!messages.length) {
    els.validationList.innerHTML = "<div class=\"validation-item\">Project is valid.</div>";
    return;
  }

  els.validationList.replaceChildren(...messages.map((message) => {
    const item = document.createElement("div");
    item.className = `validation-item ${message.severity}`;
    item.textContent = `${message.code}: ${message.message}`;
    return item;
  }));
}

export function getLayoutValidationMessages() {
  const page = getActivePage();
  const canvasSize = getCanvasSize(page);
  const rootFrame = getNodeLocalFrame(page.root);
  const canvasBounds = {
    x: rootFrame.x,
    y: rootFrame.y,
    width: canvasSize.width,
    height: canvasSize.height
  };

  return collectWorldNodes(page.root)
    .filter((entry) => entry.node.id !== page.root.id && isNodeActive(entry.node))
    .filter((entry) => !isBoundsInside(entry.bounds, canvasBounds))
    .map((entry) => ({
      severity: "warning",
      code: "layout.overflow",
      message: `Node "${entry.node.name}" is outside the active device canvas.`
    }));
}

export function renderCanvas() {
  const page = getActivePage();
  const canvasSize = getCanvasSize(page);
  const rootFrame = getNodeLocalFrame(page.root);
  const rect = els.canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  els.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  els.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  session.canvasContext.setTransform(dpr, 0, 0, dpr, 0, 0);
  session.canvasContext.clearRect(0, 0, rect.width, rect.height);

  const viewport = getViewport(rect, page);
  session.canvasContext.save();
  session.canvasContext.translate(viewport.x, viewport.y);
  session.canvasContext.scale(viewport.scale, viewport.scale);

  if (!isTransparentColor(page.canvas.background)) {
    session.canvasContext.fillStyle = page.canvas.background;
    session.canvasContext.fillRect(rootFrame.x, rootFrame.y, canvasSize.width, canvasSize.height);
  }
  session.canvasContext.strokeStyle = "#566074";
  session.canvasContext.lineWidth = 2 / viewport.scale;
  session.canvasContext.strokeRect(rootFrame.x, rootFrame.y, canvasSize.width, canvasSize.height);
  drawSafeAreaOverlay(page, rootFrame, canvasSize, viewport);

  const previewTree = buildEditorPreviewRenderTree(page, canvasSize);
  for (const childTree of previewTree.children || []) {
    drawRenderTreeNode(childTree, viewport, { x: rootFrame.x, y: rootFrame.y });
  }

  session.canvasContext.restore();
  drawSmartGuides(viewport);
  drawSelectionControls(viewport);
}

export function buildEditorPreviewRenderTree(page, canvasSize) {
  const manifest = {
    tokens: state.project.tokens || {},
    themes: state.project.themes || [],
    styleLibraries: state.project.styleLibraries || [],
    assets: state.project.assets || [],
    components: state.project.components || [],
    locales: state.project.locales || []
  };
  const assetsById = new Map((state.project.assets || []).map((asset) => [String(asset.id), asset]));
  const componentsById = new Map((state.project.components || []).map((component) => [String(component.id), component]));

  return session.editorPreviewRenderer.buildRenderTreeNode(page.root, {
    manifest,
    assetsById,
    componentsById,
    data: page.variables || {},
    viewport: {
      width: canvasSize.width,
      height: canvasSize.height,
      safeArea: normalizeSafeArea(page.canvas.safeArea)
    },
    theme: page.editorMeta?.theme || "default",
    stateByNodeId: new Map()
  }, {
    path: page.id,
    fallbackId: `${page.id}.root`
  });
}

export function drawSafeAreaOverlay(page, rootFrame, canvasSize, viewport) {
  const safeArea = normalizeSafeArea(page.canvas.safeArea);
  if (!safeAreaHasInsets(safeArea)) {
    return;
  }

  const safeFrame = getSafeAreaFrame(rootFrame, canvasSize, safeArea);
  session.canvasContext.save();
  session.canvasContext.fillStyle = "rgba(51, 184, 165, 0.07)";
  if (safeArea.top > 0) {
    session.canvasContext.fillRect(rootFrame.x, rootFrame.y, canvasSize.width, safeArea.top);
  }
  if (safeArea.bottom > 0) {
    session.canvasContext.fillRect(rootFrame.x, rootFrame.y + canvasSize.height - safeArea.bottom, canvasSize.width, safeArea.bottom);
  }
  if (safeArea.left > 0) {
    session.canvasContext.fillRect(rootFrame.x, rootFrame.y, safeArea.left, canvasSize.height);
  }
  if (safeArea.right > 0) {
    session.canvasContext.fillRect(rootFrame.x + canvasSize.width - safeArea.right, rootFrame.y, safeArea.right, canvasSize.height);
  }

  session.canvasContext.setLineDash([12 / viewport.scale, 8 / viewport.scale]);
  session.canvasContext.strokeStyle = "#33b8a5";
  session.canvasContext.lineWidth = 2 / viewport.scale;
  session.canvasContext.strokeRect(safeFrame.x, safeFrame.y, safeFrame.width, safeFrame.height);
  session.canvasContext.restore();
}

export function drawNode(node, viewport, parentWorld = { x: 0, y: 0 }, parentFrame = null) {
  if (!isNodeActive(node)) {
    return;
  }

  const frame = getNodeResolvedLocalFrame(node, {
    parentFrame: parentFrame || getCanvasSize(getActivePage())
  });
  const x = parentWorld.x + frame.x;
  const y = parentWorld.y + frame.y;
  const { width, height } = frame;
  session.canvasContext.save();
  session.canvasContext.globalAlpha = node.style?.alpha ?? 1;

  const hasComponentRenderer = hasExplicitNodeComponents(node);
  if (!hasComponentRenderer && (node.type === "graphics" || node.type === "button" || node.type === "container")) {
    drawRectNode(node, x, y, width, height);
  }

  if (node.type === "text") {
    drawTextNode(node, x, y, width, height);
  }

  if (node.type === "sprite") {
    drawSpriteNode(node, x, y, width, height);
  }

  for (const child of node.children || []) {
    drawNode(child, viewport, { x, y }, frame);
  }

  session.canvasContext.restore();
}

export function drawRenderTreeNode(renderNode, viewport, parentWorld = { x: 0, y: 0 }) {
  const displayObject = renderNode.displayObject || {};
  if (displayObject.visible === false) {
    return;
  }

  const frame = displayObject.transform || renderNode.resolvedTransform || getNodeLocalFrame(renderNode.sourceNode);
  const x = parentWorld.x + Number(frame.x || 0);
  const y = parentWorld.y + Number(frame.y || 0);
  const width = Math.max(0, Number(frame.width || 0));
  const height = Math.max(0, Number(frame.height || 0));
  const node = createPreviewNodeFromRenderTree(renderNode);
  const isComponentBackedShell = hasPreviewRenderComponents(renderNode.sourceNode);

  session.canvasContext.save();
  session.canvasContext.globalAlpha = frame.alpha ?? displayObject.style?.alpha ?? node.style?.alpha ?? 1;

  if (isMissingComponentInstanceRenderNode(renderNode)) {
    drawMissingInstancePlaceholder(node, x, y, width, height, viewport);
  }

  if (!isComponentBackedShell && (displayObject.kind === "Graphics" || node.type === "graphics" || node.type === "button" || node.type === "container")) {
    drawRectNode(node, x, y, width, height);
  }

  if (displayObject.kind === "Text" || node.type === "text") {
    drawTextNode(node, x, y, width, height);
  }

  if (displayObject.kind === "Sprite" || node.type === "sprite") {
    drawSpriteNode(node, x, y, width, height, displayObject.texture);
  }

  for (const childTree of renderNode.children || []) {
    drawRenderTreeNode(childTree, viewport, { x, y });
  }

  session.canvasContext.restore();
}

export function isMissingComponentInstanceRenderNode(renderNode) {
  const node = renderNode?.sourceNode;
  return Boolean(node?.type === NODE_TYPES.componentInstance && !renderNode.component);
}

export function hasPreviewRenderComponents(node) {
  return hasExplicitNodeComponents(node) && [
    NODE_COMPONENT_TYPES.fill,
    NODE_COMPONENT_TYPES.texture,
    NODE_COMPONENT_TYPES.text,
    NODE_COMPONENT_TYPES.progressBar,
    NODE_COMPONENT_TYPES.mask
  ].some((componentType) => hasNodeComponent(node, componentType));
}

export function drawMissingInstancePlaceholder(node, x, y, width, height, viewport) {
  const safeWidth = Math.max(width, 80);
  const safeHeight = Math.max(height, 44);
  session.canvasContext.save();
  session.canvasContext.fillStyle = "rgba(255, 80, 92, 0.12)";
  session.canvasContext.strokeStyle = "#ff5c68";
  session.canvasContext.lineWidth = 2 / viewport.scale;
  session.canvasContext.setLineDash([8 / viewport.scale, 6 / viewport.scale]);
  session.canvasContext.fillRect(x, y, safeWidth, safeHeight);
  session.canvasContext.strokeRect(x, y, safeWidth, safeHeight);
  session.canvasContext.setLineDash([]);
  session.canvasContext.fillStyle = "#ffb4ba";
  session.canvasContext.font = `${Math.max(10, 13 / viewport.scale)}px Inter, sans-serif`;
  session.canvasContext.textBaseline = "middle";
  session.canvasContext.textAlign = "center";
  session.canvasContext.fillText("missing", x + safeWidth / 2, y + safeHeight / 2);
  session.canvasContext.restore();
}

export function createPreviewNodeFromRenderTree(renderNode) {
  const displayObject = renderNode.displayObject || {};
  return {
    ...(renderNode.sourceNode || {}),
    type: renderNode.sourceNode?.type || displayObject.nodeType,
    style: {
      ...(renderNode.sourceNode?.style || {}),
      ...(displayObject.style || {})
    },
    props: {
      ...(renderNode.sourceNode?.props || {}),
      ...(displayObject.props || {}),
      ...("text" in displayObject ? { text: displayObject.text } : {})
    }
  };
}

export function drawSelectionControls(viewport) {
  const node = getEditableSelectedNode();
  if (!node) {
    return;
  }

  const bounds = getNodeCanvasBounds(node, viewport);
  const handles = getSelectionHandles(bounds);
  const hideSelectionFrame = nodeHasActiveNineSliceTexture(node);

  session.canvasContext.save();
  if (!hideSelectionFrame) {
    session.canvasContext.lineWidth = 3;
    session.canvasContext.strokeStyle = "#000000";
    session.canvasContext.setLineDash([]);
    session.canvasContext.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    session.canvasContext.lineWidth = 1;
    session.canvasContext.strokeStyle = "#ffffff";
    session.canvasContext.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  drawAnchorHandles(node, viewport, bounds);

  for (const handle of handles) {
    session.canvasContext.beginPath();
    session.canvasContext.rect(
      handle.x - SELECTION_HANDLE_SIZE / 2,
      handle.y - SELECTION_HANDLE_SIZE / 2,
      SELECTION_HANDLE_SIZE,
      SELECTION_HANDLE_SIZE
    );
    session.canvasContext.fillStyle = "#ffffff";
    session.canvasContext.fill();
    session.canvasContext.lineWidth = 2;
    session.canvasContext.strokeStyle = "#000000";
    session.canvasContext.stroke();
  }

  const frame = getNodeResolvedLocalFrame(node);
  const label = `${Math.round(frame.x)}, ${Math.round(frame.y)} · ${Math.round(frame.width)} x ${Math.round(frame.height)}`;
  session.canvasContext.font = "12px Inter, sans-serif";
  const labelWidth = Math.ceil(session.canvasContext.measureText(label).width) + 14;
  const labelX = bounds.x;
  const labelY = Math.max(8, bounds.y - 25);
  session.canvasContext.fillStyle = "rgba(15, 18, 24, 0.94)";
  roundedRect(session.canvasContext, labelX, labelY, labelWidth, 20, 5);
  session.canvasContext.fill();
  session.canvasContext.fillStyle = "#dce3ed";
  session.canvasContext.textBaseline = "top";
  session.canvasContext.fillText(label, labelX + 7, labelY + 4);
  session.canvasContext.restore();
}

export function nodeHasActiveNineSliceTexture(node) {
  if (isComponentInstanceNode(node)) {
    const component = getComponentById(getComponentReferenceId(node));
    return nodeTreeHasActiveNineSliceTexture(component?.rootNode);
  }

  return nodeTreeHasActiveNineSliceTexture(node);
}

export function nodeTreeHasActiveNineSliceTexture(node) {
  if (!node) {
    return false;
  }

  if (!hasNodeComponent(node, NODE_COMPONENT_TYPES.texture)) {
    return (node.children || []).some((child) => nodeTreeHasActiveNineSliceTexture(child));
  }

  const textureProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.texture);
  const asset = getAssetById(textureProps.assetId);
  return getTextureRenderType(textureProps, asset) === "sliced" &&
    Boolean(normalizeNineSlice(textureProps.nineSlice) || getTextureNineSliceDefault(asset, textureProps)) ||
    (node.children || []).some((child) => nodeTreeHasActiveNineSliceTexture(child));
}

export function drawAnchorHandles(node, viewport, selectionBounds) {
  const anchors = getNodeAnchors(node);
  if (!anchors || isNodeLayoutManagedByParent(node)) {
    return;
  }

  const anchorFrame = worldBoundsToCanvasBounds(getNodeWorldAnchorFrame(node), viewport);
  const handles = getAnchorHandlesForNode(node, viewport, selectionBounds);

  session.canvasContext.save();
  session.canvasContext.setLineDash([6, 5]);
  session.canvasContext.lineWidth = 1;
  session.canvasContext.strokeStyle = "#33b8a5";
  session.canvasContext.strokeRect(anchorFrame.x, anchorFrame.y, anchorFrame.width, anchorFrame.height);
  session.canvasContext.setLineDash([]);

  for (const handle of handles) {
    session.canvasContext.beginPath();
    session.canvasContext.moveTo(handle.anchorX, handle.anchorY);
    session.canvasContext.lineTo(handle.x, handle.y);
    session.canvasContext.strokeStyle = "rgba(51, 184, 165, 0.72)";
    session.canvasContext.lineWidth = 1;
    session.canvasContext.stroke();

    drawAnchorDiamond(handle.x, handle.y, ANCHOR_HANDLE_SIZE);
  }
  session.canvasContext.restore();
}

export function drawAnchorDiamond(x, y, size) {
  const half = size / 2;
  session.canvasContext.beginPath();
  session.canvasContext.moveTo(x, y - half);
  session.canvasContext.lineTo(x + half, y);
  session.canvasContext.lineTo(x, y + half);
  session.canvasContext.lineTo(x - half, y);
  session.canvasContext.closePath();
  session.canvasContext.fillStyle = "#33b8a5";
  session.canvasContext.fill();
  session.canvasContext.lineWidth = 2;
  session.canvasContext.strokeStyle = "#000000";
  session.canvasContext.stroke();
  session.canvasContext.lineWidth = 1;
  session.canvasContext.strokeStyle = "#ffffff";
  session.canvasContext.stroke();
}

export function drawSmartGuides(viewport) {
  if (!state.smartGuides) {
    return;
  }

  session.canvasContext.save();
  session.canvasContext.lineWidth = 1;
  session.canvasContext.setLineDash([]);

  for (const highlight of state.smartGuides.highlights || []) {
    const bounds = worldBoundsToCanvasBounds(highlight.bounds, viewport);
    session.canvasContext.strokeStyle = highlight.kind === "spacing" ? "#ff7ad9" : "#68d8ff";
    session.canvasContext.fillStyle = highlight.kind === "spacing" ? "rgba(255, 122, 217, 0.08)" : "rgba(104, 216, 255, 0.07)";
    session.canvasContext.setLineDash([5, 4]);
    session.canvasContext.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
    session.canvasContext.fillRect(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  session.canvasContext.setLineDash([]);
  for (const line of state.smartGuides.lines || []) {
    session.canvasContext.strokeStyle = line.kind === "spacing" ? "#ff7ad9" : "#68d8ff";
    session.canvasContext.beginPath();
    if (line.axis === "x") {
      const x = viewport.x + line.value * viewport.scale;
      session.canvasContext.moveTo(x, viewport.y + line.from * viewport.scale);
      session.canvasContext.lineTo(x, viewport.y + line.to * viewport.scale);
    } else {
      const y = viewport.y + line.value * viewport.scale;
      session.canvasContext.moveTo(viewport.x + line.from * viewport.scale, y);
      session.canvasContext.lineTo(viewport.x + line.to * viewport.scale, y);
    }
    session.canvasContext.stroke();
  }

  for (const guide of state.smartGuides.distances || []) {
    drawDistanceGuide(guide, viewport);
  }

  session.canvasContext.restore();
}

export function drawDistanceGuide(guide, viewport) {
  const start = guide.from * viewport.scale;
  const end = guide.to * viewport.scale;
  const at = guide.at * viewport.scale;
  const value = Math.abs(Math.round(guide.to - guide.from));
  const color = guide.kind === "spacing" ? "#ff7ad9" : "#f2c14e";

  session.canvasContext.strokeStyle = color;
  session.canvasContext.fillStyle = color;
  session.canvasContext.lineWidth = 1;
  session.canvasContext.beginPath();
  if (guide.axis === "x") {
    const x1 = viewport.x + start;
    const x2 = viewport.x + end;
    const y = viewport.y + at;
    session.canvasContext.moveTo(x1, y);
    session.canvasContext.lineTo(x2, y);
    session.canvasContext.moveTo(x1, y - 4);
    session.canvasContext.lineTo(x1, y + 4);
    session.canvasContext.moveTo(x2, y - 4);
    session.canvasContext.lineTo(x2, y + 4);
    session.canvasContext.stroke();
    drawGuideLabel(String(value), (x1 + x2) / 2, y - 19, color);
  } else {
    const x = viewport.x + at;
    const y1 = viewport.y + start;
    const y2 = viewport.y + end;
    session.canvasContext.moveTo(x, y1);
    session.canvasContext.lineTo(x, y2);
    session.canvasContext.moveTo(x - 4, y1);
    session.canvasContext.lineTo(x + 4, y1);
    session.canvasContext.moveTo(x - 4, y2);
    session.canvasContext.lineTo(x + 4, y2);
    session.canvasContext.stroke();
    drawGuideLabel(String(value), x + 8, (y1 + y2) / 2 - 10, color);
  }
}

export function drawGuideLabel(label, x, y, color) {
  session.canvasContext.font = "11px Inter, sans-serif";
  const width = Math.ceil(session.canvasContext.measureText(label).width) + 10;
  session.canvasContext.fillStyle = "rgba(15, 18, 24, 0.96)";
  roundedRect(session.canvasContext, x - width / 2, y, width, 18, 5);
  session.canvasContext.fill();
  session.canvasContext.fillStyle = color;
  session.canvasContext.textBaseline = "top";
  session.canvasContext.fillText(label, x - width / 2 + 5, y + 3);
}

export function applyCanvasShadow(node) {
  const shadow = normalizeCanvasShadow(node?.props?.shadow);
  if (!shadow) {
    return;
  }

  applyCanvasShadowValue(shadow);
}

export function applyCanvasShadowValue(shadow) {
  session.canvasContext.shadowColor = colorWithAlpha(shadow.color, shadow.alpha);
  session.canvasContext.shadowBlur = shadow.blur;
  session.canvasContext.shadowOffsetX = shadow.offsetX;
  session.canvasContext.shadowOffsetY = shadow.offsetY;
}

export function drawCanvasOutlineRect(nodeOrOutline, x, y, width, height, radius = 0) {
  const outline = nodeOrOutline?.width !== undefined && nodeOrOutline?.color !== undefined
    ? nodeOrOutline
    : normalizeCanvasOutline(nodeOrOutline?.props?.outline);
  if (!outline) {
    return;
  }

  session.canvasContext.save();
  roundedRect(session.canvasContext, x, y, width, height, radius);
  session.canvasContext.lineWidth = outline.width;
  session.canvasContext.strokeStyle = colorWithAlpha(outline.color, outline.alpha);
  session.canvasContext.stroke();
  session.canvasContext.restore();
}

export function normalizeCanvasShadow(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const alpha = clampUnit(value.alpha ?? value.opacity ?? 0.35);
  const blur = Math.max(0, Number(value.blur ?? 12) || 0);
  const offsetX = Number(value.offsetX ?? value.x ?? 0) || 0;
  const offsetY = Number(value.offsetY ?? value.y ?? 6) || 0;
  if (alpha <= 0 || (blur <= 0 && offsetX === 0 && offsetY === 0)) {
    return null;
  }

  return {
    color: value.color || "#000000",
    alpha,
    blur,
    offsetX,
    offsetY
  };
}

export function normalizeCanvasOutline(value) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const width = Math.max(0, Number(value.width ?? value.thickness ?? 2) || 0);
  const alpha = clampUnit(value.alpha ?? value.opacity ?? 1);
  if (width <= 0 || alpha <= 0) {
    return null;
  }

  return {
    color: value.color || "#ffffff",
    alpha,
    width
  };
}

export function clampUnit(value) {
  const number = Number(value);
  return Math.min(1, Math.max(0, Number.isFinite(number) ? number : 1));
}

export function colorWithAlpha(color, alpha) {
  const value = String(color || "#000000");
  if (/^#([0-9a-f]{3})$/i.test(value)) {
    const hex = value.slice(1).split("").map((part) => part + part).join("");
    return hexToRgba(hex, alpha);
  }
  if (/^#([0-9a-f]{6})$/i.test(value)) {
    return hexToRgba(value.slice(1), alpha);
  }
  return value;
}

function hexToRgba(hex, alpha) {
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${clampUnit(alpha)})`;
}

export function drawRectNode(node, x, y, width, height) {
  const radius = Number(node.props?.radius || 0);
  const fill = node.props?.fill ?? node.style?.fill;
  const stroke = node.props?.stroke ?? node.style?.stroke;
  const strokeWidth = Number(node.props?.strokeWidth ?? node.style?.strokeWidth ?? 0);
  const outline = normalizeCanvasOutline(node.props?.outline);
  if (!fill && (!stroke || strokeWidth <= 0) && !outline) {
    return;
  }

  session.canvasContext.save();
  applyCanvasShadow(node);
  roundedRect(session.canvasContext, x, y, width, height, radius);
  if (fill && !isTransparentColor(fill)) {
    session.canvasContext.fillStyle = fill;
    session.canvasContext.fill();
  }
  if (stroke && strokeWidth > 0 && !isTransparentColor(stroke)) {
    session.canvasContext.lineWidth = strokeWidth;
    session.canvasContext.strokeStyle = stroke;
    session.canvasContext.stroke();
  }
  session.canvasContext.restore();
  drawCanvasOutlineRect(outline, x, y, width, height, radius);
}

export function drawSpriteNode(node, x, y, width, height, resolvedAsset = null) {
  const asset = resolvedAsset || getAssetById(node.props?.assetId);
  const src = getAssetImageSrc(asset);
  const image = src ? getCachedAssetImage(src) : null;

  if (!asset || !image || !image.complete || !image.naturalWidth) {
    drawMissingAssetPlaceholder(node, x, y, width, height, asset ? "Loading asset" : "Missing asset");
    return;
  }

  const frameName = node.props?.frame || getFirstAtlasFrameName(asset);
  const frame = asset?.frame || getAtlasFrame(asset, frameName);
  const sourceRect = frame
    ? {
      x: frame.x,
      y: frame.y,
      width: frame.width,
      height: frame.height
    }
    : {
      x: 0,
      y: 0,
      width: image.naturalWidth,
      height: image.naturalHeight
  };

  const textureType = getTextureRenderType(node.props || {}, asset);
  const outline = normalizeCanvasOutline(node.props?.outline);
  const shadow = normalizeCanvasShadow(node.props?.shadow);
  const textureProps = node.props || {};
  if (textureType === "tiled") {
    const target = { x, y, width, height };
    drawSpriteContentWithEffects({
      target,
      outline,
      shadow,
      drawContent: (context, drawTarget) => drawTextureContentWithProps(context, drawTarget, textureProps, (drawContext, contentTarget) => {
        drawTiledImageToContext(drawContext, image, sourceRect, contentTarget);
      })
    });
    return;
  }

  const nineSlice = textureType === "sliced"
    ? normalizeNineSlice(textureProps.nineSlice) || getTextureNineSliceDefault(asset, textureProps)
    : null;
  if (nineSlice) {
    const target = { x, y, width, height };
    drawSpriteContentWithEffects({
      target,
      outline,
      shadow,
      drawContent: (context, drawTarget) => drawTextureContentWithProps(context, drawTarget, textureProps, (drawContext, contentTarget) => {
        drawNineSliceImageToContext(drawContext, image, sourceRect, contentTarget, nineSlice);
      })
    });
    return;
  }

  const target = getObjectFitRect(sourceRect, { x, y, width, height }, textureProps.objectFit || "contain");
  drawSpriteContentWithEffects({
    target,
    outline,
    shadow,
    drawContent: (context, drawTarget) => drawTextureContentWithProps(context, drawTarget, textureProps, (drawContext, contentTarget) => {
      drawContext.drawImage(
        image,
        sourceRect.x,
        sourceRect.y,
        sourceRect.width,
        sourceRect.height,
        contentTarget.x,
        contentTarget.y,
        contentTarget.width,
        contentTarget.height
      );
    })
  });
}

export function drawTextureContentWithProps(context, target, props = {}, drawRaw) {
  const flipX = isTextureFlagEnabled(props.flipX ?? props.flip?.x);
  const flipY = isTextureFlagEnabled(props.flipY ?? props.flip?.y);
  const tint = normalizeTextureTint(props.tint ?? props.color ?? props.textureTint);
  if (!flipX && !flipY && !tint) {
    drawRaw(context, target);
    return;
  }

  context.save();
  const drawTarget = flipX || flipY
    ? { x: 0, y: 0, width: target.width, height: target.height }
    : target;

  if (flipX || flipY) {
    context.translate(target.x + (flipX ? target.width : 0), target.y + (flipY ? target.height : 0));
    context.scale(flipX ? -1 : 1, flipY ? -1 : 1);
  }

  if (tint) {
    drawTintedTextureContent(context, drawTarget, tint, drawRaw);
  } else {
    drawRaw(context, drawTarget);
  }
  context.restore();
}

export function drawTintedTextureContent(context, target, tint, drawRaw) {
  const width = Math.max(0, Number(target.width || 0));
  const height = Math.max(0, Number(target.height || 0));
  if (width <= 0 || height <= 0) {
    return;
  }

  const scale = getSpriteMaskScale(width, height);
  const canvasWidth = Math.max(1, Math.ceil(width * scale));
  const canvasHeight = Math.max(1, Math.ceil(height * scale));
  const tintCanvas = createScratchCanvas(canvasWidth, canvasHeight);
  const tintContext = tintCanvas.getContext("2d");
  if (!tintContext) {
    drawRaw(context, target);
    return;
  }

  const localTarget = { x: 0, y: 0, width, height };
  tintContext.setTransform(scale, 0, 0, scale, 0, 0);
  drawRaw(tintContext, localTarget);
  tintContext.globalCompositeOperation = "multiply";
  tintContext.fillStyle = formatTextureTint(tint);
  tintContext.fillRect(0, 0, width, height);
  tintContext.globalCompositeOperation = "destination-in";
  drawRaw(tintContext, localTarget);
  tintContext.globalCompositeOperation = "source-over";
  tintContext.setTransform(1, 0, 0, 1, 0, 0);

  context.drawImage(tintCanvas, target.x, target.y, width, height);
}

export function normalizeTextureTint(value) {
  if (value === undefined || value === null || value === false) {
    return null;
  }

  if (typeof value === "number") {
    return value === 0xffffff ? null : value;
  }

  const text = String(value).trim().toLowerCase();
  if (!text || text === "white" || text === "#fff" || text === "#ffffff" || text === "0xffffff" || text === "16777215") {
    return null;
  }
  return value;
}

function formatTextureTint(value) {
  if (typeof value === "number") {
    return `#${Math.max(0, Math.min(0xffffff, value)).toString(16).padStart(6, "0")}`;
  }
  return String(value);
}

function isTextureFlagEnabled(value) {
  return value === true || value === 1 || value === "1" || String(value).toLowerCase() === "true";
}

export function drawTiledImage(image, source, target) {
  drawTiledImageToContext(session.canvasContext, image, source, target);
}

export function drawTiledImageToContext(context, image, source, target) {
  const tileWidth = Math.max(1, Number(source.width || 0));
  const tileHeight = Math.max(1, Number(source.height || 0));
  const targetRight = target.x + Math.max(0, Number(target.width || 0));
  const targetBottom = target.y + Math.max(0, Number(target.height || 0));
  if (targetRight <= target.x || targetBottom <= target.y) {
    return;
  }

  context.save();
  context.beginPath();
  context.rect(target.x, target.y, target.width, target.height);
  context.clip();
  for (let dy = target.y; dy < targetBottom; dy += tileHeight) {
    const drawHeight = Math.min(tileHeight, targetBottom - dy);
    for (let dx = target.x; dx < targetRight; dx += tileWidth) {
      const drawWidth = Math.min(tileWidth, targetRight - dx);
      context.drawImage(
        image,
        source.x,
        source.y,
        drawWidth,
        drawHeight,
        dx,
        dy,
        drawWidth,
        drawHeight
      );
    }
  }
  context.restore();
}

export function getCachedAssetImage(src) {
  if (session.imageAssetCache.has(src)) {
    return session.imageAssetCache.get(src);
  }

  const image = new Image();
  image.addEventListener("load", renderCanvas, { once: true });
  image.addEventListener("error", renderCanvas, { once: true });
  image.src = src;
  session.imageAssetCache.set(src, image);
  return image;
}

export function drawMissingAssetPlaceholder(node, x, y, width, height, label) {
  session.canvasContext.save();
  session.canvasContext.fillStyle = "rgba(255, 255, 255, 0.045)";
  session.canvasContext.strokeStyle = "#ff6b6b";
  session.canvasContext.setLineDash([8, 6]);
  session.canvasContext.lineWidth = 2;
  session.canvasContext.fillRect(x, y, width, height);
  session.canvasContext.strokeRect(x, y, width, height);
  session.canvasContext.setLineDash([]);
  session.canvasContext.fillStyle = "#ffb3b3";
  session.canvasContext.font = "14px Inter, sans-serif";
  session.canvasContext.textAlign = "center";
  session.canvasContext.textBaseline = "middle";
  session.canvasContext.fillText(label || node.name || "Sprite", x + width / 2, y + height / 2, Math.max(20, width - 12));
  session.canvasContext.restore();
}

export function drawSpriteContentWithEffects({ target, outline, shadow, drawContent }) {
  const hasShadow = Boolean(shadow);
  if (hasShadow) {
    session.canvasContext.save();
    applyCanvasShadowValue(shadow);
    drawContent(session.canvasContext, target);
    session.canvasContext.restore();
  }

  if (outline) {
    drawCanvasImageOutline({
      target,
      outline,
      drawMask: (context, maskTarget) => drawContent(context, maskTarget)
    });
  }

  if (!hasShadow || outline) {
    drawContent(session.canvasContext, target);
  }
}

export function drawCanvasImageOutline({ target, outline, drawMask }) {
  if (!outline || !drawMask || target.width <= 0 || target.height <= 0) {
    return;
  }

  const padding = Math.ceil(outline.width) + 2;
  const scale = getSpriteMaskScale(target.width + padding * 2, target.height + padding * 2);
  const canvasWidth = Math.max(1, Math.ceil((target.width + padding * 2) * scale));
  const canvasHeight = Math.max(1, Math.ceil((target.height + padding * 2) * scale));
  const maskCanvas = createScratchCanvas(canvasWidth, canvasHeight);
  const maskContext = maskCanvas.getContext("2d");
  if (!maskContext) {
    return;
  }

  maskContext.setTransform(scale, 0, 0, scale, 0, 0);
  drawMask(maskContext, {
    x: padding,
    y: padding,
    width: target.width,
    height: target.height
  });

  const tintCanvas = createScratchCanvas(canvasWidth, canvasHeight);
  const tintContext = tintCanvas.getContext("2d");
  if (!tintContext) {
    return;
  }

  tintContext.drawImage(maskCanvas, 0, 0);
  tintContext.globalCompositeOperation = "source-in";
  tintContext.fillStyle = colorWithAlpha(outline.color, outline.alpha);
  tintContext.fillRect(0, 0, canvasWidth, canvasHeight);
  tintContext.globalCompositeOperation = "source-over";

  const outlineCanvas = createScratchCanvas(canvasWidth, canvasHeight);
  const outlineContext = outlineCanvas.getContext("2d");
  if (!outlineContext) {
    return;
  }

  for (const offset of getOutlineOffsets(outline.width)) {
    outlineContext.drawImage(tintCanvas, offset.x * scale, offset.y * scale);
  }

  session.canvasContext.save();
  session.canvasContext.drawImage(
    outlineCanvas,
    target.x - padding,
    target.y - padding,
    canvasWidth / scale,
    canvasHeight / scale
  );
  session.canvasContext.restore();
}

export function getSpriteMaskScale(width, height) {
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  const maxDimension = Math.max(1, Number(width || 0), Number(height || 0));
  return Math.max(0.35, Math.min(2, dpr, 2048 / maxDimension));
}

export function getOutlineOffsets(width) {
  const radius = Math.max(1, Number(width || 0));
  const directions = Math.max(12, Math.min(32, Math.ceil(radius * 4)));
  const ringStep = Math.max(1, radius / 6);
  const offsets = [];
  const seen = new Set();

  for (let ring = ringStep; ring <= radius + 0.001; ring += ringStep) {
    for (let index = 0; index < directions; index += 1) {
      const angle = index / directions * Math.PI * 2;
      const x = Math.round(Math.cos(angle) * ring * 1000) / 1000;
      const y = Math.round(Math.sin(angle) * ring * 1000) / 1000;
      const key = `${x}:${y}`;
      if (!seen.has(key)) {
        seen.add(key);
        offsets.push({ x, y });
      }
    }
  }

  return offsets;
}

export function createScratchCanvas(width, height) {
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function getObjectFitRect(sourceRect, targetRect, fit) {
  if (fit === "fill") {
    return targetRect;
  }

  const sourceRatio = sourceRect.width / Math.max(1, sourceRect.height);
  const targetRatio = targetRect.width / Math.max(1, targetRect.height);
  let width = targetRect.width;
  let height = targetRect.height;

  if (fit === "none") {
    width = sourceRect.width;
    height = sourceRect.height;
  } else if ((fit === "contain" && sourceRatio > targetRatio) || (fit === "cover" && sourceRatio < targetRatio)) {
    height = width / sourceRatio;
  } else {
    width = height * sourceRatio;
  }

  return {
    x: targetRect.x + (targetRect.width - width) / 2,
    y: targetRect.y + (targetRect.height - height) / 2,
    width,
    height
  };
}

export function normalizeNineSlice(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "number" || typeof value === "string") {
    const size = Math.max(0, Number(value || 0));
    if (!Number.isFinite(size) || size <= 0) {
      return null;
    }
    return {
      left: size,
      right: size,
      top: size,
      bottom: size
    };
  }

  const left = Math.max(0, Number(value.left || 0));
  const right = Math.max(0, Number(value.right ?? value.left ?? 0));
  const top = Math.max(0, Number(value.top || 0));
  const bottom = Math.max(0, Number(value.bottom ?? value.top ?? 0));
  if (![left, right, top, bottom].some((part) => part > 0)) {
    return null;
  }
  return {
    left,
    right,
    top,
    bottom
  };
}

export function drawNineSliceImage(image, source, target, slice) {
  drawNineSliceImageToContext(session.canvasContext, image, source, target, slice);
}

export function drawNineSliceImageToContext(context, image, source, target, slice) {
  const left = Math.min(slice.left, source.width / 2, target.width / 2);
  const right = Math.min(slice.right, source.width / 2, target.width / 2);
  const top = Math.min(slice.top, source.height / 2, target.height / 2);
  const bottom = Math.min(slice.bottom, source.height / 2, target.height / 2);
  const cols = [
    [source.x, left, target.x, left],
    [source.x + left, source.width - left - right, target.x + left, target.width - left - right],
    [source.x + source.width - right, right, target.x + target.width - right, right]
  ];
  const rows = [
    [source.y, top, target.y, top],
    [source.y + top, source.height - top - bottom, target.y + top, target.height - top - bottom],
    [source.y + source.height - bottom, bottom, target.y + target.height - bottom, bottom]
  ];

  for (const [sy, sh, dy, dh] of rows) {
    for (const [sx, sw, dx, dw] of cols) {
      if (sw > 0 && sh > 0 && dw > 0 && dh > 0) {
        context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
      }
    }
  }
}

export function drawTextNode(node, x, y, width, height) {
  const fontSize = Number(node.props.fontSize || 42);
  const fontAsset = getAssetById(node.props.fontAssetId);
  if (fontAsset) {
    registerFontAsset(fontAsset);
  }
  const fontFamily = fontAsset?.family || node.props.fontFamily || "Inter";
  const lineHeightValue = Number(node.props.lineHeight || 1.2);
  const lineHeight = Math.max(fontSize, lineHeightValue <= 4 ? fontSize * lineHeightValue : lineHeightValue);
  const align = ["left", "center", "right"].includes(node.props.align) ? node.props.align : "left";
  const verticalAlign = ["top", "middle", "bottom"].includes(node.props.verticalAlign) ? node.props.verticalAlign : "top";
  session.canvasContext.font = `${fontSize}px ${formatCanvasFontFamily(fontFamily)}, sans-serif`;
  const lines = getTextLines(node.props.text || "", width, node.props.wrap !== false);
  const textHeight = lines.length ? (lines.length - 1) * lineHeight + fontSize : 0;

  let textY = y;
  if (verticalAlign === "middle") {
    textY = y + Math.max(0, (height - textHeight) / 2);
  } else if (verticalAlign === "bottom") {
    textY = y + Math.max(0, height - textHeight);
  }

  const textX = align === "center"
    ? x + width / 2
    : align === "right"
      ? x + width
      : x;

  session.canvasContext.fillStyle = node.props.fill || "#ffffff";
  session.canvasContext.textBaseline = "top";
  session.canvasContext.textAlign = align;
  const outline = normalizeCanvasOutline(node.props?.outline);

  session.canvasContext.save();
  applyCanvasShadow(node);
  for (const [index, line] of lines.entries()) {
    if (outline) {
      session.canvasContext.lineWidth = outline.width;
      session.canvasContext.strokeStyle = colorWithAlpha(outline.color, outline.alpha);
      session.canvasContext.strokeText(line, textX, textY + index * lineHeight, width);
    }
    session.canvasContext.fillText(line, textX, textY + index * lineHeight, width);
  }
  session.canvasContext.restore();

  session.canvasContext.textAlign = "left";
}

export function formatCanvasFontFamily(fontFamily) {
  const value = String(fontFamily || "Inter");
  return /^[a-z0-9_-]+$/i.test(value) ? value : JSON.stringify(value);
}

export function registerFontAsset(asset) {
  if (!asset?.src || !asset.family || typeof FontFace === "undefined" || !document?.fonts) {
    return false;
  }

  if (session.fontAssetCache.has(asset.id)) {
    return true;
  }

  const font = new FontFace(asset.family, `url(${asset.src})`);
  session.fontAssetCache.set(asset.id, font);
  font.load()
    .then((loaded) => {
      document.fonts.add(loaded);
      renderCanvas();
    })
    .catch(() => {
      session.fontAssetCache.delete(asset.id);
    });
  return true;
}

export function getTextLines(text, width, wrap) {
  const paragraphs = String(text).split("\n");
  if (!wrap || width <= 0) {
    return paragraphs;
  }

  const lines = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }

    const words = paragraph.split(/\s+/);
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && session.canvasContext.measureText(candidate).width > width) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }

  return lines;
}

export function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.quadraticCurveTo(x + width, y, x + width, y + r);
  context.lineTo(x + width, y + height - r);
  context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  context.lineTo(x + r, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - r);
  context.lineTo(x, y + r);
  context.quadraticCurveTo(x, y, x + r, y);
  context.closePath();
}
