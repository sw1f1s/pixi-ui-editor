import {
  getAssetById,
  getNodeComponentProps,
  NODE_COMPONENT_TYPES
} from "./deps.js";

export function getComponentValidationMessages(node, componentType) {
  const props = getNodeComponentProps(node, componentType);
  const messages = [];
  if (!props || typeof props !== "object") {
    return messages;
  }

  if (componentType === NODE_COMPONENT_TYPES.text) {
    validateTextComponent(props, messages);
  } else if (componentType === NODE_COMPONENT_TYPES.texture) {
    validateTextureComponent(props, messages);
  } else if (componentType === NODE_COMPONENT_TYPES.fill) {
    validateNonNegativeNumber(props, "strokeWidth", "Stroke width", messages);
    validateNonNegativeNumber(props, "radius", "Radius", messages);
  } else if (componentType === NODE_COMPONENT_TYPES.shadow) {
    validateUnitNumber(props, "alpha", "Alpha", messages);
    validateNonNegativeNumber(props, "blur", "Blur", messages);
  } else if (componentType === NODE_COMPONENT_TYPES.outline) {
    validateUnitNumber(props, "alpha", "Alpha", messages);
    validateNonNegativeNumber(props, "width", "Width", messages);
  } else if (componentType === NODE_COMPONENT_TYPES.slider || componentType === NODE_COMPONENT_TYPES.progressBar) {
    validateRangeComponent(props, messages);
  } else if (componentType === NODE_COMPONENT_TYPES.repeater) {
    validateRepeaterComponent(props, messages);
  } else if (componentType === NODE_COMPONENT_TYPES.mask) {
    validateNonNegativeNumber(props, "radius", "Radius", messages);
  } else if (componentType === NODE_COMPONENT_TYPES.scroll || componentType === NODE_COMPONENT_TYPES.scrollView) {
    validateScrollComponent(props, messages);
  } else if (componentType === NODE_COMPONENT_TYPES.layout) {
    validateLayoutComponent(props, messages);
  }

  return messages;
}

function validateTextComponent(props, messages) {
  if (typeof props.text !== "string" || props.text.length === 0) {
    messages.push(warning("text.empty", "Text is empty and has no visible string."));
  }
  validatePositiveNumber(props, "fontSize", "Font size", messages);
  validatePositiveNumber(props, "lineHeight", "Line height", messages);
  if (props.fontAssetId && !getAssetById(props.fontAssetId)) {
    messages.push(warning("text.fontAsset.unknown", `Font asset "${props.fontAssetId}" is missing.`));
  }
}

function validateTextureComponent(props, messages) {
  if (!props.assetId) {
    messages.push(warning("texture.asset.missing", "Texture has no asset assigned."));
  } else if (!getAssetById(props.assetId)) {
    messages.push(warning("texture.asset.unknown", `Texture asset "${props.assetId}" is missing.`));
  }
  validatePositiveNumber({
    pixelsPerUnitMultiplier: props.pixelsPerUnitMultiplier ?? 1
  }, "pixelsPerUnitMultiplier", "Pixels per unit multiplier", messages);
  const nineSlice = props.nineSlice;
  if (nineSlice && typeof nineSlice === "object") {
    for (const key of ["left", "right", "top", "bottom"]) {
      validateNonNegativeNumber(nineSlice, key, `9-slice ${key}`, messages);
    }
  }
}

function validateLayoutComponent(props, messages) {
  for (const key of ["gap", "rowGap", "columnGap", "padding", "cellWidth", "cellHeight", "grow"]) {
    validateNonNegativeNumber(props, key, key, messages);
  }
  validatePositiveNumber(props, "aspectRatio", "Aspect ratio", messages, { optional: true });
  validatePositiveNumber(props, "columns", "Columns", messages, { integer: true, optional: true });
}

function validateRangeComponent(props, messages) {
  validateFiniteNumber(props, "min", "Minimum", messages);
  validateFiniteNumber(props, "max", "Maximum", messages);
  validateFiniteNumber(props, "value", "Value", messages);
  validateNonNegativeNumber(props, "step", "Step", messages);
  const min = Number(props.min ?? 0);
  const max = Number(props.max ?? 1);
  if (Number.isFinite(min) && Number.isFinite(max) && max <= min) {
    messages.push(warning("range.invalid", "Maximum should be greater than minimum."));
  }
}

function validateRepeaterComponent(props, messages) {
  if (typeof props.dataPath !== "string" || props.dataPath.trim().length === 0) {
    messages.push(warning("repeater.dataPath.empty", "Repeater needs a data path."));
  }
  validateNonNegativeNumber(props, "itemGap", "Item gap", messages);
  validateNonNegativeNumber(props, "limit", "Limit", messages);
}

function validateScrollComponent(props, messages) {
  if (props.scrollX === false && props.scrollY === false) {
    messages.push(warning("scroll.disabled", "Scroll X and Scroll Y are both disabled."));
  }
}

function validateFiniteNumber(props, key, label, messages) {
  if (props[key] === undefined || props[key] === null || props[key] === "") {
    return;
  }
  const value = Number(props[key]);
  if (!Number.isFinite(value)) {
    messages.push(warning(`${key}.invalid`, `${label} must be a number.`));
  }
}

function validatePositiveNumber(props, key, label, messages, options = {}) {
  if (props[key] === undefined || props[key] === null || props[key] === "") {
    if (!options.optional) {
      messages.push(warning(`${key}.missing`, `${label} should be set.`));
    }
    return;
  }
  const value = Number(props[key]);
  if (!Number.isFinite(value) || value <= 0 || (options.integer && !Number.isInteger(value))) {
    messages.push(warning(`${key}.invalid`, `${label} must be ${options.integer ? "a positive integer" : "positive"}.`));
  }
}

function validateNonNegativeNumber(props, key, label, messages) {
  if (props[key] === undefined || props[key] === null || props[key] === "") {
    return;
  }
  const value = Number(props[key]);
  if (!Number.isFinite(value) || value < 0) {
    messages.push(warning(`${key}.invalid`, `${label} must be non-negative.`));
  }
}

function validateUnitNumber(props, key, label, messages) {
  if (props[key] === undefined || props[key] === null || props[key] === "") {
    return;
  }
  const value = Number(props[key]);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    messages.push(warning(`${key}.invalid`, `${label} should be between 0 and 1.`));
  }
}

function warning(code, message) {
  return { severity: "warning", code, message };
}
