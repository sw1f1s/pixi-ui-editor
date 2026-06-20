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

The editor dev server serves the repository root and redirects `/` to `apps/editor/`.

## GitHub Pages

Publish the repository root from the `main` branch:

1. Open `Settings` -> `Pages`.
2. Under `Build and deployment`, set `Source` to `Deploy from a branch`.
3. Set `Branch` to `main` and folder to `/ (root)`.
4. Save the settings.

After GitHub Pages deploys, the editor opens from:

```text
https://sw1f1s.github.io/pixi-ui-editor/
```
