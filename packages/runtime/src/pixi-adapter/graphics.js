import { normalizeOutlineEffect } from "./effects.js";
import {
  normalizeRadius,
  resolveShape
} from "../adapter-shared.js";
import {
  DRAWABLE_GRAPHICS_TYPES,
  getNodeType,
  normalizeColor
} from "./utils.js";

export function isDrawableNode(node = {}) {
  return DRAWABLE_GRAPHICS_TYPES.has(getNodeType(node));
}

export function markDrawable(displayObject, node) {
  if (displayObject && isDrawableNode(node)) {
    displayObject.__pixiUiEditorDrawableNode = true;
  }
  return displayObject;
}

export function redrawGraphics(displayObject, node = {}) {
  if (!displayObject?.__pixiUiEditorDrawableNode && !isDrawableNode(node)) {
    return;
  }

  if (typeof displayObject.clear !== "function") {
    return;
  }

  const props = resolveDrawableProps(node);
  const { width, height } = getDrawableSize(displayObject, node.transform || {});
  if (width <= 0 || height <= 0) {
    displayObject.clear();
    return;
  }

  const fill = normalizeFill(props.fill);
  const stroke = normalizeStroke(props.stroke, props.strokeWidth);
  const shape = resolveShape(node, props);
  const radius = normalizeRadius(props.radius, width, height);

  displayObject.__pixiUiEditorDrawableNode = true;
  displayObject.__pixiUiEditorShapeWidth = width;
  displayObject.__pixiUiEditorShapeHeight = height;
  displayObject.__pixiUiEditorShapeProps = { shape, fill, stroke, radius };
  displayObject.clear();
  fillAndStroke(displayObject, fill, stroke, () => drawShapePath(displayObject, shape, width, height, radius));
}

function resolveDrawableProps(node = {}) {
  const style = node.style || {};
  const props = node.props || {};
  const outline = normalizeOutlineEffect(props.outline);
  return {
    shape: props.shape ?? style.shape,
    fill: props.fill ?? style.fill,
    stroke: props.stroke ?? (outline ? { color: outline.color, alpha: outline.alpha, width: outline.width } : style.stroke),
    strokeWidth: props.strokeWidth ?? (outline ? outline.width : style.strokeWidth),
    radius: props.radius ?? style.radius
  };
}

function normalizeFill(fill) {
  if (fill === undefined || fill === null || fill === false) {
    return null;
  }

  if (typeof fill === "object") {
    const color = fill.color ?? fill.fill ?? fill.value;
    if (color === undefined || color === null || color === false) {
      return null;
    }
    return {
      color: normalizeColor(color),
      alpha: fill.alpha ?? fill.opacity ?? 1
    };
  }

  return {
    color: normalizeColor(fill),
    alpha: 1
  };
}

function normalizeStroke(stroke, widthOverride) {
  if (stroke === undefined || stroke === null || stroke === false) {
    return null;
  }

  if (typeof stroke === "object") {
    const color = stroke.color ?? stroke.stroke ?? stroke.fill ?? stroke.value;
    if (color === undefined || color === null || color === false) {
      return null;
    }
    return {
      color: normalizeColor(color),
      alpha: stroke.alpha ?? stroke.opacity ?? 1,
      width: Number(widthOverride ?? stroke.width ?? stroke.thickness ?? 1) || 1
    };
  }

  return {
    color: normalizeColor(stroke),
    alpha: 1,
    width: Number(widthOverride ?? 1) || 1
  };
}

function getDrawableSize(displayObject, transform = {}) {
  const width = Number(displayObject.__pixiUiEditorShapeWidth ?? transform.width ?? displayObject.width ?? 0);
  const height = Number(displayObject.__pixiUiEditorShapeHeight ?? transform.height ?? displayObject.height ?? 0);
  return {
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0
  };
}

function drawShapePath(graphics, shape, width, height, radius) {
  const drawer = getShapeDrawer(shape, radius);
  drawer(graphics, width, height, radius);
}

function getShapeDrawer(shape, radius) {
  const shapeDrawers = {
    circle: drawCirclePath,
    ellipse: drawEllipsePath,
    rect: drawRectPath,
    rectangle: drawRectPath
  };
  if ((shape === "roundedrect" || shape === "rounded-rect") && radius > 0) {
    return drawRoundedRectPath;
  }
  return shapeDrawers[shape] || drawRectPath;
}

function drawCirclePath(graphics, width, height) {
  const diameter = Math.min(width, height);
  callFirst(graphics, ["circle", "drawCircle"], [width / 2, height / 2, diameter / 2]);
}

function drawEllipsePath(graphics, width, height) {
  callFirst(graphics, ["ellipse", "drawEllipse"], [width / 2, height / 2, width / 2, height / 2]);
}

function drawRoundedRectPath(graphics, width, height, radius) {
  callFirst(graphics, ["roundRect", "drawRoundedRect"], [0, 0, width, height, radius]);
}

function drawRectPath(graphics, width, height) {
  callFirst(graphics, ["rect", "drawRect"], [0, 0, width, height]);
}

function callFirst(target, methods, args) {
  const method = methods.find((name) => typeof target?.[name] === "function");
  if (method) {
    target[method](...args);
  }
}

function fillAndStroke(graphics, fill, stroke, drawPath) {
  if (!graphics) {
    return;
  }

  if (graphics.rect || graphics.roundRect || graphics.circle || graphics.ellipse) {
    drawPath();
    if (fill && graphics.fill) {
      graphics.fill({ color: fill.color, alpha: fill.alpha });
    }
    if (stroke && graphics.stroke) {
      graphics.stroke({ color: stroke.color, alpha: stroke.alpha, width: stroke.width });
    }
    return;
  }

  if (stroke && graphics.lineStyle) {
    graphics.lineStyle(stroke.width, stroke.color, stroke.alpha);
  }
  if (fill && graphics.beginFill) {
    graphics.beginFill(fill.color, fill.alpha);
  }
  drawPath();
  if (fill && graphics.endFill) {
    graphics.endFill();
  }
}
