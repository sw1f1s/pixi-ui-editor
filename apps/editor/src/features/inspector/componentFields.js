import {
  ASSET_TYPES,
  componentKey,
  getNodeComponentProps,
  NODE_COMPONENT_TYPES
} from "./deps.js?v=20260620-designless";
import { appendInspectorControl } from "./context.js?v=20260620-designless";
import {
  addAtlasFrameField,
  addAssetSelectField,
  addCheckboxField,
  addCheckboxFieldRow,
  addColorField,
  addField,
  addFieldRow,
  addFontAssetField,
  addSelectField,
  getTextureInspectorState
} from "./fields.js?v=20260620-designless";
import { addLayoutComponentControls } from "./layoutControls.js?v=20260620-designless";

const COMPONENT_FIELD_RENDERERS = Object.freeze({
  [NODE_COMPONENT_TYPES.text]: renderTextComponentFields,
  [NODE_COMPONENT_TYPES.texture]: renderTextureComponentFields,
  [NODE_COMPONENT_TYPES.fill]: renderFillComponentFields,
  [NODE_COMPONENT_TYPES.shadow]: renderShadowComponentFields,
  [NODE_COMPONENT_TYPES.outline]: renderOutlineComponentFields,
  [NODE_COMPONENT_TYPES.button]: renderButtonComponentFields,
  [NODE_COMPONENT_TYPES.slider]: renderSliderComponentFields,
  [NODE_COMPONENT_TYPES.toggle]: renderToggleComponentFields,
  [NODE_COMPONENT_TYPES.checkbox]: renderCheckboxComponentFields,
  [NODE_COMPONENT_TYPES.radio]: renderRadioComponentFields,
  [NODE_COMPONENT_TYPES.input]: renderInputComponentFields,
  [NODE_COMPONENT_TYPES.textInput]: renderInputComponentFields,
  [NODE_COMPONENT_TYPES.dropdown]: renderDropdownComponentFields,
  [NODE_COMPONENT_TYPES.progressBar]: renderProgressBarComponentFields,
  [NODE_COMPONENT_TYPES.mask]: renderMaskComponentFields,
  [NODE_COMPONENT_TYPES.repeater]: renderRepeaterComponentFields,
  [NODE_COMPONENT_TYPES.layout]: renderLayoutComponentFields,
  [NODE_COMPONENT_TYPES.scroll]: renderScrollComponentFields,
  [NODE_COMPONENT_TYPES.scrollView]: renderScrollComponentFields
});

export function addNodeComponentFields(node, componentType) {
  const renderFields = COMPONENT_FIELD_RENDERERS[componentType] || renderUnsupportedComponentFields;
  renderFields(node, componentType);
}

export function renderTextComponentFields(node) {
  const textProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.text);
  addField("Text", componentKey(NODE_COMPONENT_TYPES.text, "text"), textProps.text || "");
  addFontAssetField(node);
  addField("Font", componentKey(NODE_COMPONENT_TYPES.text, "fontFamily"), textProps.fontFamily || "Inter");
  addField("Font Size", componentKey(NODE_COMPONENT_TYPES.text, "fontSize"), textProps.fontSize || 42, "number");
  addSelectField("Horizontal", componentKey(NODE_COMPONENT_TYPES.text, "align"), textProps.align || "left", [
    ["left", "Left"],
    ["center", "Center"],
    ["right", "Right"]
  ]);
  addSelectField("Vertical", componentKey(NODE_COMPONENT_TYPES.text, "verticalAlign"), textProps.verticalAlign || "top", [
    ["top", "Top"],
    ["middle", "Middle"],
    ["bottom", "Bottom"]
  ]);
  addField("Line Height", componentKey(NODE_COMPONENT_TYPES.text, "lineHeight"), textProps.lineHeight || 1.2, "number");
  addSelectField("Wrap", componentKey(NODE_COMPONENT_TYPES.text, "wrap"), textProps.wrap === false ? "false" : "true", [
    ["true", "Wrap"],
    ["false", "No wrap"]
  ], "boolean");
  addColorField("Fill", componentKey(NODE_COMPONENT_TYPES.text, "fill"), textProps.fill || "#ffffff");
}

export function renderTextureComponentFields(node) {
  const { asset, textureProps, renderType, hasNineSliceDefaults } = getTextureInspectorState(node);
  addAssetSelectField("Texture", textureProps.assetId || "");
  if (asset?.type === ASSET_TYPES.spriteAtlas) {
    addAtlasFrameField(node, asset);
  }
  addSelectField("Texture Type", componentKey(NODE_COMPONENT_TYPES.texture, "textureType"), renderType, [
    ["simple", "Simple"],
    ["sliced", "Sliced"],
    ["tiled", "Tiled"]
  ]);
  addColorField("Tint", componentKey(NODE_COMPONENT_TYPES.texture, "tint"), textureProps.tint || "#ffffff");
  addCheckboxFieldRow([
    ["Flip X", componentKey(NODE_COMPONENT_TYPES.texture, "flipX"), textureProps.flipX === true],
    ["Flip Y", componentKey(NODE_COMPONENT_TYPES.texture, "flipY"), textureProps.flipY === true]
  ]);
  if (renderType === "simple") {
    addSelectField("Object Fit", componentKey(NODE_COMPONENT_TYPES.texture, "objectFit"), textureProps.objectFit || "contain", [
      ["contain", "Contain"],
      ["cover", "Cover"],
      ["fill", "Fill"],
      ["none", "None"]
    ]);
  }
  if (hasNineSliceDefaults) {
    addField("Pixels Per Unit Multiplier", componentKey(NODE_COMPONENT_TYPES.texture, "pixelsPerUnitMultiplier"), textureProps.pixelsPerUnitMultiplier ?? 1, "number");
  }
  if (renderType === "sliced") {
    const nineSlice = textureProps.nineSlice || {};
    addFieldRow([
      ["Slice L", componentKey(NODE_COMPONENT_TYPES.texture, "nineSlice.left"), nineSlice.left ?? 0, "number"],
      ["Slice R", componentKey(NODE_COMPONENT_TYPES.texture, "nineSlice.right"), nineSlice.right ?? 0, "number"]
    ]);
    addFieldRow([
      ["Slice T", componentKey(NODE_COMPONENT_TYPES.texture, "nineSlice.top"), nineSlice.top ?? 0, "number"],
      ["Slice B", componentKey(NODE_COMPONENT_TYPES.texture, "nineSlice.bottom"), nineSlice.bottom ?? 0, "number"]
    ]);
  }
}

export function renderFillComponentFields(node) {
  const fillProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.fill);
  addColorField("Fill", componentKey(NODE_COMPONENT_TYPES.fill, "fill"), fillProps.fill || "#252b3d");
  addColorField("Stroke", componentKey(NODE_COMPONENT_TYPES.fill, "stroke"), fillProps.stroke || "#000000");
  addField("Stroke Width", componentKey(NODE_COMPONENT_TYPES.fill, "strokeWidth"), fillProps.strokeWidth || 0, "number");
  addField("Radius", componentKey(NODE_COMPONENT_TYPES.fill, "radius"), fillProps.radius || 0, "number");
}

export function renderShadowComponentFields(node) {
  const shadowProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.shadow);
  addColorField("Color", componentKey(NODE_COMPONENT_TYPES.shadow, "color"), shadowProps.color || "#000000");
  addField("Alpha", componentKey(NODE_COMPONENT_TYPES.shadow, "alpha"), shadowProps.alpha ?? 0.35, "number");
  addField("Blur", componentKey(NODE_COMPONENT_TYPES.shadow, "blur"), shadowProps.blur ?? 12, "number");
  addField("Offset X", componentKey(NODE_COMPONENT_TYPES.shadow, "offsetX"), shadowProps.offsetX ?? 0, "number");
  addField("Offset Y", componentKey(NODE_COMPONENT_TYPES.shadow, "offsetY"), shadowProps.offsetY ?? 6, "number");
}

export function renderOutlineComponentFields(node) {
  const outlineProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.outline);
  addColorField("Color", componentKey(NODE_COMPONENT_TYPES.outline, "color"), outlineProps.color || "#ffffff");
  addField("Alpha", componentKey(NODE_COMPONENT_TYPES.outline, "alpha"), outlineProps.alpha ?? 1, "number");
  addField("Width", componentKey(NODE_COMPONENT_TYPES.outline, "width"), outlineProps.width ?? 2, "number");
}

export function renderButtonComponentFields(node) {
  const buttonProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.button);
  addSelectField("Interactive", componentKey(NODE_COMPONENT_TYPES.button, "interactive"), buttonProps.interactive === false ? "false" : "true", [
    ["true", "Interactive"],
    ["false", "Disabled"]
  ], "boolean");
  addSelectField("Event Mode", componentKey(NODE_COMPONENT_TYPES.button, "eventMode"), buttonProps.eventMode || "static", [
    ["static", "Static"],
    ["dynamic", "Dynamic"],
    ["passive", "Passive"],
    ["auto", "Auto"],
    ["none", "None"]
  ]);
  addSelectField("Cursor", componentKey(NODE_COMPONENT_TYPES.button, "cursor"), buttonProps.cursor || "pointer", [
    ["pointer", "Pointer"],
    ["default", "Default"],
    ["grab", "Grab"]
  ]);
}

export function renderSliderComponentFields(node) {
  const sliderProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.slider);
  addFieldRow([
    ["Value", componentKey(NODE_COMPONENT_TYPES.slider, "value"), sliderProps.value ?? 0.5, "number"],
    ["Step", componentKey(NODE_COMPONENT_TYPES.slider, "step"), sliderProps.step ?? 0.01, "number"]
  ]);
  addFieldRow([
    ["Min", componentKey(NODE_COMPONENT_TYPES.slider, "min"), sliderProps.min ?? 0, "number"],
    ["Max", componentKey(NODE_COMPONENT_TYPES.slider, "max"), sliderProps.max ?? 1, "number"]
  ]);
  addSelectField("Direction", componentKey(NODE_COMPONENT_TYPES.slider, "direction"), sliderProps.direction || "horizontal", [
    ["horizontal", "Horizontal"],
    ["vertical", "Vertical"]
  ]);
  addColorField("Track", componentKey(NODE_COMPONENT_TYPES.slider, "trackFill"), sliderProps.trackFill || "#2b3040");
  addColorField("Fill", componentKey(NODE_COMPONENT_TYPES.slider, "fill"), sliderProps.fill || "#33b8a5");
  addColorField("Thumb", componentKey(NODE_COMPONENT_TYPES.slider, "thumbFill"), sliderProps.thumbFill || "#ffffff");
}

export function renderToggleComponentFields(node) {
  const toggleProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.toggle);
  addCheckboxField("Checked", componentKey(NODE_COMPONENT_TYPES.toggle, "checked"), toggleProps.checked === true);
  addColorField("On", componentKey(NODE_COMPONENT_TYPES.toggle, "onFill"), toggleProps.onFill || "#33b8a5");
  addColorField("Off", componentKey(NODE_COMPONENT_TYPES.toggle, "offFill"), toggleProps.offFill || "#2b3040");
  addColorField("Knob", componentKey(NODE_COMPONENT_TYPES.toggle, "knobFill"), toggleProps.knobFill || "#ffffff");
  addControlInteractionFields(NODE_COMPONENT_TYPES.toggle, toggleProps, "pointer");
}

export function renderCheckboxComponentFields(node) {
  const checkboxProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.checkbox);
  addCheckboxField("Checked", componentKey(NODE_COMPONENT_TYPES.checkbox, "checked"), checkboxProps.checked === true);
  addColorField("Check", componentKey(NODE_COMPONENT_TYPES.checkbox, "checkFill"), checkboxProps.checkFill || "#33b8a5");
  addColorField("Box", componentKey(NODE_COMPONENT_TYPES.checkbox, "boxFill"), checkboxProps.boxFill || "#151922");
  addColorField("Stroke", componentKey(NODE_COMPONENT_TYPES.checkbox, "stroke"), checkboxProps.stroke || "#59657a");
  addControlInteractionFields(NODE_COMPONENT_TYPES.checkbox, checkboxProps, "pointer");
}

export function renderRadioComponentFields(node) {
  const radioProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.radio);
  addCheckboxField("Checked", componentKey(NODE_COMPONENT_TYPES.radio, "checked"), radioProps.checked === true);
  addField("Group", componentKey(NODE_COMPONENT_TYPES.radio, "group"), radioProps.group || "default");
  addColorField("Check", componentKey(NODE_COMPONENT_TYPES.radio, "checkFill"), radioProps.checkFill || "#33b8a5");
  addColorField("Ring", componentKey(NODE_COMPONENT_TYPES.radio, "ringFill"), radioProps.ringFill || "#151922");
  addColorField("Stroke", componentKey(NODE_COMPONENT_TYPES.radio, "stroke"), radioProps.stroke || "#59657a");
  addControlInteractionFields(NODE_COMPONENT_TYPES.radio, radioProps, "pointer");
}

export function renderInputComponentFields(node, componentType = NODE_COMPONENT_TYPES.input) {
  const inputProps = getNodeComponentProps(node, componentType);
  addField("Value", componentKey(componentType, "value"), inputProps.value || "");
  addField("Placeholder", componentKey(componentType, "placeholder"), inputProps.placeholder || "Text");
  addSelectField("Input Type", componentKey(componentType, "inputType"), inputProps.inputType || "text", [
    ["text", "Text"],
    ["number", "Number"],
    ["password", "Password"],
    ["email", "Email"]
  ]);
  addControlInteractionFields(componentType, inputProps, "text");
}

export function renderDropdownComponentFields(node) {
  const dropdownProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.dropdown);
  addField("Value", componentKey(NODE_COMPONENT_TYPES.dropdown, "value"), dropdownProps.value || "");
  addField("Options", componentKey(NODE_COMPONENT_TYPES.dropdown, "options"), dropdownProps.options || "Option A, Option B, Option C");
  addControlInteractionFields(NODE_COMPONENT_TYPES.dropdown, dropdownProps, "pointer");
}

export function renderProgressBarComponentFields(node) {
  const progressProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.progressBar);
  addFieldRow([
    ["Value", componentKey(NODE_COMPONENT_TYPES.progressBar, "value"), progressProps.value ?? 0.5, "number"],
    ["Radius", componentKey(NODE_COMPONENT_TYPES.progressBar, "radius"), progressProps.radius ?? 12, "number"]
  ]);
  addFieldRow([
    ["Min", componentKey(NODE_COMPONENT_TYPES.progressBar, "min"), progressProps.min ?? 0, "number"],
    ["Max", componentKey(NODE_COMPONENT_TYPES.progressBar, "max"), progressProps.max ?? 1, "number"]
  ]);
  addColorField("Track", componentKey(NODE_COMPONENT_TYPES.progressBar, "trackFill"), progressProps.trackFill || "#2b3040");
  addColorField("Fill", componentKey(NODE_COMPONENT_TYPES.progressBar, "fill"), progressProps.fill || "#33b8a5");
}

export function renderMaskComponentFields(node) {
  const maskProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.mask);
  addSelectField("Shape", componentKey(NODE_COMPONENT_TYPES.mask, "shape"), maskProps.shape || "rect", [
    ["rect", "Rectangle"],
    ["roundedRect", "Rounded Rect"],
    ["circle", "Circle"],
    ["ellipse", "Ellipse"]
  ]);
  addField("Radius", componentKey(NODE_COMPONENT_TYPES.mask, "radius"), maskProps.radius ?? 0, "number");
  addCheckboxField("Invert", componentKey(NODE_COMPONENT_TYPES.mask, "invert"), maskProps.invert === true);
}

export function renderRepeaterComponentFields(node) {
  const repeaterProps = getNodeComponentProps(node, NODE_COMPONENT_TYPES.repeater);
  addField("Data Path", componentKey(NODE_COMPONENT_TYPES.repeater, "dataPath"), repeaterProps.dataPath || "items");
  addSelectField("Direction", componentKey(NODE_COMPONENT_TYPES.repeater, "direction"), repeaterProps.direction || "vertical", [
    ["vertical", "Vertical"],
    ["horizontal", "Horizontal"],
    ["grid", "Grid"]
  ]);
  addFieldRow([
    ["Item Gap", componentKey(NODE_COMPONENT_TYPES.repeater, "itemGap"), repeaterProps.itemGap ?? 8, "number"],
    ["Limit", componentKey(NODE_COMPONENT_TYPES.repeater, "limit"), repeaterProps.limit ?? 0, "number"]
  ]);
}

export function renderLayoutComponentFields(node) {
  addLayoutComponentControls(node);
}

export function renderScrollComponentFields(node, componentType = NODE_COMPONENT_TYPES.scroll) {
  const scrollProps = getNodeComponentProps(node, componentType);
  addSelectField("Direction", componentKey(componentType, "direction"), scrollProps.direction || "vertical", [
    ["vertical", "Vertical"],
    ["horizontal", "Horizontal"],
    ["both", "Both"]
  ]);
  addCheckboxField("Scroll X", componentKey(componentType, "scrollX"), scrollProps.scrollX === true);
  addCheckboxField("Scroll Y", componentKey(componentType, "scrollY"), scrollProps.scrollY !== false);
  addCheckboxField("Mask Content", componentKey(componentType, "mask"), scrollProps.mask !== false);
  addCheckboxField("Momentum", componentKey(componentType, "momentum"), scrollProps.momentum !== false);
}

function addControlInteractionFields(componentType, props, defaultCursor) {
  addSelectField("Interactive", componentKey(componentType, "interactive"), props.interactive === false ? "false" : "true", [
    ["true", "Interactive"],
    ["false", "Disabled"]
  ], "boolean");
  addSelectField("Event Mode", componentKey(componentType, "eventMode"), props.eventMode || "static", [
    ["static", "Static"],
    ["dynamic", "Dynamic"],
    ["passive", "Passive"],
    ["auto", "Auto"],
    ["none", "None"]
  ]);
  addSelectField("Cursor", componentKey(componentType, "cursor"), props.cursor || defaultCursor, [
    ["pointer", "Pointer"],
    ["text", "Text"],
    ["default", "Default"],
    ["grab", "Grab"]
  ]);
}

export function renderUnsupportedComponentFields() {
  const unsupported = document.createElement("p");
  unsupported.className = "component-stack-empty";
  unsupported.textContent = "This component has no editable inspector fields yet.";
  appendInspectorControl(unsupported);
}
