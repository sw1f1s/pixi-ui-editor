import {
  clamp,
  createAssetThumbnail,
  cssColorIsSupported,
  getAssetById,
  getNodeComponentProps,
  getTextureNineSliceDefault,
  getTextureRenderType,
  NODE_COMPONENT_TYPES,
  normalizeColorToHex,
  openAtlasEditor,
  selectAssetInBrowser
} from "./deps.js?v=20260620-designless";
import {
  createFieldGrid,
  createLabeledField,
  createSelect,
  createTextInput
} from "./controlFactory.js?v=20260620-designless";
import { appendInspectorControl } from "./context.js?v=20260620-designless";
import { updateSelectedSpriteFrame } from "./componentMutations.js?v=20260620-designless";
import { updateSelectedNode } from "./nodeMutations.js?v=20260620-designless";

export function addField(label, key, value, type = "text") {
  appendInspectorControl(createField(label, key, value, type));
}

export function addSelectField(label, key, value, options, type = "text") {
  const field = createLabeledField(label);
  const select = createSelect(options, value);
  select.addEventListener("change", () => {
    updateSelectedNode(key, select.value, type, { preserveInspector: true });
  });
  field.append(select);
  appendInspectorControl(field);
}

export function addCheckboxField(label, key, checked) {
  appendInspectorControl(createCheckboxFieldControl(label, key, checked));
}

export function addCheckboxFieldRow(fields) {
  const row = document.createElement("div");
  row.className = "field-grid checkbox-field-row";
  row.append(...fields.map((field) => createCheckboxFieldControl(...field)));
  appendInspectorControl(row);
}

export function createCheckboxFieldControl(label, key, checked) {
  const field = document.createElement("label");
  field.className = "checkbox-field";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);
  input.addEventListener("change", () => {
    updateSelectedNode(key, input.checked, "boolean", { preserveInspector: true });
  });
  const text = document.createElement("span");
  text.textContent = label;
  field.append(input, text);
  return field;
}

export function addAssetSelectField(label, assetId) {
  const field = createLabeledField(label, "field asset-drop-field");
  field.dataset.assetDropAccept = "texture";
  const dropZone = createInspectorAssetDropZone("Drop texture or atlas here", assetId);
  field.append(dropZone);
  appendInspectorControl(field);
}

export function addFontAssetField(node) {
  const textProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.text);
  const fontAssetId = textProps.fontAssetId || "";
  const field = createLabeledField("Font Asset", "field asset-drop-field");
  field.dataset.assetDropAccept = "font";
  const dropZone = createInspectorAssetDropZone("Drop font here", fontAssetId);
  field.append(dropZone);
  appendInspectorControl(field);
}

export function createInspectorAssetDropZone(label, assetId) {
  const asset = getAssetById(assetId);
  const zone = document.createElement("div");
  zone.className = "asset-drop-zone";
  if (asset) {
    zone.classList.add("is-clickable");
    zone.tabIndex = 0;
    zone.setAttribute("role", "button");
    zone.setAttribute("aria-label", `Select ${asset.name || asset.id} in Assets`);
    zone.addEventListener("click", () => selectAssetInBrowser(asset.id));
    zone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectAssetInBrowser(asset.id);
      }
    });
    zone.append(createAssetThumbnail(asset));
  }
  const text = document.createElement("span");
  text.textContent = asset ? asset.name || asset.id : label;
  zone.append(text);
  return zone;
}

export function addAtlasFrameField(node, asset) {
  const frames = Object.keys(asset.frames || {});
  const textureProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.texture);
  const currentFrame = textureProps.frame || frames[0] || "";
  const currentIndex = Math.max(0, frames.indexOf(currentFrame));
  const field = document.createElement("div");
  field.className = "field atlas-frame-picker";

  const label = document.createElement("label");
  label.textContent = "Frame";

  const row = document.createElement("div");
  row.className = "field-grid field-grid-3";

  const select = document.createElement("select");
  for (const [index, frame] of frames.entries()) {
    const option = document.createElement("option");
    option.value = frame;
    option.textContent = `${index}: ${frame}`;
    select.append(option);
  }
  select.value = currentFrame;
  select.addEventListener("change", () => {
    updateSelectedSpriteFrame(select.value);
  });

  const indexInput = document.createElement("input");
  indexInput.type = "number";
  indexInput.min = "0";
  indexInput.max = String(Math.max(0, frames.length - 1));
  indexInput.value = String(currentIndex);
  indexInput.addEventListener("input", () => {
    const index = clamp(Math.round(Number(indexInput.value || 0)), 0, Math.max(0, frames.length - 1));
    if (frames[index]) {
      updateSelectedSpriteFrame(frames[index], { preserveInspector: true });
    }
  });

  const editorButton = document.createElement("button");
  editorButton.type = "button";
  editorButton.textContent = "Edit";
  editorButton.addEventListener("click", () => openAtlasEditor(asset.id, currentFrame));

  row.append(select, indexInput, editorButton);
  field.append(label, row);
  appendInspectorControl(field);
}

export function addFieldRow(fields) {
  const row = createFieldGrid(fields, createField, { countClass: false });
  appendInspectorControl(row);
}

export function createField(label, key, value, type = "text") {
  const field = createLabeledField(label);
  const input = createTextInput(type, value);
  if (type === "checkbox") {
    field.classList.add("field-checkbox");
    input.checked = Boolean(value);
  }
  applyNumericInputHints(input, key);
  const applyValue = () => {
    updateSelectedNode(key, type === "checkbox" ? input.checked : input.value, type === "checkbox" ? "boolean" : type, { preserveInspector: true });
  };
  input.addEventListener("input", applyValue);
  input.addEventListener("change", applyValue);
  if (type === "checkbox") {
    const title = field.querySelector("label");
    field.replaceChildren(input, title);
  } else {
    field.append(input);
  }
  return field;
}

export function addColorField(label, key, value) {
  const field = createLabeledField(label);
  const control = document.createElement("div");
  control.className = "color-control";

  const swatch = document.createElement("button");
  swatch.type = "button";
  swatch.className = "color-swatch";
  swatch.setAttribute("aria-label", `Choose ${label.toLowerCase()} color`);

  const picker = document.createElement("input");
  picker.type = "color";
  picker.className = "color-picker-native";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "color-value";

  const setLocalValue = (nextValue, options = {}) => {
    const textValue = String(nextValue || "");
    const pickerValue = normalizeColorToHex(textValue);
    if (options.syncText !== false) {
      input.value = textValue;
    }
    picker.value = pickerValue;
    swatch.style.background = cssColorIsSupported(textValue) ? textValue : pickerValue;
  };

  setLocalValue(value);

  swatch.addEventListener("click", () => picker.click());
  const applyPickerColor = () => {
    setLocalValue(picker.value);
    updateSelectedNode(key, picker.value, "color", { preserveInspector: true });
  };
  const applyTextColor = () => {
    const nextValue = input.value.trim();
    setLocalValue(nextValue, { syncText: false });
    updateSelectedNode(key, nextValue, "color", { preserveInspector: true });
  };

  picker.addEventListener("input", applyPickerColor);
  picker.addEventListener("change", applyPickerColor);
  input.addEventListener("input", applyTextColor);
  input.addEventListener("change", applyTextColor);

  control.append(swatch, picker, input);
  field.append(control);
  appendInspectorControl(field);
}

export function getTextureInspectorState(node) {
  const textureProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.texture);
  const asset = getAssetById(textureProps.assetId);
  return {
    asset,
    textureProps,
    renderType: getTextureRenderType(textureProps, asset),
    hasNineSliceDefaults: Boolean(getTextureNineSliceDefault(asset, textureProps))
  };
}

function applyNumericInputHints(input, key) {
  const keyText = String(key);
  if (key === "lineHeight" || keyText.endsWith(":lineHeight")) {
    input.step = "0.1";
    input.min = "0.5";
  }
  if (keyText.endsWith(":pixelsPerUnitMultiplier")) {
    input.step = "0.1";
    input.min = "0.01";
  }
  if (keyText.endsWith(":alpha")) {
    input.step = "0.05";
    input.min = "0";
    input.max = "1";
  }
  if (keyText.includes(":nineSlice.") || keyText.endsWith(":strokeWidth") || keyText.endsWith(":radius")) {
    input.min = "0";
  }
}
