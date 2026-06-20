import { cloneJson } from "./helpers.js";
import {
  DRAWABLE_TYPES,
  getNodeType,
  normalizeRadius,
  resolveShape
} from "./adapter-shared.js";

function createDisplayObject(kind, payload = {}) {
  return {
    __pixiUiEditorPlainObject: true,
    kind,
    nodeId: payload.node?.id,
    nodeName: payload.node?.name,
    nodeType: payload.node?.type,
    path: payload.path,
    children: [],
    transform: {},
    style: {},
    props: {},
    shapeGeometry: null,
    text: payload.text || "",
    texture: payload.asset || null,
    visible: true,
    destroyed: false
  };
}

function resolveDrawableProps(node = {}) {
  const style = node.style || {};
  const props = node.props || {};
  return {
    shape: props.shape ?? style.shape,
    fill: props.fill ?? style.fill,
    stroke: props.stroke ?? style.stroke,
    strokeWidth: props.strokeWidth ?? style.strokeWidth,
    radius: props.radius ?? style.radius,
    shadow: props.shadow ?? style.shadow,
    outline: props.outline ?? style.outline
  };
}

function updateShapeGeometry(displayObject, node = {}) {
  if (!displayObject || !DRAWABLE_TYPES.has(getNodeType(node))) {
    return;
  }

  const props = resolveDrawableProps(node);
  const width = Number(displayObject.transform?.width ?? displayObject.width ?? node.transform?.width ?? 0);
  const height = Number(displayObject.transform?.height ?? displayObject.height ?? node.transform?.height ?? 0);
  const shape = resolveShape(node, props);
  const radius = normalizeRadius(props.radius, width, height);

  displayObject.shapeGeometry = {
    shape,
    fill: cloneJson(props.fill ?? null),
    stroke: cloneJson(props.stroke ?? null),
    strokeWidth: props.strokeWidth,
    radius,
    shadow: cloneJson(props.shadow ?? null),
    outline: cloneJson(props.outline ?? null),
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0
  };
}

export function createPlainPixiAdapter() {
  return {
    name: "plain-pixi-like-adapter",

    createContainer(payload) {
      if (getNodeType(payload?.node) === "button") {
        return createDisplayObject("Graphics", payload);
      }

      return createDisplayObject("Container", payload);
    },

    createSprite(payload) {
      return createDisplayObject("Sprite", payload);
    },

    createText(payload) {
      return createDisplayObject("Text", payload);
    },

    createGraphics(payload) {
      return createDisplayObject("Graphics", payload);
    },

    addChild(parent, child) {
      if (!parent || !child) {
        return child;
      }

      if (!Array.isArray(parent.children)) {
        parent.children = [];
      }

      parent.children.push(child);
      child.parent = parent;
      return child;
    },

    removeChild(parent, child) {
      if (!parent || !child || !Array.isArray(parent.children)) {
        return child;
      }

      const index = parent.children.indexOf(child);
      if (index >= 0) {
        parent.children.splice(index, 1);
      }

      if (child.parent === parent) {
        child.parent = null;
      }

      return child;
    },

    setTransform(displayObject, transform, node = {}) {
      displayObject.transform = cloneJson(transform || {});
      displayObject.x = transform?.x || 0;
      displayObject.y = transform?.y || 0;
      displayObject.width = transform?.width;
      displayObject.height = transform?.height;
      displayObject.alpha = transform?.alpha ?? 1;
      displayObject.rotation = transform?.rotation || 0;
      displayObject.scale = cloneJson(transform?.scale || { x: 1, y: 1 });
      displayObject.pivot = cloneJson(transform?.pivot || { x: 0, y: 0 });
      updateShapeGeometry(displayObject, node);
    },

    setStyle(displayObject, style, node = {}) {
      displayObject.style = cloneJson(style || {});
      updateShapeGeometry(displayObject, node);
    },

    setProps(displayObject, props, node = {}) {
      displayObject.props = cloneJson(props || {});
      updateShapeGeometry(displayObject, node);
    },

    setText(displayObject, text) {
      displayObject.text = text === undefined || text === null ? "" : String(text);
    },

    setTexture(displayObject, asset) {
      displayObject.texture = asset ? cloneJson(asset) : null;
    },

    setVisible(displayObject, visible) {
      displayObject.visible = visible !== false;
    },

    destroy(displayObject) {
      if (!displayObject || displayObject.destroyed) {
        return;
      }

      displayObject.destroyed = true;
      for (const child of [...(displayObject.children || [])]) {
        this.destroy(child);
      }
      displayObject.children = [];
    }
  };
}
