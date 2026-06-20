import { ASSET_TYPES, clamp, els, escapeHtml, getAssetById, getAssetImageSrc, getAtlasFrame, getCachedAssetImage, getFirstAtlasFrameName, getNodeComponentProps, getSelectedNode, hasNodeComponent, NODE_COMPONENT_TYPES, normalizeNineSlice, persistCurrentProjectDocument, renderCanvas, runCommand, state, updateSelectedSpriteFrame } from "./deps.js";
import { sanitizeAssetId } from "./fileMeta.js";

export function openSelectedAssetEditor() {
  const asset = getAssetById(state.selectedAssetId);
  if (!asset) {
    return false;
  }

  if (asset.type === ASSET_TYPES.spriteAtlas || asset.type === ASSET_TYPES.texture) {
    return openAtlasEditor(asset.id);
  }

  return false;
}

export function convertTextureAssetToAtlas(asset, options = {}) {
  const image = getAssetImageSrc(asset) ? getCachedAssetImage(getAssetImageSrc(asset)) : null;
  const size = getAtlasImageSize(asset, image);
  const name = options.frameName || getTextureEditorFrameName(asset);
  const width = Math.max(1, Number(size.width || asset.width || 128));
  const height = Math.max(1, Number(size.height || asset.height || 128));
  const frames = {
    [name]: options.frame || {
      x: 0,
      y: 0,
      width,
      height,
      sourceWidth: width,
      sourceHeight: height,
      offsetX: 0,
      offsetY: 0,
      rotated: false,
      trimmed: false
    }
  };

  state.atlasEditor = {
    assetId: asset.id,
    frameName: name
  };
  runCommand({
    type: "asset.update",
    args: {
      assetId: asset.id,
      type: ASSET_TYPES.spriteAtlas,
      frames,
      nineSlice: null,
      meta: {
        ...(asset.meta || {}),
        spriteMode: "multi",
        convertedToAtlasAt: new Date().toISOString()
      }
    },
    meta: { source: "user", label: `Convert ${asset.name || asset.id} to atlas` }
  }, { preserveInspector: true });
  persistCurrentProjectDocument();
  if (options.open === false) {
    return true;
  }
  return openAtlasEditor(asset.id, name);
}

export function convertAtlasAssetToTexture(asset) {
  if (!asset || asset.type !== ASSET_TYPES.spriteAtlas) {
    return false;
  }

  const selectedFrame = state.atlasEditor?.frameName
    ? getAtlasFrame(asset, state.atlasEditor.frameName)
    : null;
  const firstFrame = selectedFrame || getAtlasFrame(asset, getFirstAtlasFrameName(asset));
  const nineSlice = normalizeNineSlice(firstFrame?.nineSlice || asset.nineSlice || asset.meta?.nineSlice);
  runCommand({
    type: "asset.update",
    args: {
      assetId: asset.id,
      type: ASSET_TYPES.texture,
      frames: {},
      nineSlice: nineSlice || null,
      meta: {
        ...(asset.meta || {}),
        spriteMode: "single",
        convertedToTextureAt: new Date().toISOString()
      }
    },
    meta: { source: "user", label: `Convert ${asset.name || asset.id} to single sprite` }
  }, { preserveInspector: true });
  const updatedAsset = getAssetById(asset.id) || asset;
  state.atlasEditor = {
    assetId: asset.id,
    frameName: getTextureEditorFrameName(updatedAsset)
  };
  persistCurrentProjectDocument();
  renderAtlasEditor();
  renderCanvas();
  return true;
}

export function openAtlasEditor(assetId, frameName = null) {
  const asset = getAssetById(assetId);
  if (!isSpriteEditorAsset(asset)) {
    return false;
  }

  const frameMap = getSpriteEditorFrames(asset);
  const frames = Object.keys(frameMap);
  state.selectedAssetId = asset.id;
  state.atlasEditor = {
    assetId: asset.id,
    frameName: frameName && frameMap?.[frameName] ? frameName : frames[0] || null
  };
  els.atlasEditorDialog.hidden = false;
  renderAtlasEditor();
  return true;
}

export function closeAtlasEditor() {
  state.atlasEditor = null;
  els.atlasEditorDialog.hidden = true;
}

export function renderAtlasEditor() {
  if (!state.atlasEditor || els.atlasEditorDialog.hidden) {
    return;
  }

  const asset = getAssetById(state.atlasEditor.assetId);
  if (!isSpriteEditorAsset(asset)) {
    closeAtlasEditor();
    return;
  }

  const frameMap = getSpriteEditorFrames(asset);
  const frames = Object.keys(frameMap);
  if (!state.atlasEditor.frameName || !frameMap?.[state.atlasEditor.frameName]) {
    state.atlasEditor.frameName = frames[0] || null;
  }

  els.atlasEditorTitle.textContent = asset.type === ASSET_TYPES.texture
    ? `${asset.name || asset.id} · texture`
    : `${asset.name || asset.id} · ${frames.length} frames`;
  els.atlasSpriteMode.value = getSpriteEditorMode(asset);
  els.atlasEditorAddFrameButton.disabled = asset.type !== ASSET_TYPES.spriteAtlas;
  renderAtlasFrameList(asset);
  populateAtlasFrameForm(asset, state.atlasEditor.frameName);
  drawAtlasPreview();
}

export function renderAtlasFrameList(asset) {
  if (getSpriteEditorMode(asset) === "single") {
    const single = document.createElement("div");
    single.className = "atlas-frame-item is-static is-selected";
    single.innerHTML = `<strong>Single sprite</strong><span>No frame list</span>`;
    els.atlasFrameList.replaceChildren(single);
    return;
  }

  const frameMap = getSpriteEditorFrames(asset);
  const frameNames = Object.keys(frameMap);
  if (!frameNames.length) {
    const empty = document.createElement("div");
    empty.className = "empty-list-message";
    empty.textContent = "Add a frame";
    els.atlasFrameList.replaceChildren(empty);
    return;
  }

  const nodes = frameNames.map((frameName, index) => {
    const frame = frameMap[frameName];
    const sliceLabel = normalizeNineSlice(frame.nineSlice) ? " · 9-slice" : "";
    const button = document.createElement("button");
    button.type = "button";
    button.className = `atlas-frame-item${frameName === state.atlasEditor.frameName ? " is-selected" : ""}`;
    button.dataset.frameName = frameName;
    button.innerHTML = `<strong>${index}: ${escapeHtml(frameName)}</strong><span>${Math.round(frame.width)}x${Math.round(frame.height)} · ${Math.round(frame.x)}, ${Math.round(frame.y)}${sliceLabel}</span>`;
    return button;
  });
  els.atlasFrameList.replaceChildren(...nodes);
}

export function populateAtlasFrameForm(asset, frameName) {
  const frameMap = getSpriteEditorFrames(asset);
  const frame = frameName ? frameMap?.[frameName] : null;
  const disabled = !frame;
  const hideAtlasOnlyFields = asset.type === ASSET_TYPES.texture;
  [els.atlasFrameRotated, els.atlasFrameTrimmed]
    .map((input) => input?.closest(".checkbox-field"))
    .filter(Boolean)
    .forEach((field) => {
      field.hidden = hideAtlasOnlyFields;
    });
  for (const input of getAtlasFrameInputs()) {
    input.disabled = disabled;
  }
  els.atlasEditorApplyButton.disabled = disabled;
  els.atlasEditorDeleteFrameButton.disabled = disabled || asset.type === ASSET_TYPES.texture;

  if (!frame) {
    els.atlasFrameName.value = "";
    return;
  }

  els.atlasFrameName.value = frameName;
  els.atlasFrameX.value = String(frame.x ?? 0);
  els.atlasFrameY.value = String(frame.y ?? 0);
  els.atlasFrameWidth.value = String(frame.width ?? 1);
  els.atlasFrameHeight.value = String(frame.height ?? 1);
  els.atlasFrameSourceWidth.value = String(frame.sourceWidth ?? frame.width ?? 1);
  els.atlasFrameSourceHeight.value = String(frame.sourceHeight ?? frame.height ?? 1);
  els.atlasFrameOffsetX.value = String(frame.offsetX ?? 0);
  els.atlasFrameOffsetY.value = String(frame.offsetY ?? 0);
  const nineSlice = normalizeNineSlice(frame.nineSlice);
  els.atlasFrameSliceLeft.value = String(nineSlice?.left ?? 0);
  els.atlasFrameSliceRight.value = String(nineSlice?.right ?? 0);
  els.atlasFrameSliceTop.value = String(nineSlice?.top ?? 0);
  els.atlasFrameSliceBottom.value = String(nineSlice?.bottom ?? 0);
  els.atlasFrameRotated.checked = frame.rotated === true;
  els.atlasFrameTrimmed.checked = frame.trimmed === true;
}

export function getSpriteEditorMode(asset) {
  return asset?.type === ASSET_TYPES.spriteAtlas ? "multi" : "single";
}

export function handleAtlasSpriteModeChange() {
  return setAtlasSpriteMode(els.atlasSpriteMode.value);
}

export function setAtlasSpriteMode(mode) {
  const asset = getAtlasEditorAsset();
  if (!asset || (mode !== "single" && mode !== "multi")) {
    renderAtlasEditor();
    return false;
  }

  if (mode === getSpriteEditorMode(asset)) {
    renderAtlasEditor();
    return true;
  }

  if (mode === "multi") {
    const draft = readAtlasFrameForm();
    const frameName = draft.name || getTextureEditorFrameName(asset);
    const frame = draft.frame || getTextureEditorFrame(asset);
    const converted = convertTextureAssetToAtlas(asset, {
      frameName,
      frame,
      open: false
    });
    if (!converted) {
      renderAtlasEditor();
      return false;
    }
    state.atlasEditor = {
      assetId: asset.id,
      frameName
    };
    persistCurrentProjectDocument();
    renderAtlasEditor();
    renderCanvas();
    return true;
  }

  return convertAtlasAssetToTexture(asset);
}

export function getAtlasFrameInputs() {
  return [
    els.atlasFrameName,
    els.atlasFrameX,
    els.atlasFrameY,
    els.atlasFrameWidth,
    els.atlasFrameHeight,
    els.atlasFrameSourceWidth,
    els.atlasFrameSourceHeight,
    els.atlasFrameOffsetX,
    els.atlasFrameOffsetY,
    els.atlasFrameSliceLeft,
    els.atlasFrameSliceRight,
    els.atlasFrameSliceTop,
    els.atlasFrameSliceBottom,
    els.atlasFrameRotated,
    els.atlasFrameTrimmed
  ].filter(Boolean);
}

export function handleAtlasFrameListClick(event) {
  const button = event.target.closest("[data-frame-name]");
  if (!button) {
    return;
  }

  state.atlasEditor.frameName = button.dataset.frameName;
  renderAtlasEditor();
}

export function handleAtlasPreviewClick(event) {
  const asset = getAtlasEditorAsset();
  if (!asset) {
    return;
  }

  const metrics = getAtlasPreviewMetrics(asset);
  if (!metrics) {
    return;
  }

  const rect = els.atlasPreviewCanvas.getBoundingClientRect();
  const point = {
    x: ((event.clientX - rect.left) * els.atlasPreviewCanvas.width / rect.width - metrics.x) / metrics.scale,
    y: ((event.clientY - rect.top) * els.atlasPreviewCanvas.height / rect.height - metrics.y) / metrics.scale
  };
  const frameMap = getSpriteEditorFrames(asset);
  const frameName = Object.keys(frameMap).reverse().find((name) => {
    const frame = frameMap[name];
    return point.x >= frame.x &&
      point.y >= frame.y &&
      point.x <= frame.x + frame.width &&
      point.y <= frame.y + frame.height;
  });

  if (frameName) {
    state.atlasEditor.frameName = frameName;
    renderAtlasEditor();
  }
}

export function getAtlasEditorAsset() {
  return state.atlasEditor ? getAssetById(state.atlasEditor.assetId) : null;
}

export function drawAtlasPreview() {
  const asset = getAtlasEditorAsset();
  const canvas = els.atlasPreviewCanvas;
  if (!asset || !canvas) {
    return;
  }

  syncAtlasPreviewCanvasSize();
  const context = canvas.getContext("2d");
  const metrics = getAtlasPreviewMetrics(asset);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#10131f";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawAtlasChecker(context, canvas.width, canvas.height);

  if (!metrics) {
    context.fillStyle = "#9aa3b2";
    context.font = "16px Inter, sans-serif";
    context.fillText("No texture source", 24, 34);
    return;
  }

  const image = metrics.image;
  context.save();
  context.translate(metrics.x, metrics.y);
  context.scale(metrics.scale, metrics.scale);
  if (image?.complete && image.naturalWidth) {
    context.drawImage(image, 0, 0);
  } else {
    context.fillStyle = "#1b1e25";
    context.fillRect(0, 0, metrics.width, metrics.height);
    if (image) {
      image.addEventListener("load", renderAtlasEditor, { once: true });
      image.addEventListener("error", renderAtlasEditor, { once: true });
    }
  }

  context.lineWidth = 1 / metrics.scale;
  for (const [frameName, frame] of Object.entries(getSpriteEditorFrames(asset))) {
    context.strokeStyle = frameName === state.atlasEditor.frameName ? "#ffffff" : "#33b8a5";
    context.fillStyle = frameName === state.atlasEditor.frameName ? "rgba(255,255,255,0.16)" : "rgba(51,184,165,0.08)";
    context.fillRect(frame.x, frame.y, frame.width, frame.height);
    context.strokeRect(frame.x, frame.y, frame.width, frame.height);
  }

  const draft = readAtlasFrameForm();
  if (draft.frame && draft.name) {
    context.strokeStyle = "#f2c14e";
    context.lineWidth = 2 / metrics.scale;
    context.strokeRect(draft.frame.x, draft.frame.y, draft.frame.width, draft.frame.height);
    drawAtlasNineSliceGuides(context, draft.frame, metrics);
  }
  context.restore();
}

export function syncAtlasPreviewCanvasSize() {
  const canvas = els.atlasPreviewCanvas;
  const rect = canvas.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (width <= 0 || height <= 0) {
    return false;
  }
  if (canvas.width === width && canvas.height === height) {
    return false;
  }

  canvas.width = width;
  canvas.height = height;
  return true;
}

export function drawAtlasNineSliceGuides(context, frame, metrics) {
  const nineSlice = normalizeNineSlice(frame?.nineSlice);
  if (!nineSlice) {
    return;
  }

  const left = clamp(nineSlice.left, 0, frame.width);
  const right = clamp(nineSlice.right, 0, frame.width);
  const top = clamp(nineSlice.top, 0, frame.height);
  const bottom = clamp(nineSlice.bottom, 0, frame.height);
  if (!left && !right && !top && !bottom) {
    return;
  }

  const x1 = frame.x + left;
  const x2 = frame.x + Math.max(0, frame.width - right);
  const y1 = frame.y + top;
  const y2 = frame.y + Math.max(0, frame.height - bottom);
  const lineWidth = 2 / metrics.scale;

  const drawLine = (fromX, fromY, toX, toY) => {
    context.beginPath();
    context.moveTo(fromX, fromY);
    context.lineTo(toX, toY);
    context.stroke();
  };

  context.save();
  context.lineCap = "square";
  context.setLineDash([8 / metrics.scale, 5 / metrics.scale]);
  context.lineWidth = Math.max(1 / metrics.scale, lineWidth * 1.7);
  context.strokeStyle = "rgba(0, 0, 0, 0.78)";
  if (left > 0) drawLine(x1, frame.y, x1, frame.y + frame.height);
  if (right > 0) drawLine(x2, frame.y, x2, frame.y + frame.height);
  if (top > 0) drawLine(frame.x, y1, frame.x + frame.width, y1);
  if (bottom > 0) drawLine(frame.x, y2, frame.x + frame.width, y2);

  context.lineWidth = lineWidth;
  context.strokeStyle = "#33d6c2";
  if (left > 0) drawLine(x1, frame.y, x1, frame.y + frame.height);
  if (right > 0) drawLine(x2, frame.y, x2, frame.y + frame.height);
  if (top > 0) drawLine(frame.x, y1, frame.x + frame.width, y1);
  if (bottom > 0) drawLine(frame.x, y2, frame.x + frame.width, y2);
  context.restore();
}

export function drawAtlasChecker(context, width, height) {
  const size = 16;
  for (let y = 0; y < height; y += size) {
    for (let x = 0; x < width; x += size) {
      context.fillStyle = ((x / size + y / size) % 2) ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.07)";
      context.fillRect(x, y, size, size);
    }
  }
}

export function getAtlasPreviewMetrics(asset) {
  const imageSrc = getAssetImageSrc(asset);
  const image = imageSrc ? getCachedAssetImage(imageSrc) : null;
  const imageSize = getAtlasImageSize(asset, image);
  if (!imageSize.width || !imageSize.height) {
    return null;
  }

  const padding = 24;
  const scale = Math.min(
    (els.atlasPreviewCanvas.width - padding * 2) / imageSize.width,
    (els.atlasPreviewCanvas.height - padding * 2) / imageSize.height
  );
  const normalizedScale = Math.max(0.02, Math.min(8, scale));
  return {
    image,
    width: imageSize.width,
    height: imageSize.height,
    scale: normalizedScale,
    x: (els.atlasPreviewCanvas.width - imageSize.width * normalizedScale) / 2,
    y: (els.atlasPreviewCanvas.height - imageSize.height * normalizedScale) / 2
  };
}

export function getAtlasImageSize(asset, image) {
  if (image?.naturalWidth && image?.naturalHeight) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }

  const width = Number(asset.width || 0);
  const height = Number(asset.height || 0);
  if (width > 0 && height > 0) {
    return { width, height };
  }

  return Object.values(asset.frames || {}).reduce((size, frame) => ({
    width: Math.max(size.width, Number(frame.x || 0) + Number(frame.width || 0)),
    height: Math.max(size.height, Number(frame.y || 0) + Number(frame.height || 0))
  }), { width: 0, height: 0 });
}

export function isSpriteEditorAsset(asset) {
  return asset?.type === ASSET_TYPES.spriteAtlas || asset?.type === ASSET_TYPES.texture;
}

export function getSpriteEditorFrames(asset) {
  if (asset?.type === ASSET_TYPES.spriteAtlas) {
    return asset.frames || {};
  }

  if (asset?.type === ASSET_TYPES.texture) {
    return {
      [getTextureEditorFrameName(asset)]: getTextureEditorFrame(asset)
    };
  }

  return {};
}

export function getTextureEditorFrameName(asset) {
  return sanitizeAssetId(asset?.name || asset?.id || "texture") || "texture";
}

export function getTextureEditorFrame(asset) {
  const image = getAssetImageSrc(asset) ? getCachedAssetImage(getAssetImageSrc(asset)) : null;
  const size = getAtlasImageSize(asset, image);
  const width = Math.max(1, Number(size.width || asset?.width || 128));
  const height = Math.max(1, Number(size.height || asset?.height || 128));
  const frame = {
    x: 0,
    y: 0,
    width,
    height,
    sourceWidth: width,
    sourceHeight: height,
    offsetX: 0,
    offsetY: 0,
    rotated: false,
    trimmed: false
  };
  const nineSlice = normalizeNineSlice(asset?.nineSlice || asset?.meta?.nineSlice);
  if (nineSlice) {
    frame.nineSlice = nineSlice;
  }
  return frame;
}

export function isTextureEditorFrameGeometryChanged(asset, frameName, frame) {
  const original = getTextureEditorFrame(asset);
  const originalName = getTextureEditorFrameName(asset);
  const numericKeys = ["x", "y", "width", "height", "sourceWidth", "sourceHeight", "offsetX", "offsetY"];
  return frameName !== originalName ||
    numericKeys.some((key) => Number(frame?.[key] ?? 0) !== Number(original?.[key] ?? 0)) ||
    frame?.rotated === true ||
    frame?.trimmed === true;
}

export function readAtlasFrameForm() {
  const name = els.atlasFrameName.value.trim();
  if (!name) {
    return { name: "", frame: null };
  }

  const width = Math.max(1, Number(els.atlasFrameWidth.value || 1));
  const height = Math.max(1, Number(els.atlasFrameHeight.value || 1));
  const nineSlice = normalizeNineSlice({
    left: els.atlasFrameSliceLeft.value,
    right: els.atlasFrameSliceRight.value,
    top: els.atlasFrameSliceTop.value,
    bottom: els.atlasFrameSliceBottom.value
  });
  const frame = {
    x: Math.max(0, Number(els.atlasFrameX.value || 0)),
    y: Math.max(0, Number(els.atlasFrameY.value || 0)),
    width,
    height,
    sourceWidth: Math.max(1, Number(els.atlasFrameSourceWidth.value || width)),
    sourceHeight: Math.max(1, Number(els.atlasFrameSourceHeight.value || height)),
    offsetX: Number(els.atlasFrameOffsetX.value || 0),
    offsetY: Number(els.atlasFrameOffsetY.value || 0),
    rotated: els.atlasFrameRotated.checked,
    trimmed: els.atlasFrameTrimmed.checked
  };
  if (nineSlice) {
    frame.nineSlice = nineSlice;
  }
  return {
    name,
    frame
  };
}

export function applyAtlasFrameForm() {
  const asset = getAtlasEditorAsset();
  const currentFrameName = state.atlasEditor?.frameName;
  const draft = readAtlasFrameForm();
  if (!asset || !currentFrameName || !draft.name || !draft.frame) {
    return false;
  }

  if (asset.type === ASSET_TYPES.texture) {
    if (!isTextureEditorFrameGeometryChanged(asset, draft.name, draft.frame)) {
      const nineSlice = normalizeNineSlice(draft.frame.nineSlice);
      runCommand({
        type: "asset.update",
        args: {
          assetId: asset.id,
          nineSlice: nineSlice || null
        },
        meta: { source: "user", label: `Update ${asset.name || asset.id} sprite settings` }
      }, { preserveInspector: true });
      persistCurrentProjectDocument();
      renderAtlasEditor();
      renderCanvas();
      return true;
    }

    const nineSlice = normalizeNineSlice(draft.frame.nineSlice);
    const frame = {
      ...draft.frame
    };
    if (nineSlice) {
      frame.nineSlice = nineSlice;
    } else {
      delete frame.nineSlice;
    }
    runCommand({
      type: "asset.update",
      args: {
        assetId: asset.id,
        type: ASSET_TYPES.spriteAtlas,
        frames: {
          [draft.name]: frame
        },
        nineSlice: null,
        meta: {
          ...(asset.meta || {}),
          spriteMode: "multi",
          convertedToAtlasAt: new Date().toISOString()
        }
      },
      meta: { source: "user", label: `Convert ${asset.name || asset.id} to atlas frame` }
    }, { preserveInspector: true });
    state.atlasEditor.frameName = draft.name;
    persistCurrentProjectDocument();
    renderAtlasEditor();
    renderCanvas();
    return true;
  }

  const nextFrames = { ...(asset.frames || {}) };
  if (draft.name !== currentFrameName) {
    delete nextFrames[currentFrameName];
  }
  nextFrames[draft.name] = draft.frame;
  state.atlasEditor.frameName = draft.name;

  runCommand({
    type: "asset.update",
    args: {
      assetId: asset.id,
      frames: nextFrames
    },
    meta: { source: "user", label: `Update ${asset.name || asset.id} frame` }
  }, { preserveInspector: true });
  persistCurrentProjectDocument();

  const selectedNode = getSelectedNode();
  const selectedTextureProps = getNodeComponentProps(selectedNode, NODE_COMPONENT_TYPES.texture);
  if (hasNodeComponent(selectedNode, NODE_COMPONENT_TYPES.texture) && selectedTextureProps.assetId === asset.id && selectedTextureProps.frame === currentFrameName) {
    updateSelectedSpriteFrame(draft.name, { preserveInspector: true });
  }

  renderAtlasEditor();
  return true;
}

export function addAtlasFrame() {
  let asset = getAtlasEditorAsset();
  if (!asset) {
    return false;
  }

  if (asset.type === ASSET_TYPES.texture) {
    const draft = readAtlasFrameForm();
    convertTextureAssetToAtlas(asset, {
      frameName: draft.name || getTextureEditorFrameName(asset),
      frame: draft.frame || getTextureEditorFrame(asset),
      open: false
    });
    asset = getAssetById(asset.id);
  }

  const imageSize = getAtlasImageSize(asset, getAssetImageSrc(asset) ? getCachedAssetImage(getAssetImageSrc(asset)) : null);
  const frameName = createUniqueAtlasFrameName(asset);
  const frame = {
    x: 0,
    y: 0,
    width: Math.max(1, Math.min(128, imageSize.width || 128)),
    height: Math.max(1, Math.min(128, imageSize.height || 128)),
    sourceWidth: Math.max(1, Math.min(128, imageSize.width || 128)),
    sourceHeight: Math.max(1, Math.min(128, imageSize.height || 128)),
    offsetX: 0,
    offsetY: 0,
    rotated: false,
    trimmed: false
  };
  const nextFrames = { ...(asset.frames || {}), [frameName]: frame };
  state.atlasEditor.frameName = frameName;
  runCommand({
    type: "asset.update",
    args: {
      assetId: asset.id,
      frames: nextFrames
    },
    meta: { source: "user", label: `Add ${asset.name || asset.id} frame` }
  }, { preserveInspector: true });
  persistCurrentProjectDocument();
  renderAtlasEditor();
  return true;
}

export function deleteSelectedAtlasFrame() {
  const asset = getAtlasEditorAsset();
  const frameName = state.atlasEditor?.frameName;
  if (!asset || !frameName) {
    return false;
  }

  const frameNames = Object.keys(asset.frames || {});
  const nextFrames = { ...(asset.frames || {}) };
  delete nextFrames[frameName];
  const currentIndex = Math.max(0, frameNames.indexOf(frameName));
  state.atlasEditor.frameName = Object.keys(nextFrames)[Math.min(currentIndex, Object.keys(nextFrames).length - 1)] || null;
  runCommand({
    type: "asset.update",
    args: {
      assetId: asset.id,
      frames: nextFrames
    },
    meta: { source: "user", label: `Delete ${asset.name || asset.id} frame` }
  }, { preserveInspector: true });
  persistCurrentProjectDocument();
  renderAtlasEditor();
  return true;
}

export function createUniqueAtlasFrameName(asset) {
  const existing = new Set(Object.keys(asset.frames || {}));
  let index = existing.size + 1;
  let name = `frame_${index}`;
  while (existing.has(name)) {
    index += 1;
    name = `frame_${index}`;
  }
  return name;
}
