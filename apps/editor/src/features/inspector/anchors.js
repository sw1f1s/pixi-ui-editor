import {
  ANCHOR_OFFSET_LABELS,
  ANCHOR_PICKER_MATRIX,
  ANCHOR_PRESETS,
  HORIZONTAL_ANCHOR_KEYS,
  VERTICAL_ANCHOR_KEYS,
  els,
  getNodeAnchorPresetId,
  getNodeAnchors
} from "./deps.js?v=20260620-designless";
import {
  createFieldGrid,
  createLabeledField,
  createTextInput
} from "./controlFactory.js?v=20260620-designless";
import { positionFloatingElement } from "./floatingPosition.js?v=20260620-designless";
import {
  applyAnchorPreset,
  updateNodeAnchorSafeArea,
  updateSelectedNodeAnchorOffset
} from "./anchorMutations.js?v=20260620-designless";

export function addAnchorControls(node) {
  const section = document.createElement("section");
  section.className = "inspector-section";

  const title = document.createElement("div");
  title.className = "inspector-section-title";
  title.textContent = "Anchors";
  section.append(title);

  const currentPreset = getNodeAnchorPresetId(node);
  section.append(createAnchorPresetPicker(node, currentPreset));
  section.append(createSafeAreaField(node));

  const anchors = getNodeAnchors(node);
  if (anchors) {
    section.append(...createAnchorOffsetRows(anchors));
  }

  els.inspectorForm.append(section);
}

export function createAnchorPresetPicker(node, currentPreset) {
  const picker = document.createElement("div");
  picker.className = "anchor-picker";
  picker.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  const header = document.createElement("div");
  header.className = "anchor-picker-header";
  const label = document.createElement("span");
  label.textContent = "Preset";
  const popoverId = `anchorPresetMenu-${node.id}`;
  const current = document.createElement("button");
  current.type = "button";
  current.className = "anchor-current-button";
  current.setAttribute("aria-haspopup", "menu");
  current.setAttribute("aria-expanded", "false");
  current.setAttribute("aria-controls", popoverId);
  current.textContent = currentPreset === "custom"
    ? "Custom"
    : ANCHOR_PRESETS[currentPreset]?.label || "Free";
  header.append(label, current);

  const popover = document.createElement("div");
  popover.id = popoverId;
  popover.className = "anchor-preset-popover";
  popover.setAttribute("role", "menu");
  popover.hidden = true;

  current.addEventListener("click", (event) => {
    event.stopPropagation();
    const shouldOpen = popover.hidden;
    closeAnchorPresetMenus();
    if (shouldOpen) {
      popover.hidden = false;
      positionAnchorPresetPopover(current, popover);
    } else {
      popover.hidden = true;
    }
    current.setAttribute("aria-expanded", String(shouldOpen));
  });

  const grid = document.createElement("div");
  grid.className = "anchor-preset-grid";
  for (const row of ANCHOR_PICKER_MATRIX) {
    for (const presetId of row) {
      grid.append(createAnchorPresetButton(node, presetId, currentPreset));
    }
  }

  const freeButton = document.createElement("button");
  freeButton.type = "button";
  freeButton.setAttribute("role", "menuitem");
  freeButton.className = `anchor-free-button${currentPreset === "none" ? " is-selected" : ""}`;
  freeButton.textContent = "Free";
  freeButton.addEventListener("click", () => {
    applyAnchorPreset(node, "none");
  });

  popover.append(grid, freeButton);
  picker.append(header, popover);
  return picker;
}

export function closeAnchorPresetMenus() {
  for (const popover of document.querySelectorAll(".anchor-preset-popover:not([hidden])")) {
    popover.hidden = true;
    popover.style.left = "";
    popover.style.top = "";
  }

  for (const button of document.querySelectorAll(".anchor-current-button[aria-expanded=\"true\"]")) {
    button.setAttribute("aria-expanded", "false");
  }
}

export function positionAnchorPresetPopover(trigger, popover) {
  positionFloatingElement(trigger, popover, { align: "right" });
}

export function createAnchorPresetButton(node, presetId, currentPreset) {
  const preset = ANCHOR_PRESETS[presetId];
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("role", "menuitem");
  button.className = `anchor-preset-button${currentPreset === presetId ? " is-selected" : ""}`;
  button.title = preset.label;
  button.setAttribute("aria-label", preset.label);
  button.addEventListener("click", () => {
    applyAnchorPreset(node, presetId);
  });

  const icon = document.createElement("span");
  icon.className = "anchor-icon";
  const frame = document.createElement("span");
  frame.className = "anchor-icon-frame";
  const child = document.createElement("span");
  child.className = "anchor-icon-child";
  const metrics = getAnchorIconMetrics(preset.keys);
  child.style.setProperty("--anchor-icon-x", `${metrics.x}px`);
  child.style.setProperty("--anchor-icon-y", `${metrics.y}px`);
  child.style.setProperty("--anchor-icon-w", `${metrics.width}px`);
  child.style.setProperty("--anchor-icon-h", `${metrics.height}px`);
  icon.append(frame, child);
  button.append(icon);
  return button;
}

export function getAnchorIconMetrics(keys) {
  const has = (key) => keys.includes(key);
  const horizontalStretch = has("left") && has("right");
  const verticalStretch = has("top") && has("bottom");
  const x = horizontalStretch ? 8 : has("right") ? 23 : has("centerX") ? 15 : 7;
  const y = verticalStretch ? 7 : has("bottom") ? 21 : has("centerY") ? 14 : 6;
  return {
    x,
    y,
    width: horizontalStretch ? 24 : 10,
    height: verticalStretch ? 22 : 10
  };
}

export function createAnchorOffsetRow(fields) {
  return createFieldGrid(fields, createAnchorOffsetField);
}

export function createAnchorOffsetField(label, key, value, type = "number") {
  const field = createLabeledField(label);
  const input = createTextInput(type, value);
  const applyValue = () => {
    updateSelectedNodeAnchorOffset(key, input.value, { preserveInspector: true });
  };
  input.addEventListener("input", applyValue);
  input.addEventListener("change", applyValue);
  field.append(input);
  return field;
}

function createSafeAreaField(node) {
  const safeAreaField = document.createElement("label");
  safeAreaField.className = "checkbox-field";
  const safeAreaInput = document.createElement("input");
  safeAreaInput.type = "checkbox";
  safeAreaInput.checked = node.layout?.safeArea === true;
  safeAreaInput.addEventListener("change", () => {
    updateNodeAnchorSafeArea(node, safeAreaInput.checked);
  });
  const safeAreaText = document.createElement("span");
  safeAreaText.textContent = "Use safe area";
  safeAreaField.append(safeAreaInput, safeAreaText);
  return safeAreaField;
}

function createAnchorOffsetRows(anchors) {
  return [
    createAnchorOffsetRowForKeys(anchors, HORIZONTAL_ANCHOR_KEYS),
    createAnchorOffsetRowForKeys(anchors, VERTICAL_ANCHOR_KEYS)
  ].filter(Boolean);
}

function createAnchorOffsetRowForKeys(anchors, keys) {
  const fields = keys
    .filter((key) => anchors[key] !== undefined)
    .map((key) => [ANCHOR_OFFSET_LABELS[key], key, anchors[key], "number"]);
  return fields.length ? createAnchorOffsetRow(fields) : null;
}
