import { clamp } from "./deps.js";

let numericInputDrag = null;
let numericInputHover = null;

const TEXT_BOUNDS_BY_ALIGN = Object.freeze({
  center: getCenteredTextBounds,
  end: getRightAlignedTextBounds,
  right: getRightAlignedTextBounds
});

export function handleNumericInputPointerDown(event) {
  if (event.button !== 0) {
    return;
  }

  const input = event.target instanceof Element ? event.target.closest("input[type=\"number\"]") : null;
  if (!input || input.disabled || input.readOnly) {
    return;
  }
  if (isPointerOverNumericInputValue(input, event.clientX)) {
    return;
  }

  const value = Number(input.value);
  const min = parseOptionalNumber(input.min, -Infinity);
  const max = parseOptionalNumber(input.max, Infinity);
  const step = getNumericInputStep(input);
  numericInputDrag = {
    input,
    startX: event.clientX,
    startValue: Number.isFinite(value) ? value : (Number.isFinite(min) ? min : 0),
    min,
    max,
    step,
    decimals: getNumericInputPrecision(input, step),
    dragging: false
  };

  window.addEventListener("mousemove", handleNumericInputPointerMove, { passive: false });
  window.addEventListener("mouseup", finishNumericInputDrag, { once: true });
}

export function handleNumericInputPointerMove(event) {
  const drag = numericInputDrag;
  if (!drag) {
    return;
  }

  const deltaX = event.clientX - drag.startX;
  if (!drag.dragging && Math.abs(deltaX) < 3) {
    return;
  }

  drag.dragging = true;
  event.preventDefault();
  drag.input.blur();
  window.getSelection?.()?.removeAllRanges();
  document.body.classList.add("is-numeric-input-dragging");
  drag.input.classList.add("is-numeric-dragging");
  const multiplier = event.shiftKey ? 10 : event.altKey ? 0.1 : 1;
  const nextValue = clamp(drag.startValue + deltaX * drag.step * multiplier, drag.min, drag.max);
  drag.input.value = formatNumericInputValue(nextValue, drag.decimals);
  dispatchNumericInputEvent(drag.input, "input");
}

export function finishNumericInputDrag(event) {
  const drag = numericInputDrag;
  if (!drag) {
    return;
  }

  window.removeEventListener("mousemove", handleNumericInputPointerMove);
  window.removeEventListener("mouseup", finishNumericInputDrag);
  document.body.classList.remove("is-numeric-input-dragging");
  drag.input.classList.remove("is-numeric-dragging");
  if (drag.dragging) {
    event?.preventDefault?.();
    drag.input.dataset.suppressNumericClick = "true";
    dispatchNumericInputEvent(drag.input, "change");
    window.setTimeout(() => {
      if (drag.input.dataset.suppressNumericClick === "true") {
        delete drag.input.dataset.suppressNumericClick;
      }
    }, 0);
  }

  numericInputDrag = null;
}

export function updateNumericInputHoverState(event) {
  if (numericInputDrag) {
    return;
  }

  const input = event.target instanceof Element ? event.target.closest("input[type=\"number\"]") : null;
  if (numericInputHover && numericInputHover !== input) {
    numericInputHover.classList.remove("is-numeric-text-zone");
    numericInputHover = null;
  }
  if (!input || input.disabled || input.readOnly) {
    return;
  }

  const overValue = isPointerOverNumericInputValue(input, event.clientX);
  input.classList.toggle("is-numeric-text-zone", overValue);
  numericInputHover = input;
}

export function isPointerOverNumericInputValue(input, clientX) {
  const value = String(input.value ?? "");
  if (!value) {
    return true;
  }

  const metrics = getInputTextMetrics(input, value);
  const bounds = resolveInputTextBounds(metrics);
  const hitSlop = 5;
  return clientX >= Math.max(metrics.contentLeft, bounds.start) - hitSlop &&
    clientX <= Math.min(metrics.contentRight, bounds.end) + hitSlop;
}

export function measureInputTextWidth(input, value) {
  const canvas = measureInputTextWidth.canvas || document.createElement("canvas");
  measureInputTextWidth.canvas = canvas;
  const context = canvas.getContext("2d");
  if (!context) {
    return String(value).length * 8;
  }

  const style = window.getComputedStyle(input);
  context.font = style.font || `${style.fontSize} ${style.fontFamily}`;
  return context.measureText(String(value)).width;
}

export function parseCssPixelValue(value) {
  const number = Number.parseFloat(value);
  return Number.isFinite(number) ? number : 0;
}

export function suppressNumericInputDragClick(event) {
  const input = event.target instanceof Element ? event.target.closest("input[type=\"number\"]") : null;
  if (input?.dataset.suppressNumericClick === "true") {
    event.preventDefault();
    event.stopPropagation();
    delete input.dataset.suppressNumericClick;
  }
}

export function dispatchNumericInputEvent(input, type) {
  const event = type === "input" && typeof InputEvent === "function"
    ? new InputEvent("input", { bubbles: true, inputType: "insertReplacementText" })
    : new Event(type, { bubbles: true });
  input.dispatchEvent(event);
}

export function getNumericInputStep(input) {
  const stepAttribute = input.getAttribute("step");
  if (stepAttribute && stepAttribute !== "any") {
    const step = Number(stepAttribute);
    if (Number.isFinite(step) && step > 0) {
      return step;
    }
  }

  const decimals = getDecimalPlaces(input.value);
  return decimals > 0 ? 10 ** -Math.min(decimals, 4) : 1;
}

export function getNumericInputPrecision(input, step) {
  return Math.max(
    getDecimalPlaces(step),
    getDecimalPlaces(input.value),
    getDecimalPlaces(input.min),
    getDecimalPlaces(input.max)
  );
}

export function parseOptionalNumber(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

export function getDecimalPlaces(value) {
  const text = String(value ?? "");
  if (!text || text === "Infinity" || text === "-Infinity") {
    return 0;
  }

  const normalized = text.toLowerCase();
  if (normalized.includes("e")) {
    const [coefficient, exponent = "0"] = normalized.split("e");
    const decimalPlaces = (coefficient.split(".")[1] || "").length;
    return Math.max(0, decimalPlaces - Number(exponent));
  }

  return (text.split(".")[1] || "").length;
}

export function formatNumericInputValue(value, decimals) {
  if (!Number.isFinite(value)) {
    return "";
  }

  const fixedDecimals = Math.min(Math.max(0, decimals), 6);
  if (fixedDecimals === 0) {
    return String(Math.round(value));
  }

  return value.toFixed(fixedDecimals).replace(/\.?0+$/, "");
}

function getInputTextMetrics(input, value) {
  const rect = input.getBoundingClientRect();
  const style = window.getComputedStyle(input);
  const borderLeft = parseCssPixelValue(style.borderLeftWidth);
  const borderRight = parseCssPixelValue(style.borderRightWidth);
  const paddingLeft = parseCssPixelValue(style.paddingLeft);
  const paddingRight = parseCssPixelValue(style.paddingRight);

  return {
    align: style.textAlign,
    contentLeft: rect.left + borderLeft + paddingLeft,
    contentRight: rect.right - borderRight - paddingRight,
    scrollLeft: Number(input.scrollLeft || 0),
    textWidth: measureInputTextWidth(input, value)
  };
}

function resolveInputTextBounds(metrics) {
  const resolveBounds = TEXT_BOUNDS_BY_ALIGN[metrics.align] || getLeftAlignedTextBounds;
  return resolveBounds(metrics);
}

function getLeftAlignedTextBounds(metrics) {
  const start = metrics.contentLeft - metrics.scrollLeft;
  return {
    start,
    end: start + metrics.textWidth
  };
}

function getRightAlignedTextBounds(metrics) {
  const end = metrics.contentRight + metrics.scrollLeft;
  return {
    start: end - metrics.textWidth,
    end
  };
}

function getCenteredTextBounds(metrics) {
  const center = metrics.contentLeft + (metrics.contentRight - metrics.contentLeft) / 2 - metrics.scrollLeft;
  return {
    start: center - metrics.textWidth / 2,
    end: center + metrics.textWidth / 2
  };
}
