import { promptCatalog, resourceCatalog, toolCatalog, MCP_VERSION } from "./catalog.js";
import { callEditorTool, readResource } from "./context.js";

export function handleJsonRpcRequest(context, request) {
  try {
    const result = route(context, request);
    return {
      jsonrpc: "2.0",
      id: request.id,
      result
    };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: request?.id ?? null,
      error: {
        code: -32000,
        message: error.message
      }
    };
  }
}

function route(context, request) {
  switch (request.method) {
    case "initialize":
      return {
        protocolVersion: MCP_VERSION,
        serverInfo: {
          name: "pixi-ui-editor-mcp",
          version: "0.1.0"
        },
        capabilities: {
          tools: { listChanged: true },
          resources: { listChanged: true, subscribe: true },
          prompts: { listChanged: true },
          logging: {}
        }
      };
    case "tools/list":
      return { tools: toolCatalog };
    case "tools/call":
      return callEditorTool(context, request.params?.name, request.params?.arguments || {});
    case "resources/list":
      return { resources: resourceCatalog };
    case "resources/read":
      return { contents: [readResource(context, request.params?.uri)] };
    case "prompts/list":
      return { prompts: promptCatalog };
    case "prompts/get":
      return getPrompt(request.params?.name, request.params?.arguments || {});
    default:
      throw new Error(`Unsupported JSON-RPC method "${request.method}".`);
  }
}

function getPrompt(name, args) {
  const focus = args.focus ? ` Focus: ${args.focus}.` : "";
  return {
    description: `Pixi UI Editor workflow: ${name}.${focus}`,
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `Use the Pixi UI Editor MCP resources and tools for "${name}".`,
            "Read the project summary and current validation before proposing edits.",
            "Return changes as a pixi-ui-command-patch and prefer dry-run before apply.",
            focus
          ].filter(Boolean).join(" ")
        }
      }
    ]
  };
}
