import {
  deepMerge,
  getNodeTypeBucket,
  isObject
} from "../../helpers.js";
import { TEXT_TYPES } from "../types.js";
import { numberOr } from "../math.js";
import { getComponentType } from "../control-shared.js";

const VISUAL_COLOR_PROP_BY_TYPE = {
  fill: "fill",
  texture: "tint",
  text: "fill",
  progressbar: "fill"
};

export function getNodeTransformSize(node = {}) {
  const transform = node.transform || {};
  const props = node.props || {};
  return {
    x: numberOr(transform.x ?? node.x ?? props.x, 0),
    y: numberOr(transform.y ?? node.y ?? props.y, 0),
    width: Math.max(0, numberOr(transform.width ?? node.width ?? props.width, 0)),
    height: Math.max(0, numberOr(transform.height ?? node.height ?? props.height, 0))
  };
}

export function setNodeFrame(node, frame, layoutPatch = null) {
  const next = {
    ...node,
    transform: {
      ...(node.transform || {}),
      ...frame
    }
  };
  if (!layoutPatch) {
    return next;
  }
  return {
    ...next,
    layout: deepMerge({}, next.layout || {}, layoutPatch)
  };
}

export function setNodeActiveState(node, active) {
  return {
    ...node,
    active: Boolean(active)
  };
}

export function setVisualColor(node, color) {
  if (color === undefined || color === null || color === "") {
    return node;
  }
  return updateComponentProps(node, Object.keys(VISUAL_COLOR_PROP_BY_TYPE), (props, type) => ({
    ...props,
    [VISUAL_COLOR_PROP_BY_TYPE[type] || "fill"]: color
  }));
}

export function setVisualStroke(node, strokeProps = {}) {
  return updateComponentProps(node, ["fill"], (props) => ({
    ...props,
    stroke: strokeProps.stroke ?? props.stroke,
    strokeWidth: strokeProps.strokeWidth ?? props.strokeWidth
  }));
}

export function setProgressVisualProps(node, progressProps = {}) {
  let next = updateComponentProps(node, ["fill"], (props) => ({
    ...props,
    fill: progressProps.trackFill ?? props.fill,
    radius: progressProps.radius ?? props.radius
  }));
  next = updateComponentProps(next, ["texture"], (props) => ({
    ...props,
    tint: progressProps.trackFill ?? props.tint
  }));
  return updateComponentProps(next, ["progressbar"], (props) => ({
    ...props,
    trackFill: progressProps.trackFill ?? props.trackFill,
    fill: progressProps.fill ?? props.fill,
    radius: progressProps.radius ?? props.radius
  }));
}

export function setTextComponentValue(node, text, fill = undefined) {
  let next = updateComponentProps(node, ["text"], (props) => ({
    ...props,
    text,
    ...(fill ? { fill } : {})
  }));
  if (TEXT_TYPES.has(getNodeTypeBucket(next))) {
    next = {
      ...next,
      props: {
        ...(next.props || {}),
        text,
        ...(fill ? { fill } : {})
      }
    };
  }
  return next;
}

export function setComponentTypesEnabled(node, types, enabled) {
  const targetTypes = new Set(types.map((type) => String(type).toLowerCase()));
  if (!Array.isArray(node.components) || !node.components.length) {
    return node;
  }
  let changed = false;
  const components = node.components.map((component) => {
    const type = getComponentType(component);
    if (!targetTypes.has(type)) {
      return component;
    }
    changed = true;
    return {
      ...component,
      enabled: Boolean(enabled)
    };
  });
  return changed ? { ...node, components } : node;
}

function updateComponentProps(node, types, updater) {
  const targetTypes = new Set(types.map((type) => String(type).toLowerCase()));
  if (!Array.isArray(node.components) || !node.components.length) {
    return node;
  }

  let changed = false;
  const components = node.components.map((component) => {
    if (!isObject(component)) {
      return component;
    }
    const type = getComponentType(component);
    if (!targetTypes.has(type)) {
      return component;
    }
    changed = true;
    return {
      ...component,
      props: updater({ ...(component.props || {}) }, type, component)
    };
  });

  return changed ? { ...node, components } : node;
}
