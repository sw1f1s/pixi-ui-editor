import { els } from "./deps.js?v=20260620-designless";

let inspectorAppendTarget = null;

export function appendInspectorControl(control) {
  (inspectorAppendTarget || els.inspectorForm).append(control);
}

export function withInspectorAppendTarget(target, renderControls) {
  const previousTarget = inspectorAppendTarget;
  inspectorAppendTarget = target;
  try {
    renderControls();
  } finally {
    inspectorAppendTarget = previousTarget;
  }
}
