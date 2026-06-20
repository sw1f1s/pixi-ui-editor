export const els = {};
export const state = {};

export const session = {
  canvasContext: null,
  editorPreviewRenderer: null,
  imageAssetCache: new Map(),
  fontAssetCache: new Map(),
  assetObjectUrls: new Map(),
  persistentAssetObjectUrls: new Map(),
  activeProjectFileHandle: null,
  activeProjectFileName: null
};

export const editorApi = {};

export function setEditorElements(nextElements) {
  replaceObjectContents(els, nextElements);
}

export function setEditorState(nextState) {
  replaceObjectContents(state, nextState);
}

export function registerEditorApi(...featureApis) {
  Object.assign(editorApi, ...featureApis);
  return editorApi;
}

export function bindEditorApi(names) {
  return Object.fromEntries(names.map((name) => [
    name,
    (...args) => editorApi[name](...args)
  ]));
}

function replaceObjectContents(target, source) {
  for (const key of Object.keys(target)) {
    delete target[key];
  }
  Object.assign(target, source);
}
