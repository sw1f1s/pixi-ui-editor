import { numberOr } from "../math.js";
import {
  applyTransformConstraints,
  getAlignOffset,
  getChildLayoutFrame,
  getContentFrame,
  getCrossAfter,
  getCrossBefore,
  getEffectiveLayout,
  getJustifyOffset,
  getMainAfter,
  getMainBefore,
  normalizeAlign,
  normalizeBox,
  normalizeFlexDirection,
  normalizeGap,
  normalizeJustify
} from "./shared.js";

export function resolveFlexChildLayoutFrames(parentNode, parentTransform, children, context, mode, resolveTransform) {
  const layout = getEffectiveLayout(parentNode);
  const isList = mode === "list";
  const direction = getFlexDirection(layout, isList);
  const isRow = direction === "row";
  const wrap = !isList && Boolean(layout.wrap);
  const padding = normalizeBox(layout.padding);
  const gap = normalizeGap(layout);
  const content = getContentFrame(parentTransform, padding);
  const mainSize = isRow ? content.width : content.height;
  const crossSize = isRow ? content.height : content.width;
  const baseItems = children.map((child) => createFlexItem(child, parentNode, parentTransform, context, isRow, resolveTransform));
  const lines = packFlexLines(baseItems, mainSize, gap.main, wrap);
  const result = new Map();
  let crossCursor = isRow ? content.y : content.x;

  for (const line of lines) {
    const metrics = getFlexLineMetrics(line, mainSize, gap.main, crossSize, wrap);
    const justify = normalizeJustify(layout.justifyContent ?? layout.justify);
    const justifyGap = getFlexJustifyGap(justify, metrics.freeMain, gap.main, line.length);
    let mainCursor = (isRow ? content.x : content.y) + getJustifyOffset(justify, metrics.freeMain);

    for (const item of line) {
      const extraMain = metrics.totalGrow > 0 ? metrics.freeMain * (item.grow / metrics.totalGrow) : 0;
      const mainLength = item.baseMain + extraMain;
      const align = item.alignSelf || normalizeAlign(layout.alignItems ?? layout.align);
      const crossLength = align === "stretch"
        ? Math.max(0, metrics.lineCross - getCrossBefore(item.margin, isRow) - getCrossAfter(item.margin, isRow))
        : item.baseCross;
      const crossOffset = getAlignOffset(align, metrics.lineCross, crossLength, item.margin, isRow);
      const rawFrame = createFlexItemFrame({
        isRow,
        mainCursor,
        crossCursor,
        crossOffset,
        mainLength,
        crossLength,
        margin: item.margin
      });
      result.set(item.child.id, applyTransformConstraints(rawFrame, getEffectiveLayout(item.child)));
      mainCursor += item.outerMain + extraMain + justifyGap;
    }

    crossCursor += metrics.lineCross + gap.cross;
  }

  return result;
}

function createFlexItem(child, parentNode, parentTransform, context, isRow, resolveTransform) {
  const childFrame = resolveTransform(child, {
    ...context,
    ignoreAnchors: true,
    parentFrame: getChildLayoutFrame(parentTransform),
    parentIsRoot: parentNode.parentId == null
  });
  const childLayout = getEffectiveLayout(child);
  const margin = normalizeBox(childLayout.margin);
  const baseMain = Math.max(0, numberOr(childLayout.basis ?? childLayout.flexBasis, isRow ? childFrame.width : childFrame.height));
  const baseCross = Math.max(0, numberOr(isRow ? childFrame.height : childFrame.width, 0));
  return {
    child,
    margin,
    baseMain,
    baseCross,
    grow: Math.max(0, numberOr(childLayout.grow ?? childLayout.flexGrow, 0)),
    alignSelf: childLayout.alignSelf === undefined ? null : normalizeAlign(childLayout.alignSelf),
    outerMain: baseMain + getMainBefore(margin, isRow) + getMainAfter(margin, isRow),
    outerCross: baseCross + getCrossBefore(margin, isRow) + getCrossAfter(margin, isRow)
  };
}

function packFlexLines(items, mainSize, mainGap, wrap) {
  const lines = [];
  let current = [];
  let usedMain = 0;

  for (const item of items) {
    const itemGap = current.length ? mainGap : 0;
    if (wrap && current.length && usedMain + itemGap + item.outerMain > mainSize) {
      lines.push(current);
      current = [];
      usedMain = 0;
    }
    current.push(item);
    usedMain += (current.length > 1 ? mainGap : 0) + item.outerMain;
  }

  if (current.length) {
    lines.push(current);
  }
  return lines;
}

function getFlexLineMetrics(line, mainSize, mainGap, crossSize, wrap) {
  const baseMainTotal = line.reduce((sum, item) => sum + item.outerMain, 0);
  const baseGapTotal = Math.max(0, line.length - 1) * mainGap;
  const freeMain = Math.max(0, mainSize - baseMainTotal - baseGapTotal);
  return {
    freeMain,
    totalGrow: line.reduce((sum, item) => sum + item.grow, 0),
    lineCross: wrap
      ? Math.min(crossSize, Math.max(...line.map((item) => item.outerCross), 0))
      : crossSize
  };
}

function getFlexJustifyGap(justify, freeMain, gap, length) {
  return justify === "space-between" && length > 1
    ? gap + freeMain / (length - 1)
    : gap;
}

function createFlexItemFrame({ isRow, mainCursor, crossCursor, crossOffset, mainLength, crossLength, margin }) {
  if (isRow) {
    return {
      x: mainCursor + margin.left,
      y: crossCursor + crossOffset,
      width: mainLength,
      height: crossLength
    };
  }

  return {
    x: crossCursor + crossOffset,
    y: mainCursor + margin.top,
    width: crossLength,
    height: mainLength
  };
}

function getFlexDirection(layout, isList) {
  return normalizeFlexDirection(isList ? layout.direction || layout.orientation || "column" : layout.direction || layout.flexDirection);
}
