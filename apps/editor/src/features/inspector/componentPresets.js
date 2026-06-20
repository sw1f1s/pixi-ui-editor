import { NODE_COMPONENT_TYPES } from "./deps.js?v=20260620-designless";
import { getNodeComponentLabel } from "./componentRegistry.js?v=20260620-designless";

export const COMPONENT_STACK_PRESETS = Object.freeze([
  Object.freeze({
    id: "panel",
    label: "Panel",
    description: "Fill + Shadow",
    components: Object.freeze([
      component(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#252b3d", stroke: "#394150", strokeWidth: 1, radius: 18 }),
      component(NODE_COMPONENT_TYPES.shadow, { color: "#000000", alpha: 0.28, blur: 16, offsetX: 0, offsetY: 8 })
    ])
  }),
  Object.freeze({
    id: "label",
    label: "Label",
    description: "Text",
    components: Object.freeze([
      component(NODE_COMPONENT_TYPES.text, { text: "Label", fontFamily: "Inter", fontSize: 32, fill: "#ffffff", align: "left", verticalAlign: "middle", lineHeight: 1.2, wrap: true })
    ])
  }),
  Object.freeze({
    id: "button",
    label: "Button",
    description: "Fill + Text + Button",
    components: Object.freeze([
      component(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#2d7ff9", stroke: "#79adff", strokeWidth: 1, radius: 22 }),
      component(NODE_COMPONENT_TYPES.text, { text: "Button", fontFamily: "Inter", fontSize: 36, fill: "#ffffff", align: "center", verticalAlign: "middle", lineHeight: 1.1, wrap: false }),
      component(NODE_COMPONENT_TYPES.button, { interactive: true, eventMode: "static", cursor: "pointer" })
    ])
  }),
  Object.freeze({
    id: "image-card",
    label: "Image Card",
    description: "Fill + Texture",
    components: Object.freeze([
      component(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#1f2430", stroke: "#343b4c", strokeWidth: 1, radius: 14 }),
      component(NODE_COMPONENT_TYPES.texture, { assetId: null, objectFit: "cover", textureType: "simple", tint: "#ffffff", flipX: false, flipY: false, pixelsPerUnitMultiplier: 1 })
    ])
  }),
  Object.freeze({
    id: "toggle",
    label: "Toggle",
    description: "Fill + Toggle",
    components: Object.freeze([
      component(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#33b8a5", radius: 24 }),
      component(NODE_COMPONENT_TYPES.toggle, { checked: true, onFill: "#33b8a5", offFill: "#2b3040", knobFill: "#ffffff", interactive: true, eventMode: "static", cursor: "pointer" })
    ])
  }),
  Object.freeze({
    id: "slider",
    label: "Slider",
    description: "Fill + Slider",
    components: Object.freeze([
      component(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#2b3040", radius: 16 }),
      component(NODE_COMPONENT_TYPES.slider, { min: 0, max: 1, value: 0.5, step: 0.01, trackFill: "#2b3040", fill: "#33b8a5", thumbFill: "#ffffff" })
    ])
  }),
  Object.freeze({
    id: "progress",
    label: "Progress",
    description: "Progress Bar",
    components: Object.freeze([
      component(NODE_COMPONENT_TYPES.progressBar, { min: 0, max: 1, value: 0.5, trackFill: "#2b3040", fill: "#33b8a5", radius: 16 })
    ])
  })
]);

export function getComponentStackPreset(presetId) {
  return COMPONENT_STACK_PRESETS.find((preset) => preset.id === presetId) || null;
}

export function getComponentPresetSummary(preset, presentTypes = new Set()) {
  const names = preset.components
    .map((entry) => getNodeComponentLabel(entry.type))
    .filter((label, index, labels) => labels.indexOf(label) === index);
  const missing = preset.components.filter((entry) => !presentTypes.has(entry.type)).length;
  return `${names.join(", ")}${missing ? "" : " · update"}`;
}

function component(type, props) {
  return Object.freeze({
    type,
    props: Object.freeze({ ...props })
  });
}
