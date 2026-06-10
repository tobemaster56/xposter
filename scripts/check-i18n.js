const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const readText = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const SIDEPANEL_RUNTIME_FILES = [
  "src/sidepanel-messages.js",
  "src/sidepanel-patterns.js",
  "sidepanel.js"
];
const SIDEPANEL_SCRIPT_ORDER = [
  "src/i18n.js",
  "src/shared.js",
  "src/sidepanel-messages.js",
  "src/sidepanel-patterns.js",
  "sidepanel.js"
];
const DIAGNOSTICS_SCRIPT_ORDER = [
  "src/shared.js",
  "src/i18n.js",
  "diagnostics.js"
];

function fail(message) {
  console.error(`i18n check failed: ${message}`);
  process.exitCode = 1;
}

function decodeHtmlAttribute(value) {
  return String(value || "")
    .replace(/&#10;/g, "\n")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function decodeJsString(value) {
  try {
    return JSON.parse(`"${String(value || "").replace(/"/g, "\\\"")}"`);
  } catch {
    return String(value || "");
  }
}

function messageKeys(locale) {
  return new Set(Object.keys(readJson(`_locales/${locale}/messages.json`)));
}

function assertScriptOrder(html, scripts, label) {
  let cursor = -1;
  for (const script of scripts) {
    const index = html.indexOf(`src="${script}"`);
    if (index === -1) {
      fail(`${label} must load ${script}`);
      return;
    }
    if (index <= cursor) {
      fail(`${label} must load ${scripts.join(", ")} in order`);
      return;
    }
    cursor = index;
  }
}

const localeDirs = fs
  .readdirSync(path.join(root, "_locales"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const enLocaleKeys = messageKeys("en");
for (const locale of localeDirs.filter((locale) => locale !== "en")) {
  const localeKeys = messageKeys(locale);
  for (const key of enLocaleKeys) {
    if (!localeKeys.has(key)) fail(`_locales/${locale}/messages.json is missing "${key}"`);
  }
  for (const key of localeKeys) {
    if (!enLocaleKeys.has(key)) fail(`_locales/en/messages.json is missing "${key}"`);
  }
}

const manifest = readJson("manifest.json");
if (manifest.default_locale !== "en") fail("manifest.json must set default_locale to en");

const manifestText = readText("manifest.json");
for (const [, key] of manifestText.matchAll(/__MSG_([A-Za-z0-9_]+)__/g)) {
  if (!enLocaleKeys.has(key)) fail(`manifest references missing locale message "${key}"`);
}

const sidepanelRuntimeText = SIDEPANEL_RUNTIME_FILES.map(readText).join("\n");
const runtimeText = `${sidepanelRuntimeText}\n${readText("diagnostics.js")}`;
const runtimeKeys = new Set();
for (const [, key] of runtimeText.matchAll(/"([^"\n]+)"\s*:\s*"[^"]*"/g)) {
  runtimeKeys.add(decodeJsString(key));
}
for (const [, key] of runtimeText.matchAll(/^\s*([A-Za-z][A-Za-z0-9_ ]*)\s*:\s*"[^"]*"/gm)) {
  runtimeKeys.add(key.trim());
}
for (const key of enLocaleKeys) runtimeKeys.add(key);

const sidepanelHtml = readText("sidepanel.html");
const diagnosticsHtml = readText("diagnostics.html");
const htmlText = `${sidepanelHtml}\n${diagnosticsHtml}`;
const htmlI18nKeys = new Set();
for (const [, rawKey] of htmlText.matchAll(/\bdata-i18n(?:-[a-z-]+)?="([^"]+)"/g)) {
  htmlI18nKeys.add(decodeHtmlAttribute(rawKey));
}

for (const key of htmlI18nKeys) {
  if (!runtimeKeys.has(key)) fail(`HTML references missing runtime i18n key "${key.replace(/\n/g, "\\n")}"`);
}

assertScriptOrder(sidepanelHtml, SIDEPANEL_SCRIPT_ORDER, "sidepanel.html");
assertScriptOrder(diagnosticsHtml, DIAGNOSTICS_SCRIPT_ORDER, "diagnostics.html");

if (!process.exitCode) {
  console.log(`i18n check passed (${htmlI18nKeys.size} HTML runtime keys, ${enLocaleKeys.size} Chrome locale keys)`);
}
