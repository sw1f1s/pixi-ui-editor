export function destroyRenderTree(renderNode, adapter) {
  if (!renderNode) {
    return;
  }

  adapter.destroy(renderNode.displayObject);
}

export function walkRenderTree(renderNode, visitor, depth = 0) {
  visitor(renderNode, { depth });

  for (const child of renderNode.children) {
    walkRenderTree(child, visitor, depth + 1);
  }
}

export function buildRenderTreeIndex(renderNode) {
  const byId = new Map();
  const bySourceId = new Map();
  const byPath = new Map();
  const byName = new Map();

  walkRenderTree(renderNode, (treeNode) => {
    byId.set(treeNode.id, treeNode);
    bySourceId.set(treeNode.sourceId, treeNode);
    byPath.set(treeNode.path, treeNode);

    if (!byName.has(treeNode.name)) {
      byName.set(treeNode.name, []);
    }
    byName.get(treeNode.name).push(treeNode);
  });

  return { byId, bySourceId, byPath, byName };
}
