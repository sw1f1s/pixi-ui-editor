#!/usr/bin/env node
import { createProject, createPage, applyCommand } from "../../core/src/index.js";
import { createEditorMcpContext, handleJsonRpcRequest } from "../src/index.js";

const project = createProject({ name: "MCP Scratch Project" });
const page = createPage({ id: "page_main", name: "Main" });
const seeded = applyCommand(project, {
  type: "project.create_page",
  args: { page },
  meta: { source: "system", label: "Seed MCP project" }
}).project;

const context = createEditorMcpContext({ project: seeded });

process.stdin.setEncoding("utf8");
let buffer = "";

process.stdin.on("data", (chunk) => {
  buffer += chunk;
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }
    const request = JSON.parse(line);
    const response = handleJsonRpcRequest(context, request);
    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
});
