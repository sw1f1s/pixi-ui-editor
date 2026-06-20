import {
  assignIfPresent,
  isTextureFlagEnabled,
  normalizeColor
} from "./utils.js";

const TEXTURE_TYPE_ALIASES = {
  tiled: "tiled",
  tile: "tiled",
  sliced: "sliced",
  slice: "sliced",
  "nine-slice": "sliced",
  "9-slice": "sliced",
  simple: "simple",
  sprite: "simple"
};

export function createSpriteDisplayObject(payload, dependencies) {
  const { Container, Sprite, TilingSprite, NineSliceSprite, resolveTexture } = dependencies;
  if (!Sprite) {
    return new Container();
  }

  const texture = resolveTexture(payload.asset, payload);
  const textureType = normalizeTextureType(payload.node?.props || {});
  if (textureType === "tiled" && TilingSprite) {
    return createTiledSprite(TilingSprite, texture, payload.node);
  }

  const slice = textureType === "sliced" ? normalizeNineSliceOptions(payload.node?.props?.nineSlice) : null;
  if (slice && NineSliceSprite) {
    return createNineSliceSprite(NineSliceSprite, texture, slice, payload.node);
  }

  return new Sprite(texture);
}

export function applySpriteObjectFit(displayObject, node = {}) {
  if (!isSpriteDisplayObject(displayObject)) {
    return;
  }

  const textureProps = node.props || displayObject.__pixiUiEditorSpriteProps || {};
  const textureType = normalizeTextureType(textureProps);
  const target = getSpriteFrameRect(displayObject, node);
  if (textureType === "tiled" || textureType === "sliced" || textureProps.nineSlice) {
    displayObject.__pixiUiEditorDrawRect = target;
    assignSpriteRect(displayObject, target);
    return;
  }

  const fit = textureProps.objectFit || "contain";
  const source = getTextureSourceSize(displayObject);
  const rect = getObjectFitRect(source, target, fit);
  displayObject.__pixiUiEditorDrawRect = rect;
  assignSpriteRect(displayObject, rect);
}

export function applySpriteVisualProps(displayObject, node = {}) {
  if (!isSpriteDisplayObject(displayObject)) {
    return;
  }

  const props = node.props || displayObject.__pixiUiEditorSpriteProps || {};
  const tint = props.tint ?? props.color ?? props.textureTint;
  if (tint !== undefined && tint !== null && tint !== "") {
    displayObject.tint = normalizeColor(tint);
  }

  const flipX = isTextureFlagEnabled(props.flipX ?? props.flip?.x);
  const flipY = isTextureFlagEnabled(props.flipY ?? props.flip?.y);
  const rect = displayObject.__pixiUiEditorDrawRect || getSpriteFrameRect(displayObject, node);
  if (displayObject.scale) {
    const scaleX = Math.abs(Number(displayObject.scale.x ?? 1)) || 1;
    const scaleY = Math.abs(Number(displayObject.scale.y ?? 1)) || 1;
    displayObject.scale.x = flipX ? -scaleX : scaleX;
    displayObject.scale.y = flipY ? -scaleY : scaleY;
  }
  if (Number.isFinite(rect.x) && Number.isFinite(rect.width)) {
    displayObject.x = flipX ? rect.x + rect.width : rect.x;
  }
  if (Number.isFinite(rect.y) && Number.isFinite(rect.height)) {
    displayObject.y = flipY ? rect.y + rect.height : rect.y;
  }
}

export function normalizeTextureType(props = {}) {
  const value = String(props.textureType || props.imageType || props.renderMode || "").trim().toLowerCase();
  return TEXTURE_TYPE_ALIASES[value] || (props.nineSlice ? "sliced" : "simple");
}

export function normalizeNineSliceOptions(value) {
  if (!value) {
    return null;
  }

  if (typeof value === "number" || typeof value === "string") {
    const size = Number(value);
    if (!Number.isFinite(size) || size <= 0) {
      return null;
    }
    return {
      left: size,
      right: size,
      top: size,
      bottom: size
    };
  }

  if (typeof value === "object") {
    const left = Math.max(0, Number(value.left || 0));
    const right = Math.max(0, Number(value.right ?? value.left ?? 0));
    const top = Math.max(0, Number(value.top || 0));
    const bottom = Math.max(0, Number(value.bottom ?? value.top ?? 0));
    if (![left, right, top, bottom].some((part) => part > 0)) {
      return null;
    }
    return {
      left,
      right,
      top,
      bottom
    };
  }

  return null;
}

export function createSpriteNodeSnapshot(displayObject) {
  return {
    transform: {
      x: displayObject.__pixiUiEditorBaseX,
      y: displayObject.__pixiUiEditorBaseY,
      width: displayObject.__pixiUiEditorFrameWidth,
      height: displayObject.__pixiUiEditorFrameHeight
    },
    props: displayObject.__pixiUiEditorSpriteProps || {}
  };
}

function createTiledSprite(TilingSprite, texture, node = {}) {
  const width = node?.transform?.width;
  const height = node?.transform?.height;
  try {
    const tiled = new TilingSprite({ texture, width, height });
    tiled.__pixiUiEditorTiledSprite = true;
    return tiled;
  } catch (_error) {
    const tiled = new TilingSprite(texture, width, height);
    tiled.__pixiUiEditorTiledSprite = true;
    return tiled;
  }
}

function createNineSliceSprite(NineSliceSprite, texture, slice, node = {}) {
  try {
    return new NineSliceSprite({
      texture,
      leftWidth: slice.left,
      rightWidth: slice.right,
      topHeight: slice.top,
      bottomHeight: slice.bottom,
      width: node?.transform?.width,
      height: node?.transform?.height
    });
  } catch (_error) {
    return new NineSliceSprite(texture, slice.left, slice.top, slice.right, slice.bottom);
  }
}

function isSpriteDisplayObject(displayObject) {
  return displayObject && "texture" in displayObject && !("text" in displayObject);
}

function assignSpriteRect(displayObject, rect) {
  assignIfPresent(displayObject, "x", rect.x);
  assignIfPresent(displayObject, "y", rect.y);
  assignIfPresent(displayObject, "width", rect.width);
  assignIfPresent(displayObject, "height", rect.height);
}

function getTextureSourceSize(displayObject) {
  const asset = displayObject.__pixiUiEditorTextureAsset || {};
  const texture = displayObject.texture || {};
  const width = Number(
    asset.frame?.width ??
    asset.frame?.w ??
    asset.width ??
    texture.orig?.width ??
    texture.frame?.width ??
    texture.width ??
    texture.source?.width ??
    texture.baseTexture?.width
  );
  const height = Number(
    asset.frame?.height ??
    asset.frame?.h ??
    asset.height ??
    texture.orig?.height ??
    texture.frame?.height ??
    texture.height ??
    texture.source?.height ??
    texture.baseTexture?.height
  );

  return {
    width: Number.isFinite(width) && width > 0 ? width : 0,
    height: Number.isFinite(height) && height > 0 ? height : 0
  };
}

function getObjectFitRect(source, target, fit) {
  if (fit === "fill" || source.width <= 0 || source.height <= 0 || target.width <= 0 || target.height <= 0) {
    return target;
  }

  const sourceRatio = source.width / source.height;
  const targetRatio = target.width / target.height;
  let width = target.width;
  let height = target.height;

  if (fit === "none") {
    width = source.width;
    height = source.height;
  } else if ((fit === "contain" && sourceRatio > targetRatio) || (fit === "cover" && sourceRatio < targetRatio)) {
    height = width / sourceRatio;
  } else {
    width = height * sourceRatio;
  }

  return {
    x: target.x + (target.width - width) / 2,
    y: target.y + (target.height - height) / 2,
    width,
    height
  };
}

function getSpriteFrameRect(displayObject, node = {}) {
  const transform = node.transform || {};
  return {
    x: Number(displayObject.__pixiUiEditorBaseX ?? transform.x ?? displayObject.x ?? 0),
    y: Number(displayObject.__pixiUiEditorBaseY ?? transform.y ?? displayObject.y ?? 0),
    width: Number(displayObject.__pixiUiEditorFrameWidth ?? transform.width ?? displayObject.width ?? 0),
    height: Number(displayObject.__pixiUiEditorFrameHeight ?? transform.height ?? displayObject.height ?? 0)
  };
}
