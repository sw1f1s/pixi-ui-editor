import {
  createManifestIndexes,
  findManifestEntry,
  getLocaleDictionary
} from "../document.js";
import { createPlainPixiAdapter } from "../plain-adapter.js";
import { mergeData } from "../helpers.js";
import {
  createRenderContext,
  createRendererAdapter
} from "../renderer-factory.js";
import { buildRenderTreeNode } from "../render-tree.js";
import { MountedScreen } from "./mounted-screen.js";
import { getScreenViewport } from "./viewport.js";

export class PixiUiRuntime {
  constructor(options = {}) {
    this.app = options.app;
    this.adapter = createRendererAdapter(options.adapter || createPlainPixiAdapter());
    this.manifest = options.manifest;
    this.locale = options.locale || options.manifest?.locales?.[0]?.id || "default";
    this.theme = options.theme || "default";
    this.data = options.data || {};
    this.mountedScreens = new Set();
    this.indexes = createManifestIndexes(this.manifest);
    this.assetLoadResult = options.assetLoadResult || null;
    if (this.assetLoadResult?.assetsById) {
      this.indexes.assetsById = this.assetLoadResult.assetsById;
    }
  }

  async mountScreen(screenRef, options = {}) {
    const screen = findManifestEntry(this.manifest.screens, screenRef, "screen");
    const data = mergeData(this.data, options.data);
    const stateByNodeId = new Map();
    const context = this.createRenderContext({ data, stateByNodeId, viewport: options.viewport || getScreenViewport(screen) });
    const rootNode = screen.rootNode || screen.root || screen.node;
    const renderTree = buildRenderTreeNode(rootNode, context, {
      path: screen.id,
      fallbackId: `${screen.id}.root`
    });
    const hostContainer = options.container || this.app?.stage;

    if (hostContainer) {
      this.adapter.addChild(hostContainer, renderTree.displayObject);
    }

    const mountedScreen = new MountedScreen({
      runtime: this,
      screen,
      hostContainer,
      renderTree,
      context,
      stateByNodeId
    });

    this.mountedScreens.add(mountedScreen);
    return mountedScreen;
  }

  updateData(patch = {}) {
    this.data = mergeData(this.data, patch);

    for (const mountedScreen of this.mountedScreens) {
      mountedScreen.updateData(patch);
    }
  }

  setLocale(locale) {
    this.locale = locale;

    for (const mountedScreen of this.mountedScreens) {
      mountedScreen.context.localeTable = getLocaleDictionary(this.manifest, locale);
      mountedScreen.refresh();
    }
  }

  setTheme(theme) {
    this.theme = theme;

    for (const mountedScreen of this.mountedScreens) {
      mountedScreen.context.theme = theme;
      mountedScreen.refresh();
    }
  }

  getScreen(screenRef) {
    return findManifestEntry(this.manifest.screens, screenRef, "screen");
  }

  getComponent(componentRef) {
    return findManifestEntry(this.manifest.components, componentRef, "component");
  }

  destroy() {
    for (const mountedScreen of [...this.mountedScreens]) {
      mountedScreen.destroy();
    }
  }

  createRenderContext(overrides = {}) {
    return createRenderContext({
      adapter: this.adapter,
      manifest: this.manifest,
      assetsById: this.indexes.assetsById,
      componentsById: this.indexes.componentsById,
      locale: this.locale,
      localeTable: getLocaleDictionary(this.manifest, this.locale),
      theme: this.theme,
      data: this.data,
      viewport: undefined,
      stateByNodeId: new Map(),
      ...overrides
    });
  }
}
