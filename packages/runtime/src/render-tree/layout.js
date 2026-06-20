import {
  childrenOf,
  coalesce,
  deepMerge,
  getNodeTypeBucket,
  isObject
} from "../helpers.js";
import { materializeNode } from "./materialization.js";
import { numberOr } from "./math.js";
import { resolveAnchoredTransform } from "./layout/anchors.js";
import { resolveFlexChildLayoutFrames } from "./layout/flex.js";
import { resolveGridChildLayoutFrames } from "./layout/grid.js";
import {
  applyTransformConstraints,
  getChildLayoutFrame,
  getEffectiveLayout
} from "./layout/shared.js";

const CHILD_LAYOUT_RESOLVERS = {
  flex: resolveFlexChildLayoutFrames,
  list: resolveFlexChildLayoutFrames,
  grid: resolveGridChildLayoutFrames
};

export {
  applyTransformConstraints,
  getChildLayoutFrame,
  getEffectiveLayout
};

export function resolveTransform(node, context = {}) {
  const props = node.props || {};
  const layout = getEffectiveLayout(node);
  const transform = deepMerge(
    {},
    {
      x: coalesce(node.x, props.x, 0),
      y: coalesce(node.y, props.y, 0),
      width: coalesce(node.width, props.width),
      height: coalesce(node.height, props.height),
      alpha: coalesce(node.alpha, node.style?.alpha, props.alpha, 1),
      rotation: coalesce(node.rotation, props.rotation, 0),
      scale: { x: 1, y: 1 },
      pivot: { x: 0, y: 0 }
    },
    node.transform || {}
  );

  const anchored = context.ignoreAnchors
    ? transform
    : resolveAnchoredTransform(transform, layout, context);
  const layoutFrame = context.layoutFrameOverride;
  if (isObject(layoutFrame)) {
    return applyTransformConstraints({
      ...anchored,
      x: numberOr(layoutFrame.x, anchored.x),
      y: numberOr(layoutFrame.y, anchored.y),
      width: numberOr(layoutFrame.width, anchored.width),
      height: numberOr(layoutFrame.height, anchored.height)
    }, layout);
  }

  return applyTransformConstraints(anchored, layout);
}

export function resolveChildLayoutFrames(parentNode, parentTransform = {}, context = {}) {
  const children = childrenOf(parentNode).filter((child) => isLayoutParticipantNode(child, context));
  const mode = normalizeLayoutMode(parentNode);
  const resolver = CHILD_LAYOUT_RESOLVERS[mode];

  if (!children.length || !resolver) {
    return new Map();
  }

  return resolver(parentNode, parentTransform, children, context, mode, resolveTransform);
}

function normalizeLayoutMode(node = {}) {
  const layout = getEffectiveLayout(node);
  const explicitMode = String(layout.mode || "").trim().toLowerCase();
  if (CHILD_LAYOUT_RESOLVERS[explicitMode]) {
    return explicitMode;
  }

  const type = getNodeTypeBucket(node);
  return CHILD_LAYOUT_RESOLVERS[type] ? type : "absolute";
}

function isLayoutParticipantNode(node, context = {}) {
  const materialized = materializeNode(node, context);
  const active = coalesce(materialized.active, materialized.enabled, materialized.props?.active, materialized.props?.enabled, true);
  const visible = coalesce(materialized.visible, materialized.style?.visible, materialized.props?.visible, true);
  return active !== false && visible !== false;
}
