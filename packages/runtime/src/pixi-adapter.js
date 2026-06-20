import { createEffectFilters } from "./pixi-adapter/effects.js";
import {
  markDrawable,
  redrawGraphics
} from "./pixi-adapter/graphics.js";
import {
  applySpriteObjectFit,
  applySpriteVisualProps,
  createSpriteDisplayObject,
  createSpriteNodeSnapshot
} from "./pixi-adapter/sprite.js";
import {
  applyTextVerticalAlign,
  createPixiText,
  resolveTextStyle
} from "./pixi-adapter/text.js";
import { createTextureResolver } from "./pixi-adapter/texture.js";
import {
  assignIfPresent,
  DRAWABLE_CONTAINER_TYPES,
  getNodeType
} from "./pixi-adapter/utils.js";

export function createPixiLikeAdapter(pixi, options = {}) {
  const Container = pixi?.Container || options.Container;
  const Sprite = pixi?.Sprite || options.Sprite;
  const TilingSprite = pixi?.TilingSprite || options.TilingSprite;
  const NineSliceSprite = pixi?.NineSliceSprite || options.NineSliceSprite;
  const Text = pixi?.Text || options.Text;
  const Graphics = pixi?.Graphics || options.Graphics;
  const Texture = pixi?.Texture || options.Texture;
  const Rectangle = pixi?.Rectangle || options.Rectangle;
  const Assets = pixi?.Assets || options.Assets;
  const DropShadowFilter = pixi?.DropShadowFilter || pixi?.filters?.DropShadowFilter || options.DropShadowFilter;
  const OutlineFilter = pixi?.OutlineFilter || pixi?.filters?.OutlineFilter || options.OutlineFilter;

  if (!Container) {
    throw new Error("createPixiLikeAdapter requires a Pixi-like Container class.");
  }

  const resolveTexture = options.resolveTexture || createTextureResolver({ Texture, Rectangle });
  const applyEffectFilters = createEffectFilters({ DropShadowFilter, OutlineFilter });
  const spriteDependencies = {
    Container,
    Sprite,
    TilingSprite,
    NineSliceSprite,
    resolveTexture
  };

  function syncVisualDisplay(displayObject, node = {}) {
    redrawGraphics(displayObject, node);
    applyTextVerticalAlign(displayObject, node);
    applySpriteObjectFit(displayObject, node);
    applySpriteVisualProps(displayObject, node);
  }

  return {
    name: "pixi-like-adapter",

    createContainer(payload = {}) {
      if (Graphics && DRAWABLE_CONTAINER_TYPES.has(getNodeType(payload.node))) {
        return markDrawable(new Graphics(), payload.node);
      }

      return new Container();
    },

    createSprite(payload) {
      return createSpriteDisplayObject(payload, spriteDependencies);
    },

    createText(payload) {
      if (!Text) {
        return new Container();
      }

      return createPixiText(Text, payload.text || "", resolveTextStyle(payload.node));
    },

    createGraphics(payload = {}) {
      return Graphics ? markDrawable(new Graphics(), payload.node) : new Container();
    },

    addChild(parent, child) {
      if (parent?.addChild) {
        return parent.addChild(child);
      }

      if (!Array.isArray(parent.children)) {
        parent.children = [];
      }

      parent.children.push(child);
      return child;
    },

    removeChild(parent, child) {
      if (parent?.removeChild) {
        return parent.removeChild(child);
      }

      const index = parent?.children?.indexOf(child) ?? -1;
      if (index >= 0) {
        parent.children.splice(index, 1);
      }

      return child;
    },

    setTransform(displayObject, transform = {}, node = {}) {
      assignIfPresent(displayObject, "x", transform.x ?? 0);
      assignIfPresent(displayObject, "y", transform.y ?? 0);
      displayObject.__pixiUiEditorBaseX = transform.x ?? 0;
      displayObject.__pixiUiEditorBaseY = transform.y ?? 0;
      displayObject.__pixiUiEditorFrameWidth = transform.width;
      displayObject.__pixiUiEditorFrameHeight = transform.height;

      if (!displayObject?.__pixiUiEditorDrawableNode) {
        assignIfPresent(displayObject, "width", transform.width);
        assignIfPresent(displayObject, "height", transform.height);
      } else {
        displayObject.__pixiUiEditorShapeWidth = transform.width;
        displayObject.__pixiUiEditorShapeHeight = transform.height;
      }

      assignIfPresent(displayObject, "alpha", transform.alpha ?? 1);
      assignIfPresent(displayObject, "rotation", transform.rotation ?? 0);

      if (displayObject.scale?.set) {
        displayObject.scale.set(transform.scale?.x ?? 1, transform.scale?.y ?? transform.scale?.x ?? 1);
      }

      if (displayObject.pivot?.set) {
        displayObject.pivot.set(transform.pivot?.x ?? 0, transform.pivot?.y ?? 0);
      }

      syncVisualDisplay(displayObject, node);
    },

    setStyle(displayObject, style = {}, node = {}) {
      if (displayObject.style && typeof displayObject.style === "object") {
        Object.assign(displayObject.style, "text" in displayObject ? resolveTextStyle(node) : style);
      }

      if (style.tint !== undefined) {
        displayObject.tint = style.tint;
      }

      redrawGraphics(displayObject, node);
      applyTextVerticalAlign(displayObject, node);
      applySpriteVisualProps(displayObject, node);
    },

    setProps(displayObject, props = {}, node = {}) {
      displayObject.__pixiUiEditorSpriteProps = props;
      for (const key of ["interactive", "eventMode", "cursor", "zIndex", "sortableChildren", "blendMode"]) {
        if (props[key] !== undefined) {
          displayObject[key] = props[key];
        }
      }

      if (displayObject.style && typeof displayObject.style === "object" && "text" in displayObject) {
        Object.assign(displayObject.style, resolveTextStyle(node));
      }

      applyAnchorProps(displayObject, props, node);
      applyEffectFilters(displayObject, props);
      syncVisualDisplay(displayObject, node);
    },

    setText(displayObject, text, node = {}) {
      if ("text" in displayObject) {
        displayObject.text = text === undefined || text === null ? "" : String(text);
        applyTextVerticalAlign(displayObject, node);
      }
    },

    setTexture(displayObject, asset) {
      if ("texture" in displayObject && asset) {
        displayObject.__pixiUiEditorTextureAsset = asset;
        displayObject.texture = resolveTexture(asset);
        const node = createSpriteNodeSnapshot(displayObject);
        applySpriteObjectFit(displayObject, node);
        applySpriteVisualProps(displayObject, node);
      }
    },

    async loadTexture(asset) {
      if (!asset?.src) {
        return Texture?.EMPTY;
      }
      if (Assets?.load) {
        return Assets.load(asset.src);
      }
      return resolveTexture(asset);
    },

    setVisible(displayObject, visible) {
      displayObject.visible = visible !== false;
    },

    destroy(displayObject) {
      if (displayObject?.destroy) {
        displayObject.destroy({ children: true });
      }
    }
  };
}

function applyAnchorProps(displayObject, props = {}, node = {}) {
  if (props.anchor && displayObject.anchor?.set) {
    displayObject.anchor.set(Number(props.anchor.x || 0), Number(props.anchor.y || 0));
  }

  if (props.pivotAnchor && displayObject.pivot?.set) {
    const transform = node.transform || {};
    const width = Number(transform.width || displayObject.width || 0);
    const height = Number(transform.height || displayObject.height || 0);
    const preset = String(props.pivotAnchor).toLowerCase();
    const pivotX = preset.includes("right") ? width : preset.includes("center") ? width / 2 : 0;
    const pivotY = preset.includes("bottom") ? height : preset.includes("middle") || preset.includes("center") ? height / 2 : 0;
    displayObject.pivot.set(pivotX, pivotY);
  }
}
