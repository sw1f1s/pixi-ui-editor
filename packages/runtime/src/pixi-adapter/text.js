import {
  createTextOutlineStyle,
  createTextShadowStyle,
  normalizeOutlineEffect,
  normalizeShadowEffect
} from "./effects.js";

export function createPixiText(TextClass, text, style) {
  try {
    return new TextClass({ text, style });
  } catch (_error) {
    return new TextClass(text, style);
  }
}

export function resolveTextStyle(node = {}) {
  const props = node.props || {};
  const transform = node.transform || {};
  const fontSize = props.fontSize;
  const rawLineHeight = props.lineHeight;
  const lineHeight = normalizeLineHeight(rawLineHeight, fontSize);
  const outline = normalizeOutlineEffect(props.outline);
  const shadow = normalizeShadowEffect(props.shadow);
  const propStyle = {
    ...(props.fontFamily !== undefined ? { fontFamily: props.fontFamily } : {}),
    ...(fontSize !== undefined ? { fontSize } : {}),
    ...(props.fill !== undefined ? { fill: props.fill } : {}),
    ...(props.align !== undefined ? { align: props.align } : {}),
    ...(props.verticalAlign !== undefined ? { verticalAlign: props.verticalAlign } : {}),
    ...(lineHeight !== undefined ? { lineHeight } : {}),
    ...(props.wrap !== undefined ? { wordWrap: props.wrap !== false } : {}),
    ...(transform.width !== undefined ? { wordWrapWidth: transform.width } : {}),
    ...(outline ? createTextOutlineStyle(outline) : {}),
    ...(shadow ? createTextShadowStyle(shadow) : {})
  };

  return {
    ...propStyle,
    ...(node.style || {})
  };
}

export function normalizeLineHeight(lineHeight, fontSize) {
  if (lineHeight === undefined) {
    return undefined;
  }

  const numericLineHeight = Number(lineHeight);
  if (!Number.isFinite(numericLineHeight)) {
    return lineHeight;
  }

  const numericFontSize = Number(fontSize);
  if (numericLineHeight <= 4 && Number.isFinite(numericFontSize)) {
    return Math.round(numericFontSize * numericLineHeight);
  }

  return numericLineHeight;
}

export function applyTextVerticalAlign(displayObject, node = {}) {
  if (!displayObject || !("text" in displayObject)) {
    return;
  }

  const props = node.props || {};
  const verticalAlign = props.verticalAlign || displayObject.style?.verticalAlign || "top";
  const baseY = displayObject.__pixiUiEditorBaseY ?? displayObject.y ?? 0;
  const frameHeight = Number(displayObject.__pixiUiEditorFrameHeight ?? node.transform?.height ?? 0);
  if (verticalAlign === "top" || !Number.isFinite(frameHeight) || frameHeight <= 0) {
    displayObject.y = baseY;
    return;
  }

  const textHeight = estimateTextHeight(displayObject, node);
  const offset = verticalAlign === "bottom"
    ? Math.max(0, frameHeight - textHeight)
    : Math.max(0, (frameHeight - textHeight) / 2);
  displayObject.y = baseY + offset;
}

function estimateTextHeight(displayObject, node = {}) {
  const props = node.props || {};
  const style = displayObject.style || {};
  const fontSize = Number(props.fontSize ?? style.fontSize ?? 0);
  const lineHeight = Number(normalizeLineHeight(props.lineHeight ?? style.lineHeight, fontSize) ?? fontSize);
  const lines = String(displayObject.text ?? props.text ?? "").split("\n").length || 1;
  return Math.max(0, (lines - 1) * lineHeight + fontSize);
}
