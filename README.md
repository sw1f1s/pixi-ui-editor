# Pixi UI Editor

Web editor architecture for building production game UI for PixiJS: visual authoring, structured project documents, runtime export, validation, and LLM/MCP automation.

The repository starts dependency-light so the first architecture layer can run immediately:

- `packages/core` - project schema, commands, validation, patch model.
- `packages/runtime` - Pixi-like runtime mounting layer.
- `packages/exporter` - export manifest builder.
- `packages/mcp-server` - MCP catalog and tool skeleton.
- `apps/editor` - browser editor shell.
- `tests` - Node test runner coverage.

## Commands

```sh
npm run dev
npm test
```

The editor dev server serves `apps/editor/index.html` and the local package sources.
