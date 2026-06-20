import assert from "node:assert/strict";
import test from "node:test";

import { createSinglePageProjectDocument } from "./fixtures/sample-project.mjs";
import {
  assertFunction,
  assertJsonSerializable,
  importContractModule,
} from "./helpers/contract-loader.mjs";

const mcpContract = {
  label: "@pixi-ui-editor/mcp-server",
  candidates: [
    "packages/mcp-server/src/index.mjs",
    "packages/mcp-server/src/index.js",
    "packages/mcp-server/index.mjs",
    "packages/mcp-server/index.js",
    "packages/mcp-server/dist/index.mjs",
    "packages/mcp-server/dist/index.js",
  ],
  requiredExports: [
    "toolCatalog",
    "resourceCatalog",
    "promptCatalog",
    "createEditorMcpContext",
    "handleJsonRpcRequest",
  ],
};

const requiredToolNames = [
  "project.get_summary",
  "project.validate",
  "project.apply_patch",
  "page.create",
  "page.delete",
  "page.update",
  "project.set_token",
  "project.create_theme",
  "project.create_style_library",
  "project.apply_style_library",
  "node.create",
  "node.update_props",
  "node.delete",
  "component.create",
  "component.instantiate",
  "component.rename",
  "component.delete",
  "component.detach_instance",
  "component.find_usages",
  "component.create_variant",
  "component.update_exposed_props",
  "layout.analyze",
  "runtime.generate_integration_code",
];

test("mcp server exposes a JSON-schema backed tool catalog", async () => {
  const mcp = await importContractModule(mcpContract);
  assertFunction(mcp.createEditorMcpContext, "createEditorMcpContext");
  assertFunction(mcp.handleJsonRpcRequest, "handleJsonRpcRequest");

  const tools = mcp.toolCatalog;
  assert.ok(Array.isArray(tools), "toolCatalog must be an array");
  assert.ok(tools.length >= requiredToolNames.length, "tool catalog should include core editor tools");
  assertJsonSerializable(tools, "MCP tool catalog");

  const names = tools.map((tool) => tool.name);
  assert.equal(new Set(names).size, names.length, "MCP tool names must be unique");

  for (const name of requiredToolNames) {
    assert.ok(names.includes(name), `MCP tool catalog must include ${name}`);
  }

  for (const tool of tools) {
    assert.equal(typeof tool.name, "string", "tool.name must be a string");
    assert.match(tool.name, /^[a-z0-9_.-]+$/, `invalid MCP tool name: ${tool.name}`);
    assert.equal(typeof tool.description, "string", `${tool.name}.description must be a string`);
    assert.ok(tool.description.length > 0, `${tool.name}.description must not be empty`);
    assert.equal(typeof tool.inputSchema, "object", `${tool.name}.inputSchema must be an object`);
    assert.notEqual(tool.inputSchema, null, `${tool.name}.inputSchema must be an object`);
    assert.equal(tool.inputSchema.type, "object", `${tool.name}.inputSchema.type must be object`);
  }
});

test("mcp node.delete mutates through the command bus", async () => {
  const mcp = await importContractModule(mcpContract);
  const context = mcp.createEditorMcpContext({
    project: createSinglePageProjectDocument(),
  });
  const deleteTool = mcp.toolCatalog.find((tool) => tool.name === "node.delete");

  assert.equal(deleteTool.annotations.destructiveHint, true);
  assert.equal(deleteTool.annotations.readOnlyHint, false);

  const response = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "node.delete",
      arguments: {
        nodeId: "node_title",
      },
    },
  });

  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, 2);
  assert.ok(!response.error, response.error?.message || "node.delete should not return an error");
  assert.equal(context.project.pages[0].root.children.length, 0);
  assert.equal(response.result.structuredContent.patch.kind, "project-snapshot-patch");
});

test("mcp component tools mutate through the command bus", async () => {
  const mcp = await importContractModule(mcpContract);
  const context = mcp.createEditorMcpContext({
    project: createSinglePageProjectDocument(),
  });
  const createTool = mcp.toolCatalog.find((tool) => tool.name === "component.create");
  const instantiateTool = mcp.toolCatalog.find((tool) => tool.name === "component.instantiate");

  assert.equal(createTool.annotations.destructiveHint, false);
  assert.equal(createTool.annotations.readOnlyHint, false);
  assert.equal(instantiateTool.annotations.destructiveHint, false);
  assert.equal(instantiateTool.annotations.readOnlyHint, false);

  const createResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 3,
    method: "tools/call",
    params: {
      name: "component.create",
      arguments: {
        id: "component_title",
        nodeId: "node_title",
        name: "Title Component",
      },
    },
  });

  assert.equal(createResponse.jsonrpc, "2.0");
  assert.equal(createResponse.id, 3);
  assert.ok(!createResponse.error, createResponse.error?.message || "component.create should not return an error");
  assert.equal(context.project.components.length, 1);
  assert.equal(createResponse.result.structuredContent.patch.kind, "project-snapshot-patch");

  const instantiateResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 4,
    method: "tools/call",
    params: {
      name: "component.instantiate",
      arguments: {
        componentId: "component_title",
        parentId: "node_root",
        nodeId: "node_title_instance",
      },
    },
  });

  assert.equal(instantiateResponse.jsonrpc, "2.0");
  assert.equal(instantiateResponse.id, 4);
  assert.ok(!instantiateResponse.error, instantiateResponse.error?.message || "component.instantiate should not return an error");
  const instance = context.project.pages[0].root.children.find((node) => node.id === "node_title_instance");
  assert.equal(instance.type, "componentInstance");
  assert.equal(instance.props.componentId, "component_title");
  assert.equal(instantiateResponse.result.structuredContent.patch.kind, "project-snapshot-patch");

  const usagesResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 13,
    method: "tools/call",
    params: {
      name: "component.find_usages",
      arguments: { componentId: "component_title" },
    },
  });
  assert.ok(!usagesResponse.error, usagesResponse.error?.message || "component.find_usages should not return an error");
  assert.equal(usagesResponse.result.structuredContent.data.length, 1);

  const detachResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 14,
    method: "tools/call",
    params: {
      name: "component.detach_instance",
      arguments: { nodeId: "node_title_instance" },
    },
  });
  assert.ok(!detachResponse.error, detachResponse.error?.message || "component.detach_instance should not return an error");
  const detached = context.project.pages[0].root.children.find((node) => node.id === "node_title_instance");
  assert.notEqual(detached.type, "componentInstance");
});

test("mcp design-system tools mutate through the command bus", async () => {
  const mcp = await importContractModule(mcpContract);
  const context = mcp.createEditorMcpContext({
    project: createSinglePageProjectDocument(),
  });

  const tokenResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "project.set_token",
      arguments: { group: "colors", name: "accent", value: "#33b8a5" },
    },
  });
  assert.ok(!tokenResponse.error, tokenResponse.error?.message || "project.set_token should not return an error");
  assert.equal(context.project.tokens.colors.accent, "#33b8a5");

  const themeResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 6,
    method: "tools/call",
    params: {
      name: "project.create_theme",
      arguments: { id: "dark", name: "Dark", tokens: { colors: { accent: "#7dd3fc" } } },
    },
  });
  assert.ok(!themeResponse.error, themeResponse.error?.message || "project.create_theme should not return an error");
  assert.equal(context.project.themes[0].id, "dark");

  const libraryResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 10,
    method: "tools/call",
    params: {
      name: "project.create_style_library",
      arguments: { id: "library_core", name: "Core", tokens: {}, themes: [], components: [] },
    },
  });
  assert.ok(!libraryResponse.error, libraryResponse.error?.message || "project.create_style_library should not return an error");
  assert.equal(context.project.styleLibraries[0].id, "library_core");

  const applyLibraryResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 15,
    method: "tools/call",
    params: {
      name: "project.apply_style_library",
      arguments: { libraryId: "library_core" },
    },
  });
  assert.ok(!applyLibraryResponse.error, applyLibraryResponse.error?.message || "project.apply_style_library should not return an error");

  const componentResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: {
      name: "component.create",
      arguments: {
        id: "component_title",
        nodeId: "node_title",
        name: "Title Component",
      },
    },
  });
  assert.ok(!componentResponse.error, componentResponse.error?.message || "component.create should not return an error");

  const variantResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 8,
    method: "tools/call",
    params: {
      name: "component.create_variant",
      arguments: {
        componentId: "component_title",
        id: "primary",
        name: "Primary",
        overrides: {},
      },
    },
  });
  assert.ok(!variantResponse.error, variantResponse.error?.message || "component.create_variant should not return an error");
  assert.equal(context.project.components[0].variants[0].id, "primary");

  const propsResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 9,
    method: "tools/call",
    params: {
      name: "component.update_exposed_props",
      arguments: {
        componentId: "component_title",
        exposedProps: { text: { type: "string" } },
      },
    },
  });
  assert.ok(!propsResponse.error, propsResponse.error?.message || "component.update_exposed_props should not return an error");
  assert.equal(context.project.components[0].exposedProps.text.type, "string");
});

test("mcp design-system resources include tokens, themes and style libraries", async () => {
  const mcp = await importContractModule(mcpContract);
  const context = mcp.createEditorMcpContext({
    project: {
      ...createSinglePageProjectDocument(),
      tokens: { colors: { accent: "#33b8a5" } },
      themes: [{ id: "dark", name: "Dark", tokens: {} }],
      styleLibraries: [{ id: "library_core", name: "Core", tokens: {}, themes: [], components: [] }],
    },
  });

  const resourcesResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 11,
    method: "resources/list",
  });
  assert.ok(!resourcesResponse.error, resourcesResponse.error?.message || "resources/list should not return an error");
  const resourceUris = resourcesResponse.result.resources.map((resource) => resource.uri);
  assert.ok(resourceUris.includes("pixi-ui://style-libraries"));

  const readResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 12,
    method: "resources/read",
    params: { uri: "pixi-ui://style-libraries" },
  });
  assert.ok(!readResponse.error, readResponse.error?.message || "resources/read should not return an error");
  assert.equal(JSON.parse(readResponse.result.contents[0].text)[0].id, "library_core");

  const componentReadResponse = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 16,
    method: "resources/read",
    params: { uri: "pixi-ui://style-libraries/library_core" },
  });
  assert.ok(!componentReadResponse.error, componentReadResponse.error?.message || "style library detail read should not return an error");
  assert.equal(JSON.parse(componentReadResponse.result.contents[0].text).name, "Core");
});

test("mcp JSON-RPC tools/list returns the same catalog", async () => {
  const mcp = await importContractModule(mcpContract);
  const context = mcp.createEditorMcpContext({
    project: createSinglePageProjectDocument(),
  });

  const response = mcp.handleJsonRpcRequest(context, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  });

  assert.equal(response.jsonrpc, "2.0");
  assert.equal(response.id, 1);
  assert.ok(!response.error, response.error?.message || "tools/list should not return an error");
  assert.deepEqual(response.result.tools, mcp.toolCatalog);
});
