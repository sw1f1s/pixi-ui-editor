import {
  buildRenderTreeIndex,
  buildRenderTreeNode as buildTreeNode,
  refreshRenderTree
} from "./render-tree.js";
import { createPlainPixiAdapter } from "./plain-adapter.js";
import { asArray } from "./helpers.js";
import { getLocaleDictionary } from "./document.js";

export function createRendererAdapter(adapter = {}) {
  const defaults = createPlainPixiAdapter();
  const source = adapter || {};

  return {
    ...defaults,
    ...source,
    createContainer: source.createContainer || defaults.createContainer,
    createSprite: source.createSprite || defaults.createSprite,
    createText: source.createText || defaults.createText,
    createGraphics: source.createGraphics || source.createContainer || defaults.createGraphics,
    addChild: source.addChild || defaults.addChild,
    removeChild: source.removeChild || defaults.removeChild,
    setTransform: source.setTransform || defaults.setTransform,
    setStyle: source.setStyle || defaults.setStyle,
    setProps: source.setProps || defaults.setProps,
    setText: source.setText || defaults.setText,
    setTexture: source.setTexture || defaults.setTexture,
    setVisible: source.setVisible || defaults.setVisible,
    loadTexture: source.loadTexture || defaults.loadTexture,
    destroy: source.destroy || defaults.destroy
  };
}

export function createRenderContext(options = {}) {
  const manifest = options.manifest || {};
  const locale = options.locale || manifest.locales?.[0]?.id || "default";

  return {
    adapter: createRendererAdapter(options.adapter || createPlainPixiAdapter()),
    manifest,
    assetsById: normalizeEntryMap(options.assetsById, options.assets || manifest.assets),
    componentsById: normalizeEntryMap(options.componentsById, options.components || manifest.components),
    locale,
    localeTable: options.localeTable || getLocaleDictionary(manifest, locale),
    theme: options.theme || "default",
    data: options.data || {},
    viewport: options.viewport,
    stateByNodeId: options.stateByNodeId || new Map()
  };
}

export function createRendererFactory(defaultOptions = {}) {
  const defaultAdapter = defaultOptions.adapter ? createRendererAdapter(defaultOptions.adapter) : undefined;

  function createContext(options = {}) {
    return createRenderContext({
      ...defaultOptions,
      ...options,
      adapter: options.adapter || defaultAdapter || defaultOptions.adapter
    });
  }

  function buildNode(rootNode, options = {}, buildOptions = {}) {
    const context = options.context || createContext(options);
    const renderTree = buildTreeNode(rootNode, context, buildOptions);
    return createRendererMount(renderTree, context);
  }

  function buildRenderTreeNode(rootNode, contextOrOptions = {}, buildOptions = {}) {
    const context = contextOrOptions.adapter
      ? contextOrOptions
      : contextOrOptions.context || createContext(contextOrOptions);
    return buildTreeNode(rootNode, context, buildOptions);
  }

  function buildScreen(screen, options = {}) {
    const rootNode = screen?.rootNode || screen?.root || screen?.node;
    const context = options.context || createContext(options);
    const renderTree = buildTreeNode(rootNode, context, {
      path: screen?.id,
      fallbackId: `${screen?.id || "screen"}.root`,
      ...(options.buildOptions || {})
    });

    return {
      screen,
      ...createRendererMount(renderTree, context)
    };
  }

  return {
    createAdapter: createRendererAdapter,
    createContext,
    buildRenderTreeNode,
    buildNode,
    buildScreen,
    createRenderTree: buildRenderTreeNode
  };
}

function createRendererMount(renderTree, context) {
  return {
    renderTree,
    context,
    index: buildRenderTreeIndex(renderTree),
    refresh(overrides = {}) {
      Object.assign(context, overrides);
      refreshRenderTree(renderTree, context);
      this.index = buildRenderTreeIndex(renderTree);
      return renderTree;
    }
  };
}

function normalizeEntryMap(existingMap, entries) {
  if (existingMap instanceof Map) {
    return existingMap;
  }

  const map = new Map();
  for (const entry of asArray(entries)) {
    if (entry?.id !== undefined && entry?.id !== null) {
      map.set(String(entry.id), entry);
    }
  }
  return map;
}
