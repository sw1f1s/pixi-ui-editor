import { numberOr } from "../math.js";
import {
  applyTransformConstraints,
  getChildLayoutFrame,
  getContentFrame,
  getEffectiveLayout,
  getGridAxisOffset,
  normalizeAlign,
  normalizeBox,
  normalizeGap
} from "./shared.js";

export function resolveGridChildLayoutFrames(parentNode, parentTransform, children, context, _mode, resolveTransform) {
  const layout = getEffectiveLayout(parentNode);
  const padding = normalizeBox(layout.padding);
  const gap = normalizeGap(layout);
  const content = getContentFrame(parentTransform, padding);
  const columns = Math.max(1, Math.floor(numberOr(layout.columns, 1)));
  const explicitCellWidth = numberOr(layout.cellWidth ?? layout.columnWidth, NaN);
  const explicitCellHeight = numberOr(layout.cellHeight ?? layout.rowHeight, NaN);
  const cellWidth = Number.isFinite(explicitCellWidth)
    ? Math.max(0, explicitCellWidth)
    : Math.max(0, (content.width - Math.max(0, columns - 1) * gap.cross) / columns);
  const cellHeight = Number.isFinite(explicitCellHeight)
    ? Math.max(0, explicitCellHeight)
    : Math.max(0, cellWidth);
  const align = normalizeAlign(layout.alignItems ?? layout.align ?? "stretch");
  const justify = normalizeAlign(layout.justifyItems ?? layout.justify ?? "stretch");
  const result = new Map();
  let cursor = 0;

  for (const child of children) {
    const childLayout = getEffectiveLayout(child);
    const column = Math.max(0, Math.floor(numberOr(childLayout.column, cursor % columns)));
    const row = Math.max(0, Math.floor(numberOr(childLayout.row, Math.floor(cursor / columns))));
    const columnSpan = Math.max(1, Math.floor(numberOr(childLayout.columnSpan ?? childLayout.colSpan, 1)));
    const rowSpan = Math.max(1, Math.floor(numberOr(childLayout.rowSpan, 1)));
    const cellFrame = {
      x: content.x + column * (cellWidth + gap.cross),
      y: content.y + row * (cellHeight + gap.main),
      width: cellWidth * columnSpan + gap.cross * Math.max(0, columnSpan - 1),
      height: cellHeight * rowSpan + gap.main * Math.max(0, rowSpan - 1)
    };
    const base = resolveTransform(child, {
      ...context,
      ignoreAnchors: true,
      parentFrame: getChildLayoutFrame(parentTransform),
      parentIsRoot: parentNode.parentId == null
    });
    const nextWidth = justify === "stretch" ? cellFrame.width : Math.min(cellFrame.width, Math.max(0, Number(base.width || 0)));
    const nextHeight = align === "stretch" ? cellFrame.height : Math.min(cellFrame.height, Math.max(0, Number(base.height || 0)));
    const rawFrame = {
      x: cellFrame.x + getGridAxisOffset(justify, cellFrame.width, nextWidth),
      y: cellFrame.y + getGridAxisOffset(align, cellFrame.height, nextHeight),
      width: nextWidth,
      height: nextHeight
    };
    result.set(child.id, applyTransformConstraints(rawFrame, childLayout));
    cursor = Math.max(cursor + 1, row * columns + column + columnSpan);
  }

  return result;
}
