export const TEXT_TYPES = new Set(["text", "label", "bitmaptext"]);

export const SPRITE_TYPES = new Set(["sprite", "image", "nineslice", "nineslicesprite", "tilingsprite"]);

export const GRAPHICS_TYPES = new Set(["graphics", "shape", "rect", "rectangle", "circle", "ellipse", "button"]);

export const COMPONENT_TYPES = new Set(["componentinstance", "component-instance", "instance"]);

export const VISUAL_COMPONENT_TYPES = new Set(["fill", "texture", "text", "progressbar", "mask"]);

export const RENDER_COMPONENT_TYPES = VISUAL_COMPONENT_TYPES;

export const EFFECT_COMPONENT_TYPES = new Set(["shadow", "outline"]);

export const CONTROL_COMPONENT_TYPES = new Set([
  "button",
  "slider",
  "toggle",
  "checkbox",
  "radio",
  "input",
  "textinput",
  "dropdown",
  "progressbar",
  "mask",
  "repeater",
  "scroll",
  "scrollview"
]);
