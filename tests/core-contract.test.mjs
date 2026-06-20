import assert from "node:assert/strict";
import test from "node:test";

import {
  assertFunction,
  assertNoValidationErrors,
  assertOwnArray,
  importContractModule,
} from "./helpers/contract-loader.mjs";

const coreContract = {
  label: "@pixi-ui-editor/core",
  candidates: [
    "packages/core/src/index.mjs",
    "packages/core/src/index.js",
    "packages/core/index.mjs",
    "packages/core/index.js",
    "packages/core/dist/index.mjs",
    "packages/core/dist/index.js",
  ],
  requiredExports: [
    "PROJECT_SCHEMA_VERSION",
    "NODE_TYPES",
    "NODE_COMPONENT_TYPES",
    "createProject",
    "createPage",
    "createNode",
    "validateProject",
    "hasErrors",
    "applyCommand",
    "applyCommandPatch",
    "applySnapshotPatch",
  ],
};

test("core exposes project schema and command contract", async () => {
  const core = await importContractModule(coreContract);

  assertFunction(core.createProject, "createProject");
  assertFunction(core.createPage, "createPage");
  assertFunction(core.createNode, "createNode");
  assertFunction(core.validateProject, "validateProject");
  assertFunction(core.hasErrors, "hasErrors");
  assertFunction(core.applyCommand, "applyCommand");
  assertFunction(core.applyCommandPatch, "applyCommandPatch");
  assertFunction(core.applySnapshotPatch, "applySnapshotPatch");
});

test("core creates and validates component-backed graphics nodes", async () => {
  const core = await importContractModule(coreContract);
  const node = core.createNode({
    id: "node_composed_button",
    type: core.NODE_TYPES.graphics,
    name: "Composed Button",
    components: [
      {
        id: "fill",
        type: core.NODE_COMPONENT_TYPES.fill,
        props: { fill: "#33b8a5", radius: 16 },
      },
      {
        id: "label",
        type: core.NODE_COMPONENT_TYPES.text,
        props: { text: "PLAY", fontSize: 32, align: "center", verticalAlign: "middle" },
      },
      {
        id: "button",
        type: core.NODE_COMPONENT_TYPES.button,
        props: { cursor: "pointer" },
      },
    ],
  });

  assert.equal(node.type, core.NODE_TYPES.graphics);
  assert.equal(node.components.length, 3);
  assert.deepEqual(node.props, {});

  const document = core.createProject({
    id: "project_component_node",
    name: "Component Node Smoke",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  const page = core.createPage({ id: "page_component_node", name: "Component Node" });
  page.root.children.push({ ...node, parentId: page.root.id });
  document.pages.push(page);

  assertNoValidationErrors(core.validateProject(document), "validateProject.componentNode");
});

test("core accepts Phase 4 control components and reports usage", async () => {
  const core = await importContractModule(coreContract);
  const document = core.createProject({
    id: "project_phase4_controls",
    name: "Phase 4 Controls",
    createdAt: "2026-05-21T00:00:00.000Z",
  });
  const page = core.createPage({ id: "page_phase4_controls", name: "Controls" });
  page.root.children.push(core.createNode({
    id: "node_settings_toggle",
    parentId: page.root.id,
    type: core.NODE_TYPES.graphics,
    components: [
      { id: "toggle", type: core.NODE_COMPONENT_TYPES.toggle, props: { checked: true } },
      { id: "progress", type: core.NODE_COMPONENT_TYPES.progressBar, props: { value: 40, min: 0, max: 100 } },
      { id: "mask", type: core.NODE_COMPONENT_TYPES.mask, props: { shape: "rect" } },
      { id: "repeater", type: core.NODE_COMPONENT_TYPES.repeater, props: { dataPath: "items" } },
    ],
  }));
  document.pages.push(page);

  assertNoValidationErrors(core.validateProject(document), "validateProject.phase4Controls");
  const usage = core.collectComponentUsage(document);
  assert.deepEqual(usage.filter((entry) => entry.kind === "nodeComponent").map((entry) => entry.componentType), [
    "toggle",
    "progressBar",
    "mask",
    "repeater",
  ]);
});

test("core manages Phase 4 design-system records through commands", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_design_system",
    name: "Design System",
    createdAt: "2026-05-21T00:00:00.000Z",
  });

  document = core.applyCommand(document, {
    type: "project.set_token",
    args: { group: "colors", name: "accent", value: "#33b8a5" },
  }).project;
  document = core.applyCommand(document, {
    type: "project.create_theme",
    args: {
      id: "theme_dark",
      name: "Dark",
      tokens: { colors: { accent: "#7dd3fc" } },
    },
  }).project;
  document = core.applyCommand(document, {
    type: "project.create_style_library",
    args: {
      id: "library_hud",
      name: "HUD Library",
      tokens: { colors: { panel: "#111827" } },
    },
  }).project;
  document = core.applyCommand(document, {
    type: "component.create",
    args: {
      id: "component_badge",
      name: "Badge",
      rootNode: core.createNode({
        id: "badge_root",
        type: core.NODE_TYPES.graphics,
        transform: { x: 0, y: 0, width: 180, height: 64 },
      }),
    },
  }).project;
  document = core.applyCommand(document, {
    type: "component.create_variant",
    args: {
      componentId: "component_badge",
      id: "warning",
      name: "Warning",
      overrides: {
        badge_root: {
          components: [{
            id: "fill",
            type: core.NODE_COMPONENT_TYPES.fill,
            props: { fill: "{colors.accent}" },
          }],
        },
      },
    },
  }).project;
  document = core.applyCommand(document, {
    type: "component.update_exposed_props",
    args: {
      componentId: "component_badge",
      exposedProps: {
        label: { type: "string", path: "badge_label.components.text.props.text" },
      },
    },
  }).project;

  assert.equal(document.tokens.colors.accent, "#33b8a5");
  assert.equal(document.themes[0].id, "theme_dark");
  assert.equal(document.styleLibraries[0].id, "library_hud");
  assert.equal(document.components[0].variants[0].id, "warning");
  assert.equal(document.components[0].exposedProps.label.type, "string");
  assertNoValidationErrors(core.validateProject(document), "validateProject.designSystem");

  document = core.applyCommand(document, {
    type: "project.apply_style_library",
    args: { libraryId: "library_hud" },
  }).project;
  assert.equal(document.tokens.colors.panel, "#111827");

  document = core.applyCommand(document, {
    type: "component.update_variant",
    args: {
      componentId: "component_badge",
      variantId: "warning",
      patch: { name: "Alert" },
    },
  }).project;
  assert.equal(document.components[0].variants[0].name, "Alert");

  document = core.applyCommand(document, {
    type: "component.delete_variant",
    args: { componentId: "component_badge", variantId: "warning" },
  }).project;
  document = core.applyCommand(document, {
    type: "project.delete_token",
    args: { group: "colors", name: "accent" },
  }).project;
  document = core.applyCommand(document, {
    type: "project.delete_theme",
    args: { themeId: "theme_dark" },
  }).project;
  document = core.applyCommand(document, {
    type: "project.delete_style_library",
    args: { libraryId: "library_hud" },
  }).project;

  assert.deepEqual(document.components[0].variants, []);
  assert.equal(document.tokens.colors.accent, undefined);
  assert.deepEqual(document.themes, []);
  assert.deepEqual(document.styleLibraries, []);
});

test("core rejects legacy leaf node types in project documents", async () => {
  const core = await importContractModule(coreContract);
  const document = core.createProject({
    id: "project_no_legacy_nodes",
    name: "No Legacy Nodes",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  const page = core.createPage({
    id: "page_no_legacy_nodes",
    name: "No Legacy Nodes",
  });
  page.root.children.push({
    id: "node_legacy_text",
    name: "Legacy Text",
    type: "text",
    parentId: page.root.id,
    transform: { x: 0, y: 0, width: 120, height: 40 },
    props: { text: "Legacy" },
    children: [],
  });
  document.pages.push(page);

  const validation = core.validateProject(document);
  assert.ok(validation.some((message) => message.severity === "error" && message.code === "node.type.unsupported"));
});

test("core creates a valid deterministic empty project document", async () => {
  const core = await importContractModule(coreContract);
  const document = core.createProject({
    id: "project_contract",
    name: "Contract Project",
    createdAt: "2026-05-19T00:00:00.000Z",
  });

  assert.equal(document.schemaVersion, core.PROJECT_SCHEMA_VERSION);
  assert.equal(document.project.id, "project_contract");
  assert.equal(document.project.name, "Contract Project");
  assertOwnArray(document, "themes", "project document");
  assertOwnArray(document, "assets", "project document");
  assertOwnArray(document, "components", "project document");
  assertOwnArray(document, "pages", "project document");
  assertOwnArray(document, "locales", "project document");
  assertOwnArray(document, "exportProfiles", "project document");

  assertNoValidationErrors(core.validateProject(document), "validateProject");
});

test("core creates and updates node active state", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_active_state",
    name: "Active State",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({
        id: "page_active_state",
        name: "Active State",
      }),
    },
  }).project;
  document = core.applyCommand(document, {
    type: "node.create",
    args: {
      parentId: "page_active_state_root",
      id: "node_active_toggle",
      nodeType: core.NODE_TYPES.graphics,
      name: "Toggle Target",
    },
  }).project;

  assert.equal(document.pages[0].root.children[0].active, true);

  const result = core.applyCommand(document, {
    type: "node.update_props",
    args: {
      nodeId: "node_active_toggle",
      active: false,
    },
  });

  assert.equal(result.project.pages[0].root.children[0].active, false);
  assertNoValidationErrors(result.validation, "active state update validation");
});

test("core creates pages with transparent UI root background by default", async () => {
  const core = await importContractModule(coreContract);
  const page = core.createPage({
    id: "page_transparent",
    name: "Transparent UI",
  });

  assert.equal(page.canvas.background, "transparent");
  assert.deepEqual(page.root.props, {});
});

test("core validates canvas safe area bounds", async () => {
  const core = await importContractModule(coreContract);
  const document = core.createProject({
    id: "project_safe_area",
    name: "Safe Area Smoke",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  document.pages.push(core.createPage({
    id: "page_safe_area",
    name: "Safe Area Page",
    width: 320,
    height: 240,
    safeArea: {
      top: 20,
      right: 170,
      bottom: 20,
      left: 170,
    },
  }));

  const validation = core.validateProject(document);
  assert.ok(validation.some((message) => message.code === "canvas.safeArea.width"));
});

test("core validates responsive layout primitives", async () => {
  const core = await importContractModule(coreContract);
  const document = core.createProject({
    id: "project_layout_validation",
    name: "Layout Validation",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  const page = core.createPage({
    id: "page_layout_validation",
    name: "Layout Validation",
  });
  page.root.children.push(core.createNode({
    id: "node_bad_layout",
    parentId: page.root.id,
    layout: {
      mode: "flex",
      direction: "diagonal",
      gap: -4,
      padding: { left: -1 },
      columns: 1.5,
      anchors: { left: 0, centerX: 0 },
      safeArea: "yes",
    },
  }));
  page.root.children.push(core.createNode({
    id: "node_bad_layout_component",
    parentId: page.root.id,
    components: [{
      id: "layout",
      type: core.NODE_COMPONENT_TYPES.layout,
      props: {
        mode: "grid",
        columns: 0,
      },
    }],
  }));
  document.pages.push(page);

  const validation = core.validateProject(document);
  assert.ok(validation.some((message) => message.code === "layout.direction.unsupported"));
  assert.ok(validation.some((message) => message.code === "layout.number.invalid" && message.details.key === "gap"));
  assert.ok(validation.some((message) => message.code === "layout.padding.invalid"));
  assert.ok(validation.some((message) => message.code === "layout.anchor.conflict"));
  assert.ok(validation.some((message) => message.code === "layout.safeArea.invalid"));
  assert.ok(validation.some((message) => message.code === "layout.number.invalid" && message.details.nodeId === "node_bad_layout_component"));
});

test("core applies undoable commands without mutating the source document", async () => {
  const core = await importContractModule(coreContract);
  const document = core.createProject({
    id: "project_commands",
    name: "Command Smoke",
    createdAt: "2026-05-19T00:00:00.000Z",
  });

  const page = core.createPage({
    id: "page_shop",
    name: "Shop",
    width: 800,
    height: 600,
    orientation: "landscape",
  });

  const result = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page,
    },
  });

  assert.equal(result.project.pages.length, 1);
  assert.equal(result.project.pages[0].name, "Shop");
  assert.equal(document.pages.length, 0, "applyCommand must not mutate input document");
  assert.equal(result.patch.kind, "project-snapshot-patch");
  assert.equal(result.inversePatch.kind, "project-snapshot-patch");
  assertNoValidationErrors(result.validation, "applyCommand.validation");

  const reverted = core.applySnapshotPatch(result.inversePatch);
  assert.equal(reverted.pages.length, 0);
  assertNoValidationErrors(core.validateProject(reverted), "reverted document validation");
});

test("core updates page canvas and root transform as one undoable command", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_device_profile",
    name: "Device Profile Smoke",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({
        id: "page_device",
        name: "Device Page",
        width: 1080,
        height: 1920,
      }),
    },
  }).project;

  const result = core.applyCommand(document, {
    type: "page.update",
    args: {
      pageId: "page_device",
      canvas: {
        width: 2532,
        height: 1170,
        orientation: "landscape",
        safeArea: {
          top: 0,
          right: 59,
          bottom: 21,
          left: 59,
        },
      },
      rootTransform: {
        width: 2532,
        height: 1170,
      },
    },
  });

  const page = result.project.pages[0];
  assert.equal(page.canvas.width, 2532);
  assert.equal(page.canvas.height, 1170);
  assert.equal(page.canvas.orientation, "landscape");
  assert.equal(page.canvas.safeArea.left, 59);
  assert.equal(page.root.transform.width, 2532);
  assert.equal(page.root.transform.height, 1170);
  assertNoValidationErrors(result.validation, "page.update.validation");

  const reverted = core.applySnapshotPatch(result.inversePatch);
  assert.equal(reverted.pages[0].canvas.width, 1080);
  assert.equal(reverted.pages[0].root.transform.width, 1080);
});

test("core deletes pages without allowing the last page to be removed", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_delete_page",
    name: "Delete Page Smoke",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({ id: "page_one", name: "Page One" }),
    },
  }).project;
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({ id: "page_two", name: "Page Two" }),
    },
  }).project;

  const result = core.applyCommand(document, {
    type: "project.delete_page",
    args: {
      pageId: "page_one",
    },
  });

  assert.deepEqual(result.project.pages.map((page) => page.id), ["page_two"]);
  assert.throws(() => core.applyCommand(result.project, {
    type: "project.delete_page",
    args: {
      pageId: "page_two",
    },
  }), /last page/);
});

test("core replaces node anchors instead of merging stale edges", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_anchor_replace",
    name: "Anchor Replace Smoke",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({
        id: "page_anchor_replace",
        name: "Anchors",
      }),
    },
  }).project;
  document = core.applyCommand(document, {
    type: "node.create",
    args: {
      parentId: "page_anchor_replace_root",
      id: "node_anchored",
      nodeType: core.NODE_TYPES.graphics,
      name: "Anchored",
      layout: {
        anchors: {
          left: 10,
          right: 20,
          top: 30,
          bottom: 40,
        },
      },
    },
  }).project;

  const result = core.applyCommand(document, {
    type: "node.update_props",
    args: {
      nodeId: "node_anchored",
      layout: {
        anchors: {
          centerX: 0,
          centerY: 0,
        },
      },
    },
  });

  const node = result.project.pages[0].root.children[0];
  assert.deepEqual(node.layout.anchors, {
    centerX: 0,
    centerY: 0,
  });
});

test("core reparents nodes into children and back to root order", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_reparent",
    name: "Reparent Smoke",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  const page = core.createPage({
    id: "page_reparent",
    name: "Reparent Page",
  });

  document = core.applyCommand(document, {
    type: "project.create_page",
    args: { page },
  }).project;
  document = core.applyCommand(document, {
    type: "node.create",
    args: {
      parentId: "page_reparent_root",
      id: "node_panel",
      nodeType: core.NODE_TYPES.graphics,
      name: "Panel",
      transform: { x: 100, y: 50, width: 200, height: 100 },
    },
  }).project;
  document = core.applyCommand(document, {
    type: "node.create",
    args: {
      parentId: "page_reparent_root",
      id: "node_label",
      nodeType: core.NODE_TYPES.graphics,
      name: "Label",
      transform: { x: 250, y: 120, width: 120, height: 40 },
      components: [
        {
          id: "text",
          type: core.NODE_COMPONENT_TYPES.text,
          props: { text: "Label" },
        },
      ],
    },
  }).project;

  document = core.applyCommand(document, {
    type: "node.reparent",
    args: {
      nodeId: "node_label",
      parentId: "node_panel",
      index: 0,
      preserveWorldTransform: true,
    },
  }).project;

  let panel = core.findNodeInProject(document, "node_panel").node;
  assert.deepEqual(panel.children.map((child) => child.id), ["node_label"]);
  assert.deepEqual(panel.children[0].transform, {
    x: 150,
    y: 70,
    width: 120,
    height: 40,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    pivotX: 0,
    pivotY: 0,
  });

  document = core.applyCommand(document, {
    type: "node.reparent",
    args: {
      nodeId: "node_label",
      parentId: "page_reparent_root",
      index: 0,
      preserveWorldTransform: true,
    },
  }).project;

  const rootChildren = document.pages[0].root.children.map((child) => child.id);
  assert.deepEqual(rootChildren, ["node_label", "node_panel"]);
  assert.equal(document.pages[0].root.children[0].transform.x, 250);
  assert.equal(document.pages[0].root.children[0].transform.y, 120);
});

test("core rejects reparenting a node into its own descendant", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_reparent_guard",
    name: "Reparent Guard",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({
        id: "page_guard",
        name: "Guard Page",
      }),
    },
  }).project;
  document = core.applyCommand(document, {
    type: "node.create",
    args: {
      parentId: "page_guard_root",
      id: "node_parent",
      nodeType: core.NODE_TYPES.graphics,
      name: "Parent",
    },
  }).project;
  document = core.applyCommand(document, {
    type: "node.create",
    args: {
      parentId: "node_parent",
      id: "node_child",
      nodeType: core.NODE_TYPES.graphics,
      name: "Child",
    },
  }).project;

  assert.throws(() => core.applyCommand(document, {
    type: "node.reparent",
    args: {
      nodeId: "node_parent",
      parentId: "node_child",
    },
  }), /descendant/);
});

test("core reorders nodes inside the same parent with stable indexes", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_reorder",
    name: "Reorder Smoke",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({
        id: "page_reorder",
        name: "Reorder Page",
      }),
    },
  }).project;

  for (const id of ["node_a", "node_b", "node_c"]) {
    document = core.applyCommand(document, {
      type: "node.create",
      args: {
        parentId: "page_reorder_root",
        id,
        nodeType: core.NODE_TYPES.graphics,
        name: id,
      },
    }).project;
  }

  document = core.applyCommand(document, {
    type: "node.reparent",
    args: {
      nodeId: "node_a",
      parentId: "page_reorder_root",
      index: 3,
    },
  }).project;

  assert.deepEqual(document.pages[0].root.children.map((child) => child.id), ["node_b", "node_c", "node_a"]);
});

test("core deletes a node with its subtree", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_delete",
    name: "Delete Smoke",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({
        id: "page_delete",
        name: "Delete Page",
      }),
    },
  }).project;
  document = core.applyCommand(document, {
    type: "node.create",
    args: {
      parentId: "page_delete_root",
      id: "node_panel",
      nodeType: core.NODE_TYPES.graphics,
      name: "Panel",
    },
  }).project;
  document = core.applyCommand(document, {
    type: "node.create",
    args: {
      parentId: "node_panel",
      id: "node_label",
      nodeType: core.NODE_TYPES.graphics,
      name: "Label",
      components: [
        {
          id: "text",
          type: core.NODE_COMPONENT_TYPES.text,
          props: { text: "Label" },
        },
      ],
    },
  }).project;

  const result = core.applyCommand(document, {
    type: "node.delete",
    args: {
      nodeId: "node_panel",
    },
  });

  assert.deepEqual(result.project.pages[0].root.children, []);
  assert.equal(core.findNodeInProject(result.project, "node_label"), null);
  assertNoValidationErrors(result.validation, "delete.validation");
});

test("core manages instance definitions and placed instances", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_instances",
    name: "Instance Smoke",
    createdAt: "2026-05-20T00:00:00.000Z",
  });
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({ id: "page_instances", name: "Instances" }),
    },
  }).project;
  document = core.applyCommand(document, {
    type: "component.create",
    args: {
      id: "instance_button",
      name: "Button Instance",
      rootNode: {
        id: "instance_button_root",
        type: core.NODE_TYPES.container,
        name: "Button Root",
        parentId: null,
        transform: { x: 0, y: 0, width: 180, height: 64 },
        props: {},
        children: [{
          id: "instance_button_body",
          type: core.NODE_TYPES.graphics,
          name: "Button Body",
          parentId: "instance_button_root",
          transform: { x: 0, y: 0, width: 180, height: 64 },
          props: {},
          components: [{
            id: "fill",
            type: core.NODE_COMPONENT_TYPES.fill,
            props: { fill: "#33b8a5" },
          }],
          children: [],
        }],
        editorMeta: { instanceDefinitionRoot: true },
      },
    },
  }).project;

  document = core.applyCommand(document, {
    type: "component.instantiate",
    args: {
      componentId: "instance_button",
      parentId: "page_instances_root",
      nodeId: "node_instance_a",
      transform: { x: 24, y: 32, width: 180, height: 64 },
    },
  }).project;
  document = core.applyCommand(document, {
    type: "component.instantiate",
    args: {
      componentId: "instance_button",
      parentId: "page_instances_root",
      nodeId: "node_instance_b",
      transform: { x: 240, y: 32, width: 180, height: 64 },
    },
  }).project;

  assert.equal(document.pages[0].root.children.length, 2);
  assert.equal(document.pages[0].root.children[0].type, core.NODE_TYPES.componentInstance);

  document = core.applyCommand(document, {
    type: "component.rename",
    args: {
      componentId: "instance_button",
      name: "Primary Button",
    },
  }).project;

  assert.equal(document.components[0].name, "Primary Button");
  assert.equal(document.components[0].rootNode.children[0].name, "Primary Button");
  assert.equal(core.findNodeInProject(document, "node_instance_a").node.name, "Primary Button");
  assert.equal(core.findNodeInProject(document, "node_instance_b").node.name, "Primary Button");

  document = core.applyCommand(document, {
    type: "component.detach_instance",
    args: { nodeId: "node_instance_a" },
  }).project;

  const detached = core.findNodeInProject(document, "node_instance_a").node;
  assert.equal(detached.type, core.NODE_TYPES.graphics);
  assert.equal(detached.editorMeta.detachedFromComponentId, "instance_button");
  assert.equal(core.findNodeInProject(document, "node_instance_b").node.type, core.NODE_TYPES.componentInstance);

  document = core.applyCommand(document, {
    type: "component.delete",
    args: { componentId: "instance_button" },
  }).project;

  assert.equal(document.components.length, 0);
  assert.equal(core.findNodeInProject(document, "node_instance_b").node.type, core.NODE_TYPES.componentInstance);
  assert.equal(core.findNodeInProject(document, "node_instance_b").node.props.componentId, "instance_button");
  assert.equal(core.findNodeInProject(document, "node_instance_a").node.type, core.NODE_TYPES.graphics);
  const validation = core.validateProject(document);
  assert.ok(validation.some((message) => message.code === "component.instance.missing" && message.details.nodeId === "node_instance_b"));
  assertNoValidationErrors(validation, "instance commands validation");
});

test("core imports and updates first-class assets", async () => {
  const core = await importContractModule(coreContract);
  const document = core.createProject({
    id: "project_assets",
    name: "Asset Smoke",
    createdAt: "2026-05-19T00:00:00.000Z",
  });

  const imported = core.applyCommand(document, {
    type: "asset.import",
    args: {
      asset: {
        id: "asset_coin",
        name: "Coin",
        type: "texture",
        src: "assets/coin.png",
        width: 64,
        height: 64,
      },
    },
  });

  assert.equal(document.assets.length, 0, "asset.import must not mutate input document");
  assert.equal(imported.project.assets.length, 1);
  assert.equal(imported.project.assets[0].id, "asset_coin");
  assertNoValidationErrors(imported.validation, "asset.import.validation");

  const updated = core.applyCommand(imported.project, {
    type: "asset.update",
    args: {
      assetId: "asset_coin",
      tags: ["currency"],
    },
  });

  assert.deepEqual(updated.project.assets[0].tags, ["currency"]);
  const atlas = core.applyCommand(updated.project, {
    type: "asset.update",
    args: {
      assetId: "asset_coin",
      type: "spriteAtlas",
      frames: {
        idle: {
          x: 0,
          y: 0,
          width: 32,
          height: 32,
          sourceWidth: 32,
          sourceHeight: 32,
        },
      },
    },
  });

  assert.equal(atlas.project.assets[0].type, "spriteAtlas");
  assert.deepEqual(atlas.project.assets[0].frames.idle, {
    x: 0,
    y: 0,
    width: 32,
    height: 32,
    sourceWidth: 32,
    sourceHeight: 32,
  });

  const replacedFrames = core.applyCommand(atlas.project, {
    type: "asset.update",
    args: {
      assetId: "asset_coin",
      frames: {
        run: {
          x: 32,
          y: 0,
          width: 32,
          height: 32,
          sourceWidth: 32,
          sourceHeight: 32,
        },
      },
    },
  });
  assert.deepEqual(Object.keys(replacedFrames.project.assets[0].frames), ["run"]);
  assert.throws(() => core.applyCommand(updated.project, {
    type: "asset.import",
    args: {
      asset: {
        id: "asset_coin",
        type: "texture",
      },
    },
  }), /already exists/);
});

test("core imports many assets as one undoable command", async () => {
  const core = await importContractModule(coreContract);
  const document = core.createProject({
    id: "project_many_assets",
    name: "Many Assets",
    createdAt: "2026-05-19T00:00:00.000Z",
  });

  const result = core.applyCommand(document, {
    type: "asset.import_many",
    args: {
      assets: Array.from({ length: 3 }, (_value, index) => ({
        id: `asset_${index}`,
        name: `Asset ${index}`,
        type: "texture",
        src: `blob:asset-${index}`,
      })),
    },
  });

  assert.equal(document.assets.length, 0, "asset.import_many must not mutate input document");
  assert.equal(result.project.assets.length, 3);
  assert.equal(result.patch.kind, "project-snapshot-patch");
  assertNoValidationErrors(result.validation, "asset.import_many.validation");
});

test("core creates a component from a node subtree", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_component_create",
    name: "Component Create",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({
        id: "page_component_create",
        name: "Components",
      }),
    },
  }).project;
  document = core.applyCommand(document, {
    type: "node.create",
    args: {
      parentId: "page_component_create_root",
      id: "node_card",
      nodeType: core.NODE_TYPES.graphics,
      name: "Reward Card",
      transform: { x: 80, y: 120, width: 300, height: 160 },
    },
  }).project;
  document = core.applyCommand(document, {
    type: "node.create",
    args: {
      parentId: "node_card",
      id: "node_card_label",
      nodeType: core.NODE_TYPES.graphics,
      name: "Reward Label",
      components: [
        {
          id: "text",
          type: core.NODE_COMPONENT_TYPES.text,
          props: { text: "Reward" },
        },
      ],
    },
  }).project;

  const result = core.applyCommand(document, {
    type: "component.create",
    args: {
      id: "component_reward_card",
      nodeId: "node_card",
      name: "Reward Card",
    },
  });

  assert.equal(document.components.length, 0, "component.create must not mutate input document");
  assert.equal(result.project.components.length, 1);
  assert.equal(result.project.components[0].id, "component_reward_card");
  assert.equal(result.project.components[0].rootNode.parentId, null);
  assert.equal(result.project.components[0].rootNode.transform.x, 0);
  assert.equal(result.project.components[0].rootNode.transform.y, 0);
  assert.equal(result.project.components[0].rootNode.children[0].parentId, "node_card");
  assert.equal(result.patch.kind, "project-snapshot-patch");
  assertNoValidationErrors(result.validation, "component.create.validation");

  assert.throws(() => core.applyCommand(result.project, {
    type: "component.create",
    args: {
      id: "component_reward_card",
      nodeId: "node_card",
    },
  }), /already exists/);
});

test("core instantiates a component under a parent", async () => {
  const core = await importContractModule(coreContract);
  let document = core.createProject({
    id: "project_component_instance",
    name: "Component Instance",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  document = core.applyCommand(document, {
    type: "project.create_page",
    args: {
      page: core.createPage({
        id: "page_component_instance",
        name: "Instances",
      }),
    },
  }).project;
  document = core.applyCommand(document, {
    type: "component.create",
    args: {
      id: "component_badge",
      name: "Badge",
      rootNode: core.createNode({
        id: "badge_root",
        type: core.NODE_TYPES.graphics,
        name: "Badge Root",
        transform: { x: 0, y: 0, width: 180, height: 64 },
      }),
    },
  }).project;

  const result = core.applyCommand(document, {
    type: "component.instantiate",
    args: {
      componentId: "component_badge",
      parentId: "page_component_instance_root",
      nodeId: "node_badge_instance",
      transform: { x: 24, y: 32, width: 180, height: 64 },
      props: { variant: "primary" },
    },
  });

  const instance = result.project.pages[0].root.children[0];
  assert.equal(instance.id, "node_badge_instance");
  assert.equal(instance.type, core.NODE_TYPES.componentInstance);
  assert.equal(instance.parentId, "page_component_instance_root");
  assert.equal(instance.props.componentId, "component_badge");
  assert.equal(instance.props.variant, "primary");
  assert.equal(instance.transform.x, 24);
  assertNoValidationErrors(result.validation, "component.instantiate.validation");

  assert.throws(() => core.applyCommand(document, {
    type: "component.instantiate",
    args: {
      componentId: "missing_component",
      parentId: "page_component_instance_root",
    },
  }), /was not found/);
});

test("core command patches apply ordered commands and preserve inverse patches", async () => {
  const core = await importContractModule(coreContract);
  const document = core.createProject({
    id: "project_patch",
    name: "Patch Start",
    createdAt: "2026-05-19T00:00:00.000Z",
  });
  const page = core.createPage({
    id: "page_patch",
    name: "Patch Page",
  });

  const result = core.applyCommandPatch(document, {
    kind: "pixi-ui-command-patch",
    version: "1.0",
    label: "Create and rename page",
    commands: [
      {
        type: "project.create_page",
        args: {
          page,
        },
      },
      {
        type: "project.rename_page",
        args: {
          pageId: "page_patch",
          name: "Renamed Page",
        },
      },
    ],
  });

  assert.equal(result.project.pages.length, 1);
  assert.equal(result.project.pages[0].name, "Renamed Page");
  assert.equal(document.pages.length, 0, "applyCommandPatch must not mutate input document");
  assert.equal(result.patch.kind, "pixi-ui-command-patch");
  assert.equal(result.patches.length, 2);
  assert.equal(result.inversePatches.length, 2);
  assertNoValidationErrors(result.validation, "applyCommandPatch.validation");
});
