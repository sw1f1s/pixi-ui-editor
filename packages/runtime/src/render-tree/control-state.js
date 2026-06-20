import {
  childrenOf,
  getNodeComponent
} from "../helpers.js";
import { CONTROL_SYNCERS } from "./controls/syncers.js";

export function applyControlStateToNode(node = {}) {
  let next = {
    ...node,
    children: childrenOf(node).map((child) => applyControlStateToNode(child))
  };

  for (const { types, sync } of CONTROL_SYNCERS) {
    const props = getFirstEnabledControlProps(next, types);
    if (props) {
      next = sync(next, props);
    }
  }

  return next;
}

function getFirstEnabledControlProps(node, types) {
  for (const type of types) {
    const props = getNodeComponent(node, type)?.props || null;
    if (props) {
      return props;
    }
  }
  return null;
}
