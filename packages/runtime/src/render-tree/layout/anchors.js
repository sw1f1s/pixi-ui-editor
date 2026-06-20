import { isObject } from "../../helpers.js";

export function resolveAnchoredTransform(transform, layout, context = {}) {
  const anchor = isObject(layout?.anchors) ? layout.anchors : layout?.anchor;
  if (!isObject(anchor)) {
    return transform;
  }

  const resolved = { ...transform };
  const frame = getAnchorLayoutFrame(context, layout);
  if (!frame) {
    return transform;
  }

  resolveHorizontalAnchor(resolved, frame, anchor);
  resolveVerticalAnchor(resolved, frame, anchor);
  resolveStretchedAnchor(resolved, frame, anchor);
  return resolved;
}

function resolveHorizontalAnchor(resolved, frame, anchor) {
  if (anchor.left !== undefined) {
    resolved.x = frame.x + anchor.left;
    return;
  }
  if (anchor.centerX !== undefined && resolved.width !== undefined) {
    resolved.x = frame.x + (frame.width - resolved.width) / 2 + anchor.centerX;
    return;
  }
  if (anchor.right !== undefined && resolved.width !== undefined) {
    resolved.x = frame.x + frame.width - resolved.width - anchor.right;
  }
}

function resolveVerticalAnchor(resolved, frame, anchor) {
  if (anchor.top !== undefined) {
    resolved.y = frame.y + anchor.top;
    return;
  }
  if (anchor.centerY !== undefined && resolved.height !== undefined) {
    resolved.y = frame.y + (frame.height - resolved.height) / 2 + anchor.centerY;
    return;
  }
  if (anchor.bottom !== undefined && resolved.height !== undefined) {
    resolved.y = frame.y + frame.height - resolved.height - anchor.bottom;
  }
}

function resolveStretchedAnchor(resolved, frame, anchor) {
  if (anchor.left !== undefined && anchor.right !== undefined) {
    resolved.width = Math.max(0, frame.width - anchor.left - anchor.right);
  }

  if (anchor.top !== undefined && anchor.bottom !== undefined) {
    resolved.height = Math.max(0, frame.height - anchor.top - anchor.bottom);
  }
}

function getAnchorLayoutFrame(context, layout) {
  const viewport = context.viewport || context;
  const parentFrame = context.parentFrame;
  if (layout.safeArea === true && (context.parentIsRoot || !parentFrame) && hasViewportSize(viewport)) {
    return getViewportLayoutFrame(viewport, layout);
  }

  if (isObject(parentFrame)) {
    return {
      x: 0,
      y: 0,
      width: Number(parentFrame.width || 0),
      height: Number(parentFrame.height || 0)
    };
  }

  if (hasViewportSize(viewport)) {
    return getViewportLayoutFrame(viewport, layout);
  }

  return null;
}

function hasViewportSize(viewport) {
  return viewport && Number.isFinite(Number(viewport.width)) && Number.isFinite(Number(viewport.height));
}

function getViewportLayoutFrame(viewport, layout) {
  const safeArea = normalizeViewportSafeArea(viewport.safeArea);
  if (layout.safeArea !== true) {
    return {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height
    };
  }

  return {
    x: safeArea.left,
    y: safeArea.top,
    width: Math.max(0, viewport.width - safeArea.left - safeArea.right),
    height: Math.max(0, viewport.height - safeArea.top - safeArea.bottom)
  };
}

function normalizeViewportSafeArea(safeArea = {}) {
  return {
    top: Math.max(0, Number(safeArea.top || 0)),
    right: Math.max(0, Number(safeArea.right || 0)),
    bottom: Math.max(0, Number(safeArea.bottom || 0)),
    left: Math.max(0, Number(safeArea.left || 0))
  };
}
