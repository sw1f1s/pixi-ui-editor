import { numberOr } from "../math.js";
import {
  normalizeProgressValue,
  parseControlOptions,
  readBoolean
} from "../control-shared.js";
import {
  createHorizontalAxis,
  createVerticalAxis
} from "./axis.js";
import {
  getNodeTransformSize,
  setComponentTypesEnabled,
  setNodeActiveState,
  setNodeFrame,
  setProgressVisualProps,
  setTextComponentValue,
  setVisualColor,
  setVisualStroke
} from "./mutations.js";
import { updateChildPart } from "./parts.js";

export const CONTROL_SYNCERS = [
  { types: ["toggle"], sync: syncToggleControl },
  { types: ["checkbox"], sync: syncCheckboxControl },
  { types: ["radio"], sync: syncRadioControl },
  { types: ["slider"], sync: syncSliderControl },
  { types: ["progressbar"], sync: syncProgressControl },
  { types: ["input", "textinput"], sync: syncTextInputControl },
  { types: ["dropdown"], sync: syncDropdownControl }
];

function syncToggleControl(node, props = {}) {
  const checked = readBoolean(props.checked ?? props.selected ?? props.on ?? props.value);
  const trackColor = checked ? props.onFill ?? props.fill : props.offFill ?? props.fill;
  const frame = getNodeTransformSize(node);
  let next = setVisualColor(node, trackColor);

  next = updateChildPart(next, ["togglethumb", "thumb", "knob"], (child) => {
    const childFrame = getNodeTransformSize(child);
    const margin = Math.max(0, numberOr(props.padding ?? props.inset, 14));
    const x = checked
      ? Math.max(margin, frame.width - childFrame.width - margin)
      : margin;
    const y = Math.max(0, (frame.height - childFrame.height) / 2);
    return setVisualColor(setNodeFrame(child, {
      x,
      y,
      width: childFrame.width,
      height: childFrame.height
    }, {
      anchors: checked ? { right: margin, centerY: 0 } : { left: margin, centerY: 0 }
    }), props.knobFill ?? props.thumbFill);
  });

  return next;
}

function syncCheckboxControl(node, props = {}) {
  const checked = readBoolean(props.checked ?? props.selected ?? props.on ?? props.value);
  let next = updateChildPart(node, ["checkboxbox", "box"], (child) => {
    return setVisualStroke(setVisualColor(child, props.boxFill ?? props.fill), {
      stroke: props.stroke ?? props.borderFill,
      strokeWidth: props.strokeWidth ?? props.borderWidth
    });
  });

  next = updateChildPart(next, ["checkboxcheck", "check", "mark"], (child) => {
    return setVisualColor(setNodeActiveState(child, checked), props.checkFill);
  });

  next = updateChildPart(next, ["checkboxbox", "box"], (child) => {
    return setComponentTypesEnabled(setTextComponentValue(child, props.checkMark || "X", props.checkFill), ["text"], checked);
  });

  return next;
}

function syncRadioControl(node, props = {}) {
  const checked = readBoolean(props.checked ?? props.selected ?? props.on ?? props.value);
  let next = updateChildPart(node, ["radioring", "ring"], (child) => {
    return setVisualStroke(setVisualColor(child, props.ringFill ?? props.fill), {
      stroke: props.stroke ?? props.borderFill,
      strokeWidth: props.strokeWidth ?? props.borderWidth
    });
  });

  next = updateChildPart(next, ["radiodot", "dot", "check"], (child) => {
    return setVisualColor(setNodeActiveState(child, checked), props.checkFill ?? props.fill);
  });

  return next;
}

function syncSliderControl(node, props = {}) {
  const progress = normalizeProgressValue(props.value ?? props.progress ?? props.current, props);
  const trackColor = props.trackFill ?? props.backgroundFill;
  const fillColor = props.fill ?? props.valueFill;
  const thumbColor = props.thumbFill ?? props.knobFill;
  const frame = getNodeTransformSize(node);
  let next = setVisualColor(node, trackColor);
  const axis = createControlAxis(props, frame, progress);

  next = updateChildPart(next, ["sliderfill", "valuefill"], (child) => {
    const childFrame = getNodeTransformSize(child);
    return setVisualColor(setNodeFrame(child, axis.fillFrame(childFrame), axis.fillLayout()), fillColor);
  });

  next = updateChildPart(next, ["sliderthumb", "thumb", "knob"], (child) => {
    const childFrame = getNodeTransformSize(child);
    return setVisualColor(setNodeFrame(child, axis.thumbFrame(childFrame), axis.thumbLayout(childFrame)), thumbColor);
  });

  return next;
}

function syncProgressControl(node, props = {}) {
  const progress = normalizeProgressValue(props.value ?? props.progress ?? props.current, props);
  const frame = getNodeTransformSize(node);
  const axis = createControlAxis(props, frame, progress);
  let next = setProgressVisualProps(node, {
    progress,
    trackFill: props.trackFill ?? props.backgroundFill,
    fill: props.fill ?? props.valueFill,
    radius: props.radius
  });

  next = updateChildPart(next, ["progressfill", "valuefill"], (child) => {
    return setVisualColor(setNodeFrame(child, axis.progressFrame(), axis.progressLayout()), props.fill ?? props.valueFill);
  });

  return next;
}

function syncTextInputControl(node, props = {}) {
  const value = props.value ?? "";
  const text = String(value || props.placeholder || "");
  const color = value ? props.fill || props.textFill : props.placeholderFill || props.placeholderColor || props.fill || props.textFill;
  return setTextComponentValue(node, text, color);
}

function syncDropdownControl(node, props = {}) {
  const options = parseControlOptions(props.options);
  const text = props.value || options[0] || "";
  let next = setTextComponentValue(node, text, props.fill || props.textFill);
  next = updateChildPart(next, ["dropdownarrow", "arrow"], (child) => {
    const parentFrame = getNodeTransformSize(node);
    const childFrame = getNodeTransformSize(child);
    const margin = Math.max(0, numberOr(props.arrowInset ?? props.paddingRight, 24));
    return setNodeFrame(child, {
      x: Math.max(0, parentFrame.width - childFrame.width - margin),
      y: Math.max(0, (parentFrame.height - childFrame.height) / 2),
      width: childFrame.width,
      height: childFrame.height
    }, {
      anchors: { right: margin, centerY: 0 }
    });
  });
  return next;
}

function createControlAxis(props, frame, progress) {
  const direction = String(props.direction || props.orientation || "horizontal").toLowerCase();
  return direction === "vertical"
    ? createVerticalAxis(frame, progress)
    : createHorizontalAxis(frame, progress);
}
