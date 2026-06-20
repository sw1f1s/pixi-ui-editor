import { componentsOf } from "../helpers.js";
import { CONTROL_COMPONENT_TYPES } from "./types.js";
import { normalizeProgressValue, readBoolean } from "./control-shared.js";

const CONTROL_PROP_RESOLVERS = {
  button: resolveButtonComponentProps,
  toggle: resolveSelectableComponentProps,
  checkbox: resolveSelectableComponentProps,
  radio: resolveSelectableComponentProps,
  slider: resolveInteractiveComponentProps,
  input: resolveInteractiveComponentProps,
  textinput: resolveInteractiveComponentProps,
  dropdown: resolveInteractiveComponentProps,
  progressbar: resolveProgressComponentProps,
  mask: passthroughComponentProps("mask"),
  repeater: passthroughComponentProps("repeater"),
  scroll: passthroughComponentProps("scroll"),
  scrollview: passthroughComponentProps("scroll")
};

const TEXT_ENTRY_CONTROLS = new Set(["input", "textinput"]);

export function getNodeControlProps(node = {}) {
  const controls = {};
  const props = {};

  for (const component of componentsOf(node)) {
    const type = String(component.type || "").toLowerCase();
    if (!CONTROL_COMPONENT_TYPES.has(type)) {
      continue;
    }

    const componentProps = component.props || {};
    controls[type] = componentProps;
    Object.assign(props, CONTROL_PROP_RESOLVERS[type]?.(componentProps, type) || {});
  }

  return Object.keys(controls).length ? { ...props, controls } : props;
}

function resolveButtonComponentProps(props = {}) {
  return {
    interactive: props.interactive ?? true,
    eventMode: props.eventMode || "static",
    cursor: props.cursor || "pointer",
    ...props
  };
}

function resolveSelectableComponentProps(props = {}, type) {
  return {
    ...props,
    interactive: props.interactive ?? true,
    eventMode: props.eventMode || "static",
    cursor: props.cursor || "pointer",
    role: props.role || type,
    checked: readBoolean(props.checked ?? props.selected ?? props.on ?? props.value)
  };
}

function resolveInteractiveComponentProps(props = {}, type) {
  return {
    ...props,
    interactive: props.interactive ?? true,
    eventMode: props.eventMode || "static",
    cursor: props.cursor || (TEXT_ENTRY_CONTROLS.has(type) ? "text" : "pointer"),
    role: props.role || type
  };
}

function resolveProgressComponentProps(props = {}) {
  return {
    progress: normalizeProgressValue(props.value ?? props.progress ?? props.current, props)
  };
}

function passthroughComponentProps(key) {
  return (props = {}) => ({ [key]: props });
}
