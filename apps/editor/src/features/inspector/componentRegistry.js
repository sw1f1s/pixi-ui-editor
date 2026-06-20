import { NODE_COMPONENT_LABELS, NODE_COMPONENT_TYPES } from "./deps.js?v=20260620-designless";

export const DEFAULT_NODE_COMPONENT_PROPS = Object.freeze({
  [NODE_COMPONENT_TYPES.fill]: Object.freeze({
    shape: "roundedRect",
    fill: "#252b3d",
    stroke: null,
    strokeWidth: 0,
    radius: 12
  }),
  [NODE_COMPONENT_TYPES.texture]: Object.freeze({
    assetId: null,
    objectFit: "contain",
    tint: "#ffffff",
    flipX: false,
    flipY: false,
    pixelsPerUnitMultiplier: 1,
    nineSlice: null
  }),
  [NODE_COMPONENT_TYPES.text]: Object.freeze({
    text: "Text",
    fontFamily: "Inter",
    fontSize: 42,
    fill: "#ffffff",
    align: "left",
    verticalAlign: "top",
    lineHeight: 1.2,
    wrap: true
  }),
  [NODE_COMPONENT_TYPES.shadow]: Object.freeze({
    color: "#000000",
    alpha: 0.35,
    blur: 12,
    offsetX: 0,
    offsetY: 6
  }),
  [NODE_COMPONENT_TYPES.outline]: Object.freeze({
    color: "#ffffff",
    alpha: 1,
    width: 2
  }),
  [NODE_COMPONENT_TYPES.button]: Object.freeze({
    interactive: true,
    eventMode: "static",
    cursor: "pointer"
  }),
  [NODE_COMPONENT_TYPES.slider]: Object.freeze({
    value: 0.5,
    min: 0,
    max: 1,
    step: 0.01,
    direction: "horizontal",
    trackFill: "#2b3040",
    fill: "#33b8a5",
    thumbFill: "#ffffff"
  }),
  [NODE_COMPONENT_TYPES.toggle]: Object.freeze({
    checked: false,
    onFill: "#33b8a5",
    offFill: "#2b3040",
    knobFill: "#ffffff",
    interactive: true,
    eventMode: "static",
    cursor: "pointer"
  }),
  [NODE_COMPONENT_TYPES.checkbox]: Object.freeze({
    checked: false,
    checkFill: "#33b8a5",
    boxFill: "#151922",
    stroke: "#59657a",
    interactive: true,
    eventMode: "static",
    cursor: "pointer"
  }),
  [NODE_COMPONENT_TYPES.radio]: Object.freeze({
    checked: false,
    checkFill: "#33b8a5",
    ringFill: "#151922",
    stroke: "#59657a",
    group: "default",
    interactive: true,
    eventMode: "static",
    cursor: "pointer"
  }),
  [NODE_COMPONENT_TYPES.input]: Object.freeze({
    value: "",
    placeholder: "Text",
    inputType: "text",
    interactive: true,
    eventMode: "static",
    cursor: "text"
  }),
  [NODE_COMPONENT_TYPES.textInput]: Object.freeze({
    value: "",
    placeholder: "Text",
    inputType: "text",
    interactive: true,
    eventMode: "static",
    cursor: "text"
  }),
  [NODE_COMPONENT_TYPES.dropdown]: Object.freeze({
    value: "Option A",
    options: "Option A, Option B, Option C",
    interactive: true,
    eventMode: "static",
    cursor: "pointer"
  }),
  [NODE_COMPONENT_TYPES.progressBar]: Object.freeze({
    value: 0.5,
    min: 0,
    max: 1,
    trackFill: "#2b3040",
    fill: "#33b8a5",
    radius: 12
  }),
  [NODE_COMPONENT_TYPES.mask]: Object.freeze({
    shape: "rect",
    radius: 0,
    invert: false
  }),
  [NODE_COMPONENT_TYPES.repeater]: Object.freeze({
    dataPath: "items",
    direction: "vertical",
    itemGap: 8,
    limit: 0
  }),
  [NODE_COMPONENT_TYPES.layout]: Object.freeze({
    mode: "absolute"
  }),
  [NODE_COMPONENT_TYPES.scroll]: Object.freeze({
    direction: "vertical",
    scrollX: false,
    scrollY: true,
    momentum: true,
    mask: true
  }),
  [NODE_COMPONENT_TYPES.scrollView]: Object.freeze({
    direction: "vertical",
    scrollX: false,
    scrollY: true,
    momentum: true,
    mask: true
  })
});

export function getDefaultNodeComponentProps(componentType) {
  return { ...(DEFAULT_NODE_COMPONENT_PROPS[componentType] || {}) };
}

export function getNodeComponentLabel(type) {
  return NODE_COMPONENT_LABELS[type] || String(type || "Component");
}
