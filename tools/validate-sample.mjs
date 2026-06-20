#!/usr/bin/env node
import { createProject, createPage, applyCommand, validateProject, NODE_COMPONENT_TYPES, NODE_TYPES } from "../packages/core/src/index.js";
import { exportPixiUiBundle } from "../packages/exporter/src/index.js";
import { createPlainPixiAdapter, createPixiUiRuntime } from "../packages/runtime/src/index.js";

let project = createProject({
  id: "project_sample_validation",
  name: "Sample Validation Project",
  createdAt: "2026-05-19T00:00:00.000Z"
});

const page = createPage({
  id: "page_sample",
  name: "Sample Screen",
  width: 800,
  height: 600,
  orientation: "landscape"
});

project = applyCommand(project, {
  type: "project.create_page",
  args: { page }
}).project;

project = applyCommand(project, {
  type: "node.create",
  args: {
    parentId: "page_sample_root",
    nodeType: NODE_TYPES.graphics,
    id: "node_sample_title",
    name: "Sample Title",
    transform: { x: 40, y: 32, width: 360, height: 64 },
    props: {},
    components: [
      {
        id: "text",
        type: NODE_COMPONENT_TYPES.text,
        props: { text: "Sample UI", fontSize: 40, fill: "#ffffff" }
      }
    ]
  }
}).project;

const validation = validateProject(project);
const errors = validation.filter((message) => message.severity === "error");

if (errors.length) {
  console.error(JSON.stringify(errors, null, 2));
  process.exit(1);
}

const bundle = exportPixiUiBundle(project, {
  profileId: "development",
  includeEditorData: false
});

const adapter = createPlainPixiAdapter();
const stage = adapter.createContainer({ node: { id: "stage", name: "Stage", type: "container" } });
const runtime = await createPixiUiRuntime({ bundle, adapter });
const screen = await runtime.mountScreen("page_sample", { container: stage });

if (!screen.findById("node_sample_title")) {
  throw new Error("Runtime could not resolve node_sample_title.");
}

screen.destroy();
runtime.destroy();

console.log(JSON.stringify({
  valid: true,
  pages: project.pages.length,
  nodes: bundle.summary.nodeCount,
  warnings: bundle.summary.warningCount
}, null, 2));
