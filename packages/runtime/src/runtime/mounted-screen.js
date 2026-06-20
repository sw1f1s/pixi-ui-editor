import { mergeData } from "../helpers.js";
import {
  buildRenderTreeIndex,
  destroyRenderTree,
  refreshRenderTree
} from "../render-tree.js";

export class MountedScreen {
  constructor(options) {
    this.runtime = options.runtime;
    this.screen = options.screen;
    this.hostContainer = options.hostContainer;
    this.renderTree = options.renderTree;
    this.context = options.context;
    this.stateByNodeId = options.stateByNodeId;
    this.destroyed = false;
    this.index = buildRenderTreeIndex(this.renderTree);
  }

  get root() {
    return this.renderTree.displayObject;
  }

  find(ref) {
    if (!ref) {
      return undefined;
    }

    const id = typeof ref === "string" ? ref : ref.id;
    const name = typeof ref === "string" ? ref : ref.name;
    const path = typeof ref === "string" ? ref : ref.path;

    return (
      this.index.byId.get(id) ||
      this.index.bySourceId.get(id) ||
      this.index.byPath.get(path) ||
      this.index.byName.get(name)?.[0]
    );
  }

  findById(id) {
    return this.find({ id });
  }

  findAllByName(name) {
    return this.index.byName.get(name) || [];
  }

  setState(ref, stateName) {
    const renderNode = this.find(ref);
    if (!renderNode) {
      throw new Error(`Cannot set state for unknown node: ${String(ref)}`);
    }

    this.stateByNodeId.set(renderNode.id, stateName);
    this.stateByNodeId.set(renderNode.sourceId, stateName);
    refreshRenderTree(renderNode, this.context);
    return renderNode;
  }

  clearState(ref) {
    const renderNode = this.find(ref);
    if (!renderNode) {
      return undefined;
    }

    this.stateByNodeId.delete(renderNode.id);
    this.stateByNodeId.delete(renderNode.sourceId);
    refreshRenderTree(renderNode, this.context);
    return renderNode;
  }

  updateData(patch = {}) {
    this.context.data = mergeData(this.context.data, patch);
    this.refresh();
    return this.context.data;
  }

  update(patch = {}) {
    return this.updateData(patch);
  }

  resize(viewport) {
    this.context.viewport = viewport;
    this.refresh();
  }

  refresh() {
    refreshRenderTree(this.renderTree, this.context);
  }

  destroy() {
    if (this.destroyed) {
      return;
    }

    if (this.hostContainer) {
      this.runtime.adapter.removeChild(this.hostContainer, this.renderTree.displayObject);
    }

    destroyRenderTree(this.renderTree, this.runtime.adapter);
    this.runtime.mountedScreens.delete(this);
    this.destroyed = true;
  }
}
