import {
  applyCommand,
  applyCommandPatch,
  collectNodes,
  createCommandPatch,
  findNodeInProject,
  NODE_COMPONENT_TYPE_LIST,
  NODE_TYPE_LIST,
  validateProject
} from "../../core/src/index.js";

import { resourceCatalog, toolCatalog } from "./catalog.js";

export function createEditorMcpContext(options = {}) {
  return {
    project: options.project || null,
    selection: options.selection || [],
    validation: [],
    auditLog: []
  };
}

export function readResource(context, uri) {
  const project = context.project;
  const validation = validateProject(project);
  context.validation = validation;

  switch (uri) {
    case "pixi-ui://project/manifest":
      return jsonResource(uri, summarizeProject(project, validation));
    case "pixi-ui://project/schema":
      return jsonResource(uri, {
        schemaVersion: project?.schemaVersion,
        nodeTypes: NODE_TYPE_LIST,
        nodeComponentTypes: NODE_COMPONENT_TYPE_LIST,
        commandPatchKind: "pixi-ui-command-patch"
      });
    case "pixi-ui://pages":
      return jsonResource(uri, (project?.pages || []).map((page) => ({
        id: page.id,
        name: page.name,
        canvas: page.canvas,
        rootId: page.root?.id
      })));
    case "pixi-ui://components":
      return jsonResource(uri, project?.components || []);
    case "pixi-ui://assets/manifest":
      return jsonResource(uri, project?.assets || []);
    case "pixi-ui://tokens":
      return jsonResource(uri, project?.tokens || {});
    case "pixi-ui://themes":
      return jsonResource(uri, project?.themes || []);
    case "pixi-ui://style-libraries":
      return jsonResource(uri, project?.styleLibraries || []);
    case "pixi-ui://selection":
      return jsonResource(uri, describeSelection(context));
    case "pixi-ui://validation/latest":
      return jsonResource(uri, validation);
    case "pixi-ui://editor/capabilities":
      return jsonResource(uri, {
        resources: resourceCatalog.map((resource) => resource.uri),
        tools: toolCatalog.map((tool) => tool.name),
        safety: {
          mutationsUseCommandBus: true,
          dryRunDefault: true,
          returnsStructuredDiff: true
        }
      });
    default:
      if (uri.startsWith("pixi-ui://pages/")) {
        const pageId = uri.split("/").at(-1);
        const page = project?.pages?.find((candidate) => candidate.id === pageId);
        return jsonResource(uri, page || null);
      }
      if (uri.startsWith("pixi-ui://components/")) {
        const componentId = uri.split("/").at(-1);
        const component = project?.components?.find((candidate) => candidate.id === componentId);
        return jsonResource(uri, component || null);
      }
      if (uri.startsWith("pixi-ui://style-libraries/")) {
        const libraryId = uri.split("/").at(-1);
        const library = project?.styleLibraries?.find((candidate) => candidate.id === libraryId);
        return jsonResource(uri, library || null);
      }
      throw new Error(`Unknown resource "${uri}".`);
  }
}

export function callEditorTool(context, name, args = {}) {
  const auditEntry = {
    name,
    args,
    calledAt: new Date().toISOString()
  };
  context.auditLog.push(auditEntry);

  switch (name) {
    case "project.get_summary":
      return ok("Project summary generated.", summarizeProject(context.project, validateProject(context.project)));
    case "project.validate": {
      const validation = validateProject(context.project);
      context.validation = validation;
      return ok("Project validation completed.", { validation }, { validation });
    }
    case "project.search":
      return ok("Search completed.", searchProject(context.project, args.query || "", args));
    case "project.apply_patch":
      return applyCommandPatchTool(context, args);
    case "page.create":
      return commandTool(context, {
        type: "project.create_page",
        args,
        meta: { source: "mcp", label: "Create page from MCP" }
      });
    case "page.delete":
      return commandTool(context, {
        type: "project.delete_page",
        args,
        meta: { source: "mcp", label: "Delete page from MCP" }
      });
    case "selection.get":
      return ok("Selection returned.", { nodeIds: context.selection });
    case "selection.set":
      context.selection = [...(args.nodeIds || [])];
      return ok("Selection updated.", describeSelection(context));
    case "selection.describe":
      return ok("Selection described.", describeSelection(context));
    case "page.update":
      return commandTool(context, {
        type: "page.update",
        args,
        meta: { source: "mcp", label: "Update page from MCP" }
      });
    case "project.set_token":
    case "project.delete_token":
    case "project.create_theme":
    case "project.update_theme":
    case "project.delete_theme":
    case "project.create_style_library":
    case "project.update_style_library":
    case "project.apply_style_library":
    case "project.delete_style_library":
      return commandTool(context, {
        type: name,
        args,
        meta: { source: "mcp", label: "Update design system from MCP" }
      });
    case "node.create":
      return commandTool(context, {
        type: "node.create",
        args,
        meta: { source: "mcp", label: "Create node from MCP" }
      });
    case "node.update_props":
      return commandTool(context, {
        type: "node.update_props",
        args,
        meta: { source: "mcp", label: "Update node from MCP" }
      });
    case "node.delete":
      return commandTool(context, {
        type: "node.delete",
        args,
        meta: { source: "mcp", label: "Delete node from MCP" }
      });
    case "component.create":
      return commandTool(context, {
        type: "component.create",
        args,
        meta: { source: "mcp", label: "Create component from MCP" }
      });
    case "component.instantiate":
      return commandTool(context, {
        type: "component.instantiate",
        args,
        meta: { source: "mcp", label: "Instantiate component from MCP" }
      });
    case "component.rename":
    case "component.delete":
    case "component.detach_instance":
      return commandTool(context, {
        type: name,
        args,
        meta: { source: "mcp", label: "Update component from MCP" }
      });
    case "component.find_usages":
      return ok("Component usages found.", findComponentUsages(context.project, args.componentId || args.id));
    case "component.create_variant":
    case "component.update_variant":
    case "component.delete_variant":
    case "component.update_exposed_props":
      return commandTool(context, {
        type: name,
        args,
        meta: { source: "mcp", label: "Update component library from MCP" }
      });
    case "node.find":
      return ok("Nodes found.", searchNodes(context.project, args));
    case "layout.analyze":
      return ok("Layout analysis completed.", analyzeLayout(context.project));
    case "render.screenshot":
      return ok("Screenshot request prepared.", {
        uri: `pixi-ui://screenshots/${args.pageId}/${args.profile || "default"}`,
        pageId: args.pageId,
        profile: args.profile || "default",
        status: "renderer-not-attached-yet"
      });
    case "runtime.generate_integration_code":
      return ok("Runtime integration code generated.", {
        language: "ts",
        code: [
          "import { createPixiUiRuntime } from '@pixi-ui-editor/runtime';",
          "",
          "const ui = await createPixiUiRuntime({ app, manifestUrl: '/ui/ui.manifest.json' });",
          "const screen = await ui.mountScreen('shop', { container: app.stage, data: {} });"
        ].join("\n")
      });
    default:
      throw new Error(`Unknown MCP tool "${name}".`);
  }
}

function applyCommandPatchTool(context, args) {
  const dryRun = args.dryRun !== false;
  const result = applyCommandPatch(context.project, args.patch);
  if (!dryRun) {
    context.project = result.project;
  }

  return ok(dryRun ? "Command patch dry-run completed." : "Command patch applied.", {
    dryRun,
    patch: result.patch,
    validation: result.validation,
    project: dryRun ? undefined : summarizeProject(context.project, result.validation)
  }, {
    patch: result.patch,
    validation: result.validation
  });
}

function commandTool(context, command) {
  const result = applyCommand(context.project, command);
  context.project = result.project;
  context.validation = result.validation;
  return ok("Command applied.", {
    patch: createCommandPatch([command], command.meta?.label),
    validation: result.validation
  }, {
    patch: result.patch,
    validation: result.validation
  });
}

function summarizeProject(project, validation = []) {
  const nodeCount = (project?.pages || []).reduce((count, page) => count + collectNodes(page.root).length, 0);
  return {
    id: project?.project?.id || null,
    name: project?.project?.name || null,
    schemaVersion: project?.schemaVersion || null,
    pages: project?.pages?.length || 0,
    components: project?.components?.length || 0,
    assets: project?.assets?.length || 0,
    nodes: nodeCount,
    validation: {
      errors: validation.filter((message) => message.severity === "error").length,
      warnings: validation.filter((message) => message.severity === "warning").length
    }
  };
}

function describeSelection(context) {
  return {
    nodeIds: context.selection,
    nodes: context.selection.map((nodeId) => {
      const found = findNodeInProject(context.project, nodeId);
      return found ? {
        id: found.node.id,
        name: found.node.name,
        type: found.node.type,
        pageId: found.page.id,
        parentId: found.node.parentId
      } : {
        id: nodeId,
        missing: true
      };
    })
  };
}

function searchProject(project, query, args = {}) {
  const normalized = String(query || "").toLowerCase();
  return {
    pages: (project?.pages || []).filter((page) => page.name.toLowerCase().includes(normalized)),
    nodes: searchNodes(project, { query, type: args.type }),
    components: (project?.components || []).filter((component) => JSON.stringify(component).toLowerCase().includes(normalized)),
    assets: (project?.assets || []).filter((asset) => JSON.stringify(asset).toLowerCase().includes(normalized))
  };
}

function searchNodes(project, args = {}) {
  const normalized = String(args.query || "").toLowerCase();
  const results = [];
  for (const page of project?.pages || []) {
    for (const { node, path } of collectNodes(page.root)) {
      const text = `${node.name} ${node.id} ${node.type} ${JSON.stringify(node.props || {})}`.toLowerCase();
      const matchesQuery = !normalized || text.includes(normalized);
      const matchesType = !args.type || node.type === args.type;
      if (matchesQuery && matchesType) {
        results.push({
          pageId: page.id,
          nodeId: node.id,
          name: node.name,
          type: node.type,
          path
        });
      }
    }
  }
  return results;
}

function findComponentUsages(project, componentId) {
  const usages = [];
  if (!componentId) {
    return usages;
  }

  for (const page of project?.pages || []) {
    for (const { node, path } of collectNodes(page.root)) {
      if (isComponentInstanceUsage(node, componentId)) {
        usages.push({
          scope: "page",
          pageId: page.id,
          nodeId: node.id,
          name: node.name,
          path
        });
      }
    }
  }

  for (const component of project?.components || []) {
    for (const { node, path } of collectNodes(component.rootNode)) {
      if (isComponentInstanceUsage(node, componentId)) {
        usages.push({
          scope: "component",
          componentId: component.id,
          nodeId: node.id,
          name: node.name,
          path
        });
      }
    }
  }
  return usages;
}

function isComponentInstanceUsage(node, componentId) {
  return node?.type === "componentInstance"
    && (node.props?.componentId || node.componentId || node.editorMeta?.componentId) === componentId;
}

function analyzeLayout(project) {
  const warnings = [];
  for (const page of project?.pages || []) {
    for (const { node } of collectNodes(page.root)) {
      if (node.transform?.width <= 0 || node.transform?.height <= 0) {
        warnings.push({
          code: "layout.nonPositiveSize",
          nodeId: node.id,
          message: `Node "${node.name}" has non-positive size.`
        });
      }
      if (hasNodeComponent(node, "button") && (node.transform?.width < 88 || node.transform?.height < 44)) {
        warnings.push({
          code: "layout.touchTargetSmall",
          nodeId: node.id,
          message: `Button component on "${node.name}" is smaller than the recommended touch target.`
        });
      }
    }
  }
  return { warnings };
}

function hasNodeComponent(node, componentType) {
  const targetType = String(componentType || "").toLowerCase();
  return (node?.components || []).some((component) => component?.enabled !== false && String(component?.type || "").toLowerCase() === targetType);
}

function ok(summary, data = {}, extras = {}) {
  return {
    content: [
      {
        type: "text",
        text: summary
      }
    ],
    structuredContent: {
      summary,
      data,
      ...extras
    },
    isError: false
  };
}

function jsonResource(uri, data) {
  return {
    uri,
    mimeType: "application/json",
    text: JSON.stringify(data, null, 2)
  };
}
