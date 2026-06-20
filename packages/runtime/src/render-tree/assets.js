import {
  cloneJson,
  coalesce,
  getNodeAssetId,
  getNodeComponentProps,
  getNodeTypeBucket,
  isObject
} from "../helpers.js";
import { SPRITE_TYPES } from "./types.js";

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

export function resolveAsset(node, context) {
  const assetId = getNodeAssetId(node);
  if (!assetId) {
    return undefined;
  }

  const asset = context.assetsById?.get(String(assetId)) || { id: String(assetId) };
  if (asset.type !== "spriteAtlas") {
    return asset;
  }

  const textureProps = getNodeComponentProps(node, "texture");
  const frameName = coalesce(
    node?.frame,
    textureProps.frame,
    textureProps.atlasFrame,
    node?.props?.frame,
    node?.props?.atlasFrame,
    Object.keys(asset.frames || {})[0]
  );
  const imageAsset = asset.imageAssetId ? context.assetsById?.get(String(asset.imageAssetId)) : null;
  const frame = frameName ? asset.frames?.[frameName] : undefined;
  return {
    ...asset,
    src: asset.src || imageAsset?.src,
    textureAsset: imageAsset,
    frameName,
    frame
  };
}

export function applySpriteFrameDefaults(node, asset) {
  const defaultNineSlice = asset?.frame?.nineSlice ?? asset?.nineSlice;
  if (!SPRITE_TYPES.has(getNodeTypeBucket(node))) {
    return node;
  }

  const props = node.props || {};
  const textureType = normalizeTextureType(props);
  if (textureType === "tiled" || textureType === "simple") {
    return node;
  }
  if (hasNineSliceValue(props.nineSlice)) {
    return {
      ...node,
      props: {
        ...props,
        nineSlice: scaleNineSliceValue(props.nineSlice, getNineSliceMultiplier(props))
      }
    };
  }

  if (!hasNineSliceValue(defaultNineSlice)) {
    return node;
  }

  return {
    ...node,
    props: {
      ...props,
      nineSlice: scaleNineSliceValue(defaultNineSlice, getNineSliceMultiplier(props))
    }
  };
}

function normalizeTextureType(props = {}) {
  const value = String(props.textureType || props.imageType || props.renderMode || "").trim().toLowerCase();
  return TEXTURE_TYPE_ALIASES[value] || null;
}

function getNineSliceMultiplier(props = {}) {
  const value = Number(props.pixelsPerUnitMultiplier ?? props.nineSliceMultiplier ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function scaleNineSliceValue(value, multiplier) {
  if (typeof value === "number" || typeof value === "string") {
    const size = Number(value);
    return Number.isFinite(size) ? size * multiplier : cloneJson(value);
  }

  if (!isObject(value)) {
    return cloneJson(value);
  }

  return Object.fromEntries(Object.entries(cloneJson(value)).map(([key, part]) => {
    const numeric = Number(part);
    return [key, Number.isFinite(numeric) ? numeric * multiplier : part];
  }));
}

function hasNineSliceValue(value) {
  if (value === undefined || value === null || value === "") {
    return false;
  }

  if (typeof value === "number" || typeof value === "string") {
    const size = Number(value);
    return Number.isFinite(size) && size > 0;
  }

  if (!isObject(value)) {
    return false;
  }

  return ["left", "right", "top", "bottom"].some((key) => {
    const number = Number(value[key] || 0);
    return Number.isFinite(number) && number > 0;
  });
}
