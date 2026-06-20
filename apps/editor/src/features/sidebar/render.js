import { collectNodes, els, getActivePage, getCanvasSize, getCanvasZoomPercent, getProjectFileLabel, getProjectHeaderText, getSelectedNode, renderAtlasEditor, renderCanvas, renderInspector, renderValidation, state } from "./deps.js";
import { renderPages } from "./pagesPanel.js";
import { renderComponents } from "./componentsPanel.js";
import { renderAssets } from "./assetBrowserPanel.js";
import { getLayerNodeName, renderLayers } from "./layersPanel.js";

export function render(options = {}) {
  const page = getActivePage();
  const canvasSize = getCanvasSize(page);
  const deviceName = page.editorMeta?.deviceProfileName ? ` · ${page.editorMeta.deviceProfileName}` : "";
  const zoomPercent = getCanvasZoomPercent();
  els.projectMeta.textContent = getProjectHeaderText();
  document.title = `${getProjectFileLabel()} - Pixi UI Editor`;
  els.canvasLabel.textContent = `${page.name}${deviceName} / ${canvasSize.width}x${canvasSize.height}`;
  const selectedNode = getSelectedNode();
  els.selectionLabel.textContent = selectedNode ? `Selected: ${getLayerNodeName(selectedNode) || state.selectedNodeId}` : "No selection";
  els.historyLabel.textContent = `${state.history.length} undo · ${state.redoStack.length} redo`;
  els.undoButton.disabled = state.history.length === 0;
  els.redoButton.disabled = state.redoStack.length === 0;
  els.deletePageButton.disabled = state.project.pages.length <= 1;
  els.zoomSlider.value = String(zoomPercent);
  els.zoomValue.textContent = `${zoomPercent}%`;
  els.backToPageButton.hidden = !state.editingComponentId;

  renderPages();
  renderComponents();
  renderAssets();
  renderLayers();
  if (!options.preserveInspector) {
    renderInspector();
  }
  renderValidation();
  renderCanvas();
  renderAtlasEditor();
  state.lastStatusPayload = {
    schemaVersion: state.project.schemaVersion,
    project: state.project.project,
    pages: state.project.pages.map((candidate) => ({
      id: candidate.id,
      name: candidate.name,
      nodes: collectNodes(candidate.root).length
    })),
    assets: state.project.assets.length,
    components: state.project.components.length
  };
}
