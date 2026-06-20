import {
  els,
  getComponentById,
  getComponentDisplayName,
  getComponentReferenceId,
  getNodeLocalFrame,
  getNodeResolvedLocalFrame,
  getSelectedNode,
  isComponentInstanceNode,
  isMissingComponentInstanceNode,
  isNodeActive,
  isNodeLayoutManagedByParent
} from "./deps.js";
import { addAnchorControls } from "./anchors.js";
import { addNodeComponentCards, closeComponentAddMenus } from "./componentsPanel.js";
import { addCheckboxField, addColorField, addField, addFieldRow, addSelectField } from "./fields.js";
import { withInspectorAppendTarget } from "./context.js";
import { isRootNode } from "./nodeState.js";

export function renderInspector() {
  closeComponentAddMenus();
  const node = getSelectedNode();
  if (!node) {
    els.inspectorForm.innerHTML = "<p class=\"node-type\">Select a layer or canvas object.</p>";
    return;
  }

  els.inspectorForm.innerHTML = "";
  addField("Name", "name", getInspectorNodeName(node));
  addInstanceVariantField(node);
  addInstanceExposedPropFields(node);
  if (!isRootNode(node)) {
    addCheckboxField("Active", "active", isNodeActive(node));
    const layoutManaged = isNodeLayoutManagedByParent(node);
    const frame = layoutManaged ? getNodeLocalFrame(node) : getNodeResolvedLocalFrame(node);
    addFieldRow([
      ["X", "x", frame.x, "number"],
      ["Y", "y", frame.y, "number"]
    ]);
    addFieldRow([
      ["Width", "width", frame.width, "number"],
      ["Height", "height", frame.height, "number"]
    ]);
    if (!layoutManaged) {
      addAnchorControls(node);
    }
  }

  addNodeComponentCards(node);
}

function addInstanceExposedPropFields(node) {
  if (!isComponentInstanceNode(node) || isMissingComponentInstanceNode(node)) {
    return;
  }

  const component = getComponentById(getComponentReferenceId(node));
  const exposedProps = component?.exposedProps && typeof component.exposedProps === "object" && !Array.isArray(component.exposedProps)
    ? component.exposedProps
    : component?.propsSchema;
  const entries = Object.entries(exposedProps || {}).filter(([name]) => {
    return !["component", "componentId", "variant", "variantId"].includes(name);
  });
  if (!entries.length) {
    return;
  }

  const section = document.createElement("section");
  section.className = "inspector-exposed-props";
  const title = document.createElement("div");
  title.className = "inspector-section-title";
  title.textContent = "Instance Props";
  section.append(title);
  withInspectorAppendTarget(section, () => {
    for (const [propName, definition] of entries) {
      addExposedPropField(node, propName, definition);
    }
  });
  els.inspectorForm.append(section);
}

function addExposedPropField(node, propName, definition) {
  const config = normalizeExposedPropDefinition(propName, definition);
  const value = node.props?.[propName] ?? config.defaultValue ?? "";
  if (config.options.length) {
    addSelectField(config.label, propName, value, config.options);
    return;
  }
  if (config.type === "boolean") {
    addCheckboxField(config.label, propName, Boolean(value));
    return;
  }
  if (config.type === "color") {
    addColorField(config.label, propName, value || "#ffffff");
    return;
  }
  addField(config.label, propName, value, config.type === "number" ? "number" : "text");
}

function normalizeExposedPropDefinition(propName, definition) {
  const config = definition && typeof definition === "object" && !Array.isArray(definition)
    ? definition
    : { type: typeof definition === "string" ? definition : "string" };
  const rawOptions = config.options || config.enum || [];
  return {
    label: config.label || humanizePropName(propName),
    type: normalizeExposedPropType(config.type),
    defaultValue: config.default ?? config.value,
    options: Array.isArray(rawOptions)
      ? rawOptions.map((option) => {
          const value = typeof option === "object" ? option.value : option;
          const label = typeof option === "object" ? option.label || option.name || option.value : option;
          return [String(value), String(label)];
        })
      : []
  };
}

function normalizeExposedPropType(type) {
  const text = String(type || "string").toLowerCase();
  if (["number", "float", "int", "integer"].includes(text)) {
    return "number";
  }
  if (["bool", "boolean"].includes(text)) {
    return "boolean";
  }
  if (["color", "colour"].includes(text)) {
    return "color";
  }
  return "string";
}

function humanizePropName(propName) {
  return String(propName || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function addInstanceVariantField(node) {
  if (!isComponentInstanceNode(node) || isMissingComponentInstanceNode(node)) {
    return;
  }

  const component = getComponentById(getComponentReferenceId(node));
  const variants = Array.isArray(component?.variants) ? component.variants : [];
  if (!variants.length) {
    return;
  }

  addSelectField("Variant", "variant", node.props?.variant || "", [
    ["", "Default"],
    ...variants.map((variant, index) => {
      const value = String(variant?.id || variant?.name || `variant_${index + 1}`);
      return [value, String(variant?.name || variant?.id || `Variant ${index + 1}`)];
    })
  ]);
}

export function getInspectorNodeName(node) {
  if (isComponentInstanceNode(node) && !isMissingComponentInstanceNode(node)) {
    return getComponentDisplayName(getComponentById(getComponentReferenceId(node)));
  }

  return node.name;
}
