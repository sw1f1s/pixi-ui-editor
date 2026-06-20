import {
  coalesce,
  interpolateString
} from "../helpers.js";

export function resolveNodeText(node, context) {
  const localizationKey = coalesce(node.localizationKey, node.i18nKey, node.props?.localizationKey, node.props?.i18nKey);
  let text = coalesce(node.text, node.props?.text, node.props?.value, "");

  if (localizationKey && context.localeTable?.[localizationKey] !== undefined) {
    text = context.localeTable[localizationKey];
  }

  return interpolateString(text, context.data || {});
}
