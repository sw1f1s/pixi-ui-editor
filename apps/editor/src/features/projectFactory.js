// demo and blank project factories.
import { bindEditorApi } from "../app/editorRuntime.js?v=20260620-designless";
import { applyCommand, createPage, createProject, createId, NODE_COMPONENT_TYPES, NODE_TYPES } from "../app/editorDeps.js?v=20260620-designless";
const { createNodeComponent, normalizeProjectName, roundedRect } = bindEditorApi(["createNodeComponent","normalizeProjectName","roundedRect"]);

export function seedProject() {
  let project = createProject({
    id: "project_demo",
    name: "Game UI Workspace"
  });
  const page = createPage({
    id: "page_main",
    name: "Main HUD",
    width: 1080,
    height: 1920,
    background: "transparent"
  });

  project = applyCommand(project, {
    type: "project.create_page",
    args: { page },
    meta: { source: "system", label: "Create demo page" }
  }).project;

  const rootId = page.root.id;
  for (const command of [
    {
      type: "node.create",
      args: {
        parentId: rootId,
        nodeType: NODE_TYPES.graphics,
        name: "Top Resource Bar",
        transform: { x: 56, y: 70, width: 968, height: 112 },
        components: [
          createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#243447", radius: 28 })
        ]
      }
    },
    {
      type: "node.create",
      args: {
        parentId: rootId,
        nodeType: NODE_TYPES.graphics,
        name: "Coins Label",
        transform: { x: 92, y: 104, width: 360, height: 54 },
        components: [
          createNodeComponent(NODE_COMPONENT_TYPES.text, { text: "Coins: 12 450", fontFamily: "Inter", fontSize: 42, fill: "#f2c14e", align: "left", verticalAlign: "middle", lineHeight: 1.2, wrap: true })
        ]
      }
    },
    {
      type: "node.create",
      args: {
        parentId: rootId,
        nodeType: NODE_TYPES.graphics,
        name: "Play Button",
        transform: { x: 250, y: 1510, width: 580, height: 132 },
        components: [
          createNodeComponent(NODE_COMPONENT_TYPES.fill, { shape: "roundedRect", fill: "#33b8a5", radius: 32 }),
          createNodeComponent(NODE_COMPONENT_TYPES.text, { text: "PLAY", fontFamily: "Inter", fontSize: 54, fill: "#071412", align: "center", verticalAlign: "middle", lineHeight: 1.1, wrap: false }),
          createNodeComponent(NODE_COMPONENT_TYPES.button, { cursor: "pointer" })
        ]
      }
    }
  ]) {
    project = applyCommand(project, {
      ...command,
      meta: { source: "system", label: command.args.name }
    }).project;
  }

  return project;
}

export function createBlankProject(name = "New Pixi UI") {
  const projectName = normalizeProjectName(name);
  let project = createProject({
    id: createId("project"),
    name: projectName
  });
  const page = createPage({
    id: createId("page"),
    name: "Main HUD",
    width: 1080,
    height: 1920,
    background: "transparent"
  });

  project = applyCommand(project, {
    type: "project.create_page",
    args: { page },
    meta: { source: "system", label: "Create main page" }
  }).project;
  return project;
}

