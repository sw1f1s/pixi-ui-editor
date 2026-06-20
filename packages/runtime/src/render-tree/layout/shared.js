import {
  deepMerge,
  getNodeComponentProps,
  isObject
} from "../../helpers.js";
import { numberOr } from "../math.js";

const ALIGN_ALIASES = {
  center: "center",
  middle: "center",
  end: "end",
  right: "end",
  bottom: "end",
  "flex-end": "end",
  stretch: "stretch",
  fill: "stretch"
};

const JUSTIFY_ALIASES = {
  "space-between": "space-between",
  between: "space-between"
};

export function getEffectiveLayout(node = {}) {
  return deepMerge({}, node.layout || {}, getNodeComponentProps(node, "layout"));
}

export function getChildLayoutFrame(transform = {}) {
  return {
    width: Math.max(0, Number(transform?.width || 0)),
    height: Math.max(0, Number(transform?.height || 0))
  };
}

export function applyTransformConstraints(frame, layout = {}) {
  const next = { ...frame };
  const minWidth = numberOr(layout.minWidth, 0);
  const minHeight = numberOr(layout.minHeight, 0);
  const maxWidth = numberOr(layout.maxWidth, Infinity);
  const maxHeight = numberOr(layout.maxHeight, Infinity);
  if (Number.isFinite(Number(next.width))) {
    next.width = Math.min(maxWidth, Math.max(minWidth, Number(next.width)));
  }
  if (Number.isFinite(Number(next.height))) {
    next.height = Math.min(maxHeight, Math.max(minHeight, Number(next.height)));
  }

  const aspectRatio = numberOr(layout.aspectRatio, NaN);
  if (Number.isFinite(aspectRatio) && aspectRatio > 0) {
    if (Number.isFinite(Number(next.width))) {
      next.height = Math.min(maxHeight, Math.max(minHeight, Number(next.width) / aspectRatio));
    } else if (Number.isFinite(Number(next.height))) {
      next.width = Math.min(maxWidth, Math.max(minWidth, Number(next.height) * aspectRatio));
    }
  }

  return next;
}

export function getContentFrame(transform = {}, padding) {
  return {
    x: padding.left,
    y: padding.top,
    width: Math.max(0, Number(transform.width || 0) - padding.left - padding.right),
    height: Math.max(0, Number(transform.height || 0) - padding.top - padding.bottom)
  };
}

export function normalizeFlexDirection(value) {
  const direction = String(value || "row").trim().toLowerCase();
  return direction === "column" || direction === "vertical" ? "column" : "row";
}

export function normalizeAlign(value) {
  const align = String(value || "start").trim().toLowerCase();
  return ALIGN_ALIASES[align] || "start";
}

export function normalizeJustify(value) {
  const justify = String(value || "start").trim().toLowerCase();
  return JUSTIFY_ALIASES[justify] || normalizeAlign(justify);
}

export function normalizeGap(layout = {}) {
  const gap = Math.max(0, numberOr(layout.gap, 0));
  return {
    main: Math.max(0, numberOr(layout.rowGap ?? layout.mainGap ?? layout.itemGap, gap)),
    cross: Math.max(0, numberOr(layout.columnGap ?? layout.crossGap, gap))
  };
}

export function normalizeBox(value) {
  if (typeof value === "number" || typeof value === "string") {
    const size = Math.max(0, numberOr(value, 0));
    return { top: size, right: size, bottom: size, left: size };
  }

  if (!isObject(value)) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const x = Math.max(0, numberOr(value.x ?? value.horizontal, 0));
  const y = Math.max(0, numberOr(value.y ?? value.vertical, 0));
  return {
    top: Math.max(0, numberOr(value.top, y)),
    right: Math.max(0, numberOr(value.right, x)),
    bottom: Math.max(0, numberOr(value.bottom, y)),
    left: Math.max(0, numberOr(value.left, x))
  };
}

export function getMainBefore(box, isRow) {
  return isRow ? box.left : box.top;
}

export function getMainAfter(box, isRow) {
  return isRow ? box.right : box.bottom;
}

export function getCrossBefore(box, isRow) {
  return isRow ? box.top : box.left;
}

export function getCrossAfter(box, isRow) {
  return isRow ? box.bottom : box.right;
}

export function getAlignOffset(align, lineCross, crossLength, margin, isRow) {
  const before = getCrossBefore(margin, isRow);
  const after = getCrossAfter(margin, isRow);
  const offsetByAlign = {
    center: before + Math.max(0, lineCross - crossLength - before - after) / 2,
    end: Math.max(before, lineCross - crossLength - after)
  };
  return offsetByAlign[align] ?? before;
}

export function getJustifyOffset(justify, freeMain) {
  const offsetByJustify = {
    center: freeMain / 2,
    end: freeMain
  };
  return offsetByJustify[justify] ?? 0;
}

export function getGridAxisOffset(align, cellSize, itemSize) {
  const offsetByAlign = {
    center: Math.max(0, (cellSize - itemSize) / 2),
    end: Math.max(0, cellSize - itemSize)
  };
  return offsetByAlign[align] ?? 0;
}
