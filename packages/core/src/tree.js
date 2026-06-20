export function walkNodes(root, visitor, path = []) {
  if (!root) {
    return;
  }

  visitor(root, path);
  for (const child of root.children || []) {
    walkNodes(child, visitor, [...path, root.id]);
  }
}

export function collectNodes(root) {
  const nodes = [];
  walkNodes(root, (node, path) => {
    nodes.push({ node, path });
  });
  return nodes;
}

export function findNodeInProject(project, nodeId) {
  for (const page of project.pages || []) {
    const found = findNode(page.root, nodeId, []);
    if (found) {
      return {
        page,
        node: found.node,
        parent: found.parent,
        path: found.path
      };
    }
  }

  for (const component of project.components || []) {
    const found = findNode(component.rootNode, nodeId, []);
    if (found) {
      return {
        page: {
          id: `component:${component.id}`,
          name: component.name || component.id,
          root: component.rootNode
        },
        component,
        node: found.node,
        parent: found.parent,
        path: found.path
      };
    }
  }
  return null;
}

export function findNode(root, nodeId, path = [], parent = null) {
  if (!root) {
    return null;
  }

  if (root.id === nodeId) {
    return {
      node: root,
      parent,
      path: [...path, root.id]
    };
  }

  for (const child of root.children || []) {
    const found = findNode(child, nodeId, [...path, root.id], root);
    if (found) {
      return found;
    }
  }

  return null;
}

export function removeNode(root, nodeId) {
  if (!root?.children?.length) {
    return null;
  }

  const index = root.children.findIndex((child) => child.id === nodeId);
  if (index >= 0) {
    const [removed] = root.children.splice(index, 1);
    return removed;
  }

  for (const child of root.children) {
    const removed = removeNode(child, nodeId);
    if (removed) {
      return removed;
    }
  }

  return null;
}

export function createNodePath(project, nodeId) {
  const found = findNodeInProject(project, nodeId);
  if (!found) {
    return null;
  }

  return [found.page.name, ...found.path.map((id) => {
    const node = findNode(found.page.root, id)?.node;
    return node?.name || id;
  })].join(" / ");
}
