import { bindEditorApi, els } from "../../app/editorRuntime.js";
import { roundCanvasNumber } from "../../app/editorDeps.js";
import { DISTANCE_GUIDE_MAX, SMART_GUIDE_PIXEL_THRESHOLD } from "../../app/editorConfig.js";

const { collectWorldNodes, getActivePage, getNodeWorldOrigin, getViewport, isNodeActive } = bindEditorApi([
  "collectWorldNodes",
  "getActivePage",
  "getNodeWorldOrigin",
  "getViewport",
  "isNodeActive"
]);

export function getSmartSnappedTransform(node, transform, interaction) {
  const parentOrigin = getNodeWorldOrigin(node.parentId);
  const worldBounds = localTransformToWorldBounds(transform, parentOrigin);
  const viewport = getViewport(els.canvas.getBoundingClientRect(), getActivePage());
  const threshold = SMART_GUIDE_PIXEL_THRESHOLD / viewport.scale;
  const candidates = getSmartGuideCandidates(node);

  const result = {
    transform: { ...transform },
    guides: {
      lines: [],
      distances: [],
      highlights: []
    }
  };

  let nextBounds = { ...worldBounds };

  if (interaction.mode === "move") {
    const spacingSnap = getEqualSpacingSnap(node, nextBounds, candidates, threshold);
    if (spacingSnap.x) {
      result.transform.x = roundCanvasNumber(result.transform.x + spacingSnap.x.delta);
      nextBounds.x += spacingSnap.x.delta;
    }
    if (spacingSnap.y) {
      result.transform.y = roundCanvasNumber(result.transform.y + spacingSnap.y.delta);
      nextBounds.y += spacingSnap.y.delta;
    }
    appendSmartGuideResult(result.guides, spacingSnap.guides);

    const snapX = getAxisSnap("x", nextBounds, candidates, threshold);
    if (snapX) {
      result.transform.x = roundCanvasNumber(result.transform.x + snapX.delta);
      nextBounds.x += snapX.delta;
      appendSmartGuideResult(result.guides, snapX.guides);
    }

    const snapY = getAxisSnap("y", nextBounds, candidates, threshold);
    if (snapY) {
      result.transform.y = roundCanvasNumber(result.transform.y + snapY.delta);
      nextBounds.y += snapY.delta;
      appendSmartGuideResult(result.guides, snapY.guides);
    }
  } else {
    const snapX = getResizeAxisSnap("x", interaction.handle, nextBounds, candidates, threshold);
    if (snapX) {
      applyResizeSnap(result.transform, nextBounds, "x", interaction.handle, snapX.delta);
      appendSmartGuideResult(result.guides, snapX.guides);
    }

    const snapY = getResizeAxisSnap("y", interaction.handle, nextBounds, candidates, threshold);
    if (snapY) {
      applyResizeSnap(result.transform, nextBounds, "y", interaction.handle, snapY.delta);
      appendSmartGuideResult(result.guides, snapY.guides);
    }
  }

  appendSmartGuideResult(result.guides, getDistanceGuides(node, nextBounds, candidates));
  normalizeSmartGuides(result.guides);
  return result;
}

export function getAxisSnap(axis, bounds, candidates, threshold) {
  const anchors = getBoundsAnchors(bounds, axis);
  let best = null;

  for (const candidate of candidates) {
    for (const from of anchors) {
      for (const to of getBoundsAnchors(candidate.bounds, axis)) {
        const delta = to.value - from.value;
        if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
          best = createSnapResult(axis, delta, to.value, bounds, candidate.bounds);
        }
      }
    }
  }

  return best;
}

export function getResizeAxisSnap(axis, handle, bounds, candidates, threshold) {
  const handleKey = axis === "x"
    ? handle.includes("w") ? "min" : handle.includes("e") ? "max" : null
    : handle.includes("n") ? "min" : handle.includes("s") ? "max" : null;

  if (!handleKey) {
    return null;
  }

  const anchor = getBoundsAnchors(bounds, axis).find((candidate) => candidate.key === handleKey);
  let best = null;

  for (const candidate of candidates) {
    for (const to of getBoundsAnchors(candidate.bounds, axis)) {
      const delta = to.value - anchor.value;
      if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
        best = createSnapResult(axis, delta, to.value, bounds, candidate.bounds);
      }
    }
  }

  return best;
}

export function createSnapResult(axis, delta, value, bounds, candidateBounds, kind = "snap") {
  const from = axis === "x"
    ? Math.min(bounds.y, candidateBounds.y) - 18
    : Math.min(bounds.x, candidateBounds.x) - 18;
  const to = axis === "x"
    ? Math.max(bounds.y + bounds.height, candidateBounds.y + candidateBounds.height) + 18
    : Math.max(bounds.x + bounds.width, candidateBounds.x + candidateBounds.width) + 18;

  return {
    delta,
    guides: {
      lines: [{ axis, value, from, to, kind }],
      distances: [],
      highlights: [{ bounds: candidateBounds, kind }]
    }
  };
}

export function applyResizeSnap(transform, bounds, axis, handle, delta) {
  if (axis === "x" && handle.includes("e")) {
    transform.width = roundCanvasNumber(transform.width + delta);
    bounds.width += delta;
  } else if (axis === "x" && handle.includes("w")) {
    transform.x = roundCanvasNumber(transform.x + delta);
    transform.width = roundCanvasNumber(transform.width - delta);
    bounds.x += delta;
    bounds.width -= delta;
  } else if (axis === "y" && handle.includes("s")) {
    transform.height = roundCanvasNumber(transform.height + delta);
    bounds.height += delta;
  } else if (axis === "y" && handle.includes("n")) {
    transform.y = roundCanvasNumber(transform.y + delta);
    transform.height = roundCanvasNumber(transform.height - delta);
    bounds.y += delta;
    bounds.height -= delta;
  }
}

export function getEqualSpacingSnap(node, bounds, candidates, threshold) {
  const guides = {
    lines: [],
    distances: [],
    highlights: []
  };
  const result = { guides };
  const horizontal = getEqualSpacingAxisSnap("x", node, bounds, candidates, threshold);
  const vertical = getEqualSpacingAxisSnap("y", node, bounds, candidates, threshold);

  if (horizontal) {
    result.x = horizontal;
    appendSmartGuideResult(guides, horizontal.guides);
  }
  if (vertical) {
    result.y = vertical;
    appendSmartGuideResult(guides, vertical.guides);
  }

  return result;
}

export function getEqualSpacingAxisSnap(axis, node, bounds, candidates, threshold) {
  const peers = candidates.filter((candidate) => candidate.parentId === node.parentId && candidate.nodeId !== getActivePage().root.id);
  const before = peers
    .filter((candidate) => isAlignedForSpacing(axis, bounds, candidate.bounds) && getMax(candidate.bounds, axis) <= getMin(bounds, axis))
    .sort((a, b) => getMax(b.bounds, axis) - getMax(a.bounds, axis))[0];
  const after = peers
    .filter((candidate) => isAlignedForSpacing(axis, bounds, candidate.bounds) && getMin(candidate.bounds, axis) >= getMax(bounds, axis))
    .sort((a, b) => getMin(a.bounds, axis) - getMin(b.bounds, axis))[0];

  if (!before || !after) {
    return null;
  }

  const available = getMin(after.bounds, axis) - getMax(before.bounds, axis);
  const targetSize = getSize(bounds, axis);
  const gap = (available - targetSize) / 2;
  if (gap < 0) {
    return null;
  }

  const targetMin = getMax(before.bounds, axis) + gap;
  const delta = targetMin - getMin(bounds, axis);
  if (Math.abs(delta) > threshold) {
    return null;
  }

  const snappedBounds = axis === "x"
    ? { ...bounds, x: bounds.x + delta }
    : { ...bounds, y: bounds.y + delta };
  return {
    delta,
    guides: createEqualSpacingGuides(axis, snappedBounds, before.bounds, after.bounds, gap)
  };
}

export function createEqualSpacingGuides(axis, bounds, beforeBounds, afterBounds, gap) {
  const guideAt = axis === "x"
    ? Math.max(bounds.y + bounds.height, beforeBounds.y + beforeBounds.height, afterBounds.y + afterBounds.height) + 18
    : Math.max(bounds.x + bounds.width, beforeBounds.x + beforeBounds.width, afterBounds.x + afterBounds.width) + 18;
  const lineValue = axis === "x"
    ? bounds.y + bounds.height / 2
    : bounds.x + bounds.width / 2;

  return {
    lines: [{
      axis: axis === "x" ? "y" : "x",
      value: lineValue,
      from: Math.min(getMin(beforeBounds, axis), getMin(bounds, axis), getMin(afterBounds, axis)) - 12,
      to: Math.max(getMax(beforeBounds, axis), getMax(bounds, axis), getMax(afterBounds, axis)) + 12,
      kind: "spacing"
    }],
    distances: [
      {
        axis,
        from: getMax(beforeBounds, axis),
        to: getMin(bounds, axis),
        at: guideAt,
        kind: "spacing"
      },
      {
        axis,
        from: getMax(bounds, axis),
        to: getMin(afterBounds, axis),
        at: guideAt,
        kind: "spacing"
      }
    ],
    highlights: [
      { bounds: beforeBounds, kind: "spacing" },
      { bounds: afterBounds, kind: "spacing" }
    ],
    gap
  };
}

export function getDistanceGuides(node, bounds, candidates) {
  const guides = {
    lines: [],
    distances: [],
    highlights: []
  };
  for (const axis of ["x", "y"]) {
    for (const guide of getNearestDistanceGuidesForAxis(axis, bounds, candidates)) {
      guides.distances.push(guide);
    }
  }
  return guides;
}

export function getNearestDistanceGuidesForAxis(axis, bounds, candidates) {
  const aligned = candidates.filter((candidate) => isAlignedForSpacing(axis, bounds, candidate.bounds));
  const before = aligned
    .filter((candidate) => getMax(candidate.bounds, axis) <= getMin(bounds, axis))
    .map((candidate) => ({
      axis,
      from: getMax(candidate.bounds, axis),
      to: getMin(bounds, axis),
      at: getDistanceGuideAt(axis, bounds, candidate.bounds),
      value: getMin(bounds, axis) - getMax(candidate.bounds, axis),
      kind: "distance"
    }))
    .filter((guide) => guide.value >= 0 && guide.value <= DISTANCE_GUIDE_MAX)
    .sort((a, b) => a.value - b.value)[0];
  const after = aligned
    .filter((candidate) => getMin(candidate.bounds, axis) >= getMax(bounds, axis))
    .map((candidate) => ({
      axis,
      from: getMax(bounds, axis),
      to: getMin(candidate.bounds, axis),
      at: getDistanceGuideAt(axis, bounds, candidate.bounds),
      value: getMin(candidate.bounds, axis) - getMax(bounds, axis),
      kind: "distance"
    }))
    .filter((guide) => guide.value >= 0 && guide.value <= DISTANCE_GUIDE_MAX)
    .sort((a, b) => a.value - b.value)[0];

  return [before, after].filter(Boolean);
}

export function getSmartGuideCandidates(node) {
  const page = getActivePage();
  const subtreeIds = getNodeSubtreeIds(node);
  return collectWorldNodes(page.root)
    .filter((entry) => entry.node.id !== node.id && !subtreeIds.has(entry.node.id) && isNodeActive(entry.node))
    .map((entry) => ({
      nodeId: entry.node.id,
      parentId: entry.node.parentId,
      bounds: entry.bounds
    }));
}

export function getNodeSubtreeIds(node, ids = new Set()) {
  for (const child of node.children || []) {
    ids.add(child.id);
    getNodeSubtreeIds(child, ids);
  }
  return ids;
}

export function getBoundsAnchors(bounds, axis) {
  return axis === "x"
    ? [
      { key: "min", value: bounds.x },
      { key: "center", value: bounds.x + bounds.width / 2 },
      { key: "max", value: bounds.x + bounds.width }
    ]
    : [
      { key: "min", value: bounds.y },
      { key: "center", value: bounds.y + bounds.height / 2 },
      { key: "max", value: bounds.y + bounds.height }
    ];
}

export function localTransformToWorldBounds(transform, parentOrigin) {
  return {
    x: parentOrigin.x + Number(transform.x || 0),
    y: parentOrigin.y + Number(transform.y || 0),
    width: Number(transform.width || 0),
    height: Number(transform.height || 0)
  };
}

export function getMin(bounds, axis) {
  return axis === "x" ? bounds.x : bounds.y;
}

export function getMax(bounds, axis) {
  return axis === "x" ? bounds.x + bounds.width : bounds.y + bounds.height;
}

export function getSize(bounds, axis) {
  return axis === "x" ? bounds.width : bounds.height;
}

export function getDistanceGuideAt(axis, a, b) {
  if (axis === "x") {
    const overlapTop = Math.max(a.y, b.y);
    const overlapBottom = Math.min(a.y + a.height, b.y + b.height);
    return overlapBottom >= overlapTop ? (overlapTop + overlapBottom) / 2 : Math.min(a.y, b.y) - 16;
  }

  const overlapLeft = Math.max(a.x, b.x);
  const overlapRight = Math.min(a.x + a.width, b.x + b.width);
  return overlapRight >= overlapLeft ? (overlapLeft + overlapRight) / 2 : Math.min(a.x, b.x) - 16;
}

export function isAlignedForSpacing(axis, a, b) {
  if (axis === "x") {
    return rangesOverlap(a.y, a.y + a.height, b.y, b.y + b.height);
  }
  return rangesOverlap(a.x, a.x + a.width, b.x, b.x + b.width);
}

export function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return Math.min(aEnd, bEnd) - Math.max(aStart, bStart) > 0;
}

export function appendSmartGuideResult(target, source) {
  if (!source) {
    return;
  }

  target.lines.push(...(source.lines || []));
  target.distances.push(...(source.distances || []));
  target.highlights.push(...(source.highlights || []));
}

export function normalizeSmartGuides(guides) {
  guides.lines = dedupeGuides(guides.lines, (line) => `${line.axis}:${Math.round(line.value)}:${Math.round(line.from)}:${Math.round(line.to)}:${line.kind}`);
  guides.distances = dedupeGuides(guides.distances, (guide) => `${guide.axis}:${Math.round(guide.from)}:${Math.round(guide.to)}:${Math.round(guide.at)}:${guide.kind}`);
  guides.highlights = dedupeGuides(guides.highlights, (highlight) => {
    const bounds = highlight.bounds;
    return `${Math.round(bounds.x)}:${Math.round(bounds.y)}:${Math.round(bounds.width)}:${Math.round(bounds.height)}:${highlight.kind}`;
  });
}

export function dedupeGuides(items, keyFn) {
  const seen = new Set();
  return items.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
