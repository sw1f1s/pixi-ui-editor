import {
  coalesce,
  getNodeTypeBucket,
  isObject
} from "../helpers.js";
import {
  GRAPHICS_TYPES,
  RENDER_COMPONENT_TYPES,
  SPRITE_TYPES,
  TEXT_TYPES
} from "./types.js";
import { applySpriteFrameDefaults, resolveAsset } from "./assets.js";
import { getNodeControlProps } from "./control-props.js";
import { applyNodeEffectProps } from "./effects.js";
import { resolveTransform } from "./layout.js";
import { materializeNode } from "./materialization.js";
import { resolveNodeText } from "./text.js";

const DISPLAY_FACTORIES = [
  {
    matches: (node) => hasDeclaredNodeComponents(node),
    create: (adapter, payload) => adapter.createContainer(payload)
  },
  {
    matches: (_node, type) => TEXT_TYPES.has(type),
    create: (adapter, payload) => adapter.createText(payload)
  },
  {
    matches: (_node, type) => SPRITE_TYPES.has(type),
    create: (adapter, payload) => adapter.createSprite(payload)
  },
  {
    matches: (_node, type) => GRAPHICS_TYPES.has(type),
    create: (adapter, payload) => adapter.createGraphics(payload)
  }
];

const DISPLAY_APPLIERS = [
  {
    matches: (type) => TEXT_TYPES.has(type),
    apply: ({ adapter, displayObject, node, context }) => {
      adapter.setText(displayObject, resolveNodeText(node, context), node);
    }
  },
  {
    matches: (type) => SPRITE_TYPES.has(type),
    apply: ({ adapter, displayObject, node, asset }) => {
      adapter.setTexture(displayObject, asset, node);
    }
  }
];

export function createDisplayObject(node, context, path) {
  const asset = resolveAsset(node, context);
  const displayNode = applySpriteFrameDefaults(node, asset);
  const type = getNodeTypeBucket(displayNode);
  const payload = {
    node: displayNode,
    path,
    asset,
    text: resolveNodeText(displayNode, context),
    context
  };
  const factory = DISPLAY_FACTORIES.find(({ matches }) => matches(node, type));
  return (factory || FALLBACK_FACTORY).create(context.adapter, payload);
}

export function applyNodeToDisplay(renderNode, context) {
  const materialized = materializeNode(renderNode.sourceNode, context);
  const asset = resolveAsset(materialized, context);
  const displayNode = applySpriteFrameDefaults(materialized, asset);
  const displayProps = applyNodeEffectProps(displayNode, {
    ...(displayNode.props || {}),
    ...getNodeControlProps(displayNode)
  });
  const displayNodeWithProps = {
    ...displayNode,
    props: displayProps
  };
  const transform = resolveTransform(materialized, {
    ...context,
    parentFrame: renderNode.parentLayoutFrame,
    parentIsRoot: renderNode.parentIsRoot,
    layoutFrameOverride: renderNode.layoutFrameOverride
  });
  const active = coalesce(materialized.active, materialized.enabled, materialized.props?.active, materialized.props?.enabled, true);
  const visible = active !== false && coalesce(materialized.visible, materialized.style?.visible, materialized.props?.visible, true) !== false;

  renderNode.resolvedTransform = transform;
  context.adapter.setTransform(renderNode.displayObject, transform, displayNodeWithProps);
  context.adapter.setStyle(renderNode.displayObject, displayNode.style || {}, displayNodeWithProps);
  context.adapter.setProps(renderNode.displayObject, displayProps, displayNodeWithProps);
  context.adapter.setVisible(renderNode.displayObject, visible, displayNodeWithProps);

  const type = getNodeTypeBucket(displayNodeWithProps);
  for (const { matches, apply } of DISPLAY_APPLIERS) {
    if (matches(type)) {
      apply({
        adapter: context.adapter,
        displayObject: renderNode.displayObject,
        node: displayNodeWithProps,
        context,
        asset
      });
    }
  }

  return renderNode.displayObject;
}

function hasDeclaredNodeComponents(node) {
  return Array.isArray(node?.components) && node.components.some((component) => {
    if (!isObject(component)) {
      return false;
    }
    const type = String(component.type || component.kind || component.id || "").toLowerCase();
    return RENDER_COMPONENT_TYPES.has(type);
  });
}

const FALLBACK_FACTORY = {
  create: (adapter, payload) => adapter.createContainer(payload)
};
