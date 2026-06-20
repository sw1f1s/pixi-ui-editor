export const MCP_VERSION = "2025-06-18";

export const resourceCatalog = [
  resource("pixi-ui://project/manifest", "Project Manifest", "Project metadata, counts and export profiles."),
  resource("pixi-ui://project/schema", "Project Schema", "Current editor schema capabilities."),
  resource("pixi-ui://pages", "Pages", "List of pages and root nodes."),
  resource("pixi-ui://components", "Components", "Component library summary."),
  resource("pixi-ui://assets/manifest", "Asset Manifest", "Assets known to the project."),
  resource("pixi-ui://tokens", "Tokens", "Design tokens."),
  resource("pixi-ui://themes", "Themes", "Theme definitions."),
  resource("pixi-ui://style-libraries", "Style Libraries", "Reusable style library definitions."),
  resource("pixi-ui://selection", "Selection", "Current editor selection."),
  resource("pixi-ui://validation/latest", "Latest Validation", "Most recent validation report."),
  resource("pixi-ui://editor/capabilities", "Editor Capabilities", "Available node types, commands and safety rules.")
];

export const promptCatalog = [
  prompt("create_game_screen_from_brief", "Create a complete game UI screen from a product brief."),
  prompt("create_component_library", "Create reusable UI components, variants and tokens."),
  prompt("refactor_screen_to_components", "Refactor repeated UI nodes into reusable components."),
  prompt("fix_responsive_layout", "Fix layout issues across device profiles."),
  prompt("audit_ui_accessibility", "Audit touch targets, contrast metadata and navigation order."),
  prompt("audit_performance", "Audit draw calls, filters, texture usage and export risks."),
  prompt("create_interaction_flow", "Create event/action flows for screen interactions."),
  prompt("prepare_export_for_game", "Validate and prepare a UI bundle for game integration.")
];

export const toolCatalog = [
  tool("project.get_summary", "Project Summary", "Return project counts, pages and high-level health.", {}),
  tool("project.validate", "Validate Project", "Run structural validation on the current project.", {}),
  tool("project.search", "Search Project", "Search pages, nodes, components and assets.", {
    query: { type: "string" }
  }, ["query"]),
  tool("project.apply_patch", "Apply Command Patch", "Apply or dry-run a pixi-ui-command-patch.", {
    patch: { type: "object" },
    dryRun: { type: "boolean", default: true }
  }, ["patch"]),
  tool("page.create", "Create Page", "Create a new page through the command bus.", {
    id: { type: "string" },
    name: { type: "string" },
    width: { type: "number" },
    height: { type: "number" },
    orientation: { type: "string" },
    background: { type: "string" },
    safeArea: { type: "object" }
  }),
  tool("page.delete", "Delete Page", "Delete a page through the command bus.", {
    pageId: { type: "string" }
  }, ["pageId"]),
  tool("selection.get", "Get Selection", "Return selected node ids.", {}),
  tool("selection.set", "Set Selection", "Set selected node ids.", {
    nodeIds: { type: "array", items: { type: "string" } }
  }, ["nodeIds"]),
  tool("selection.describe", "Describe Selection", "Return details for selected nodes.", {}),
  tool("page.update", "Update Page", "Update page canvas, variables, editor metadata or root transform.", {
    pageId: { type: "string" },
    canvas: { type: "object" },
    variables: { type: "object" },
    editorMeta: { type: "object" },
    rootTransform: { type: "object" }
  }, ["pageId"]),
  tool("project.set_token", "Set Design Token", "Create or update a project design token.", {
    group: { type: "string" },
    name: { type: "string" },
    value: {}
  }, ["group", "name", "value"]),
  tool("project.delete_token", "Delete Design Token", "Delete a project design token.", {
    group: { type: "string" },
    name: { type: "string" }
  }, ["group", "name"]),
  tool("project.create_theme", "Create Theme", "Create a project theme.", {
    id: { type: "string" },
    name: { type: "string" },
    tokens: { type: "object" },
    values: { type: "object" },
    overrides: { type: "object" }
  }),
  tool("project.update_theme", "Update Theme", "Update a project theme.", {
    themeId: { type: "string" },
    id: { type: "string" },
    patch: { type: "object" },
    theme: { type: "object" }
  }),
  tool("project.delete_theme", "Delete Theme", "Delete a project theme.", {
    themeId: { type: "string" },
    id: { type: "string" }
  }),
  tool("project.create_style_library", "Create Style Library", "Create a style library record.", {
    id: { type: "string" },
    name: { type: "string" },
    tokens: { type: "object" },
    themes: { type: "array" },
    components: { type: "array" }
  }),
  tool("project.update_style_library", "Update Style Library", "Update a style library record.", {
    libraryId: { type: "string" },
    id: { type: "string" },
    patch: { type: "object" },
    library: { type: "object" }
  }),
  tool("project.apply_style_library", "Apply Style Library", "Merge a style library into project tokens, themes and components.", {
    libraryId: { type: "string" },
    id: { type: "string" }
  }),
  tool("project.delete_style_library", "Delete Style Library", "Delete a style library record.", {
    libraryId: { type: "string" },
    id: { type: "string" }
  }),
  tool("node.create", "Create Node", "Create a node under a parent through the command bus.", {
    parentId: { type: "string" },
    nodeType: { type: "string" },
    name: { type: "string" },
    active: { type: "boolean" },
    enabled: { type: "boolean" },
    props: { type: "object" },
    components: { type: "array" },
    layout: { type: "object" },
    transform: { type: "object" }
  }, ["parentId", "nodeType"]),
  tool("node.update_props", "Update Node", "Update node props, style, layout or transform.", {
    nodeId: { type: "string" },
    active: { type: "boolean" },
    enabled: { type: "boolean" },
    props: { type: "object" },
    components: { type: "array" },
    style: { type: "object" },
    layout: { type: "object" },
    transform: { type: "object" }
  }, ["nodeId"]),
  tool("node.delete", "Delete Node", "Delete a node and its children through the command bus.", {
    nodeId: { type: "string" }
  }, ["nodeId"]),
  tool("component.create", "Create Component", "Create a reusable component from a node or root node.", {
    id: { type: "string" },
    name: { type: "string" },
    nodeId: { type: "string" },
    rootNode: { type: "object" },
    description: { type: "string" },
    version: { type: "string" },
    variants: { type: "array" },
    exposedProps: { type: "object" }
  }),
  tool("component.instantiate", "Instantiate Component", "Create a component instance node under a parent.", {
    componentId: { type: "string" },
    parentId: { type: "string" },
    nodeId: { type: "string" },
    name: { type: "string" },
    transform: { type: "object" },
    props: { type: "object" },
    overrides: { type: "object" }
  }, ["componentId", "parentId"]),
  tool("component.rename", "Rename Component", "Rename a reusable component and its instances.", {
    componentId: { type: "string" },
    id: { type: "string" },
    name: { type: "string" }
  }, ["name"]),
  tool("component.delete", "Delete Component", "Delete a reusable component definition.", {
    componentId: { type: "string" },
    id: { type: "string" }
  }),
  tool("component.detach_instance", "Detach Component Instance", "Convert a component instance into editable regular nodes.", {
    nodeId: { type: "string" },
    instanceId: { type: "string" }
  }),
  tool("component.find_usages", "Find Component Usages", "Find page and component nodes that instantiate a component.", {
    componentId: { type: "string" },
    id: { type: "string" }
  }),
  tool("component.create_variant", "Create Component Variant", "Create a component variant with override data.", {
    componentId: { type: "string" },
    id: { type: "string" },
    name: { type: "string" },
    overrides: { type: "object" },
    variant: { type: "object" }
  }, ["componentId"]),
  tool("component.update_variant", "Update Component Variant", "Update a component variant.", {
    componentId: { type: "string" },
    variantId: { type: "string" },
    id: { type: "string" },
    patch: { type: "object" },
    variant: { type: "object" }
  }, ["componentId"]),
  tool("component.delete_variant", "Delete Component Variant", "Delete a component variant.", {
    componentId: { type: "string" },
    variantId: { type: "string" },
    id: { type: "string" }
  }, ["componentId"]),
  tool("component.update_exposed_props", "Update Exposed Props", "Replace a component exposed prop schema.", {
    componentId: { type: "string" },
    exposedProps: { type: "object" },
    propsSchema: { type: "object" }
  }, ["componentId"]),
  tool("node.find", "Find Nodes", "Find nodes by text query, type or name.", {
    query: { type: "string" },
    type: { type: "string" }
  }),
  tool("layout.analyze", "Analyze Layout", "Return layout warnings and responsive risks.", {}),
  tool("render.screenshot", "Render Screenshot", "Request a screenshot resource for a page/profile.", {
    pageId: { type: "string" },
    profile: { type: "string" }
  }, ["pageId"]),
  tool("runtime.generate_integration_code", "Generate Runtime Code", "Return starter code for integrating exported UI in a Pixi game.", {})
];

function resource(uri, name, description) {
  return {
    uri,
    name,
    title: name,
    description,
    mimeType: "application/json"
  };
}

function prompt(name, description) {
  return {
    name,
    title: name.replaceAll("_", " "),
    description,
    arguments: [
      {
        name: "focus",
        description: "Optional page, component or task focus.",
        required: false
      }
    ]
  };
}

function tool(name, title, description, properties = {}, required = []) {
  const mutableTools = new Set([
    "project.apply_patch",
    "selection.set",
    "page.create",
    "page.delete",
    "page.update",
    "project.set_token",
    "project.delete_token",
    "project.create_theme",
    "project.update_theme",
    "project.delete_theme",
    "project.create_style_library",
    "project.update_style_library",
    "project.apply_style_library",
    "project.delete_style_library",
    "node.create",
    "node.update_props",
    "node.delete",
    "component.create",
    "component.instantiate",
    "component.rename",
    "component.delete",
    "component.detach_instance",
    "component.create_variant",
    "component.update_variant",
    "component.delete_variant",
    "component.update_exposed_props"
  ]);
  return {
    name,
    title,
    description,
    inputSchema: {
      type: "object",
      properties,
      required,
      additionalProperties: true
    },
    outputSchema: {
      type: "object",
      properties: {
        summary: { type: "string" },
        data: { type: "object" },
        validation: { type: "array" },
        patch: { type: "object" }
      }
    },
    annotations: {
      destructiveHint: name.includes("delete") || name === "project.apply_patch",
      readOnlyHint: !mutableTools.has(name)
    }
  };
}
