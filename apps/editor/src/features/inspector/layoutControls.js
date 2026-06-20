import {
  els,
  getNodeComponentProps,
  NODE_COMPONENT_TYPES
} from "./deps.js?v=20260620-designless";
import { appendInspectorControl } from "./context.js?v=20260620-designless";
import { updateSelectedNodeLayoutProp } from "./layoutMutations.js?v=20260620-designless";
import { isRootNode } from "./nodeState.js?v=20260620-designless";
import {
  createFieldGrid,
  createLabeledField,
  createSelect,
  createTextInput
} from "./controlFactory.js?v=20260620-designless";

const VALID_LAYOUT_MODES = new Set(["absolute", "flex", "list", "grid"]);

const LAYOUT_MODE_OPTIONS = Object.freeze([
  ["absolute", "Absolute"],
  ["flex", "Flex"],
  ["list", "List"],
  ["grid", "Grid"]
]);

const DIRECTION_OPTIONS = Object.freeze([
  ["row", "Row"],
  ["column", "Column"]
]);

const WRAP_OPTIONS = Object.freeze([
  ["false", "No wrap"],
  ["true", "Wrap"]
]);

const ALIGN_OPTIONS = Object.freeze([
  ["start", "Start"],
  ["center", "Center"],
  ["end", "End"],
  ["stretch", "Stretch"]
]);

const JUSTIFY_OPTIONS = Object.freeze([
  ["start", "Start"],
  ["center", "Center"],
  ["end", "End"],
  ["space-between", "Space Between"]
]);

const LAYOUT_MODE_RENDERERS = Object.freeze({
  absolute: () => [],
  flex: renderFlexLayoutControls,
  list: renderListLayoutControls,
  grid: renderGridLayoutControls
});

export function isLayoutContainerNode(node) {
  if (!node) {
    return false;
  }

  const mode = getNodeLayoutMode(node);
  return mode !== "absolute" || Boolean(node.children?.length);
}

export function getNodeLayoutMode(node) {
  const layout = getEffectiveNodeLayout(node);
  const explicitMode = String(layout?.mode || "").toLowerCase();
  if (VALID_LAYOUT_MODES.has(explicitMode)) {
    return explicitMode;
  }

  const type = String(node?.type || "").toLowerCase();
  return VALID_LAYOUT_MODES.has(type) && type !== "absolute" ? type : "absolute";
}

export function getEffectiveNodeLayout(node) {
  return {
    ...(node?.layout || {}),
    ...getNodeComponentProps(node, NODE_COMPONENT_TYPES.layout)
  };
}

export function addResponsiveLayoutControls(node) {
  const section = document.createElement("section");
  section.className = "inspector-section responsive-layout-section";

  const title = document.createElement("div");
  title.className = "inspector-section-title";
  title.textContent = "Layout";
  section.append(title);

  const mode = getNodeLayoutMode(node);
  section.append(createLayoutSelectField(node, "Mode", "mode", mode, LAYOUT_MODE_OPTIONS));
  section.append(...renderLayoutModeControls(node, mode));
  section.append(...renderChildSizingControls(node));
  els.inspectorForm.append(section);
}

export function addLayoutComponentControls(node) {
  const mode = getNodeLayoutMode(node);
  appendInspectorControl(createLayoutSelectField(node, "Mode", "mode", mode, LAYOUT_MODE_OPTIONS));
  for (const control of renderLayoutModeControls(node, mode)) {
    appendInspectorControl(control);
  }
  for (const control of renderChildSizingControls(node)) {
    appendInspectorControl(control);
  }
}

export function createLayoutFieldRow(node, fields) {
  return createFieldGrid(
    fields,
    (label, key, value, type) => createLayoutField(node, label, key, value, type)
  );
}

export function createLayoutField(node, label, key, value, type = "text") {
  const field = createLabeledField(label);
  const input = createTextInput(type, value);
  const applyValue = () => updateSelectedNodeLayoutProp(node, key, input.value, type);
  input.addEventListener("input", applyValue);
  input.addEventListener("change", applyValue);
  field.append(input);
  return field;
}

export function createLayoutSelectField(node, label, key, value, options, type = "text") {
  const field = createLabeledField(label);
  const select = createSelect(options, value);
  select.addEventListener("change", () => {
    updateSelectedNodeLayoutProp(node, key, select.value, type, { preserveInspector: false });
  });
  field.append(select);
  return field;
}

function renderLayoutModeControls(node, mode) {
  const renderControls = LAYOUT_MODE_RENDERERS[mode] || LAYOUT_MODE_RENDERERS.absolute;
  return renderControls(node, mode);
}

function renderFlexLayoutControls(node) {
  const layout = getEffectiveNodeLayout(node);
  return [
    createLayoutSelectField(node, "Direction", "direction", layout.direction || "row", DIRECTION_OPTIONS),
    createLayoutSelectField(node, "Wrap", "wrap", layout.wrap === true ? "true" : "false", WRAP_OPTIONS, "boolean"),
    ...createStackLayoutControls(node),
    createLayoutFieldRow(node, createSpacingFields(node))
  ];
}

function renderListLayoutControls(node) {
  const layout = getEffectiveNodeLayout(node);
  return [
    createLayoutSelectField(node, "Direction", "direction", layout.direction || "column", DIRECTION_OPTIONS),
    ...createStackLayoutControls(node),
    createLayoutFieldRow(node, createSpacingFields(node))
  ];
}

function renderGridLayoutControls(node) {
  const layout = getEffectiveNodeLayout(node);
  return [
    createLayoutFieldRow(node, [
      ["Columns", "columns", layout.columns ?? 2, "number"],
      ["Gap", "gap", layout.gap ?? 0, "number"]
    ]),
    createLayoutFieldRow(node, [
      ["Cell W", "cellWidth", layout.cellWidth ?? "", "number"],
      ["Cell H", "cellHeight", layout.cellHeight ?? "", "number"]
    ]),
    createLayoutFieldRow(node, [
      ["Padding", "padding", getScalarLayoutValue(node, "padding", 0), "number"]
    ])
  ];
}

function createStackLayoutControls(node) {
  const layout = getEffectiveNodeLayout(node);
  return [
    createLayoutSelectField(node, "Align", "alignItems", layout.alignItems || "start", ALIGN_OPTIONS),
    createLayoutSelectField(node, "Justify", "justifyContent", layout.justifyContent || "start", JUSTIFY_OPTIONS)
  ];
}

function createSpacingFields(node) {
  const layout = getEffectiveNodeLayout(node);
  return [
    ["Gap", "gap", layout.gap ?? 0, "number"],
    ["Padding", "padding", getScalarLayoutValue(node, "padding", 0), "number"]
  ];
}

function renderChildSizingControls(node) {
  if (isRootNode(node)) {
    return [];
  }

  return [
    createLayoutFieldRow(node, [
      ["Grow", "grow", getEffectiveNodeLayout(node).grow ?? 0, "number"],
      ["Aspect", "aspectRatio", getEffectiveNodeLayout(node).aspectRatio ?? "", "number"]
    ]),
    createLayoutFieldRow(node, [
      ["Min W", "minWidth", getEffectiveNodeLayout(node).minWidth ?? "", "number"],
      ["Min H", "minHeight", getEffectiveNodeLayout(node).minHeight ?? "", "number"]
    ]),
    createLayoutFieldRow(node, [
      ["Max W", "maxWidth", getEffectiveNodeLayout(node).maxWidth ?? "", "number"],
      ["Max H", "maxHeight", getEffectiveNodeLayout(node).maxHeight ?? "", "number"]
    ])
  ];
}

function getScalarLayoutValue(node, key, fallback) {
  const value = getEffectiveNodeLayout(node)?.[key];
  return typeof value === "object" ? fallback : value ?? fallback;
}
