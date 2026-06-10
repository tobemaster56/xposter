(() => {
  const STORAGE_LANGUAGE = "xposter_language";
  const AUTO_LANGUAGE = "auto";
  // Simplified Chinese only. English is kept as an internal fallback layer so any
  // UI string without a Chinese translation still renders its English source text.
  const LANGUAGE_OPTIONS = [
    { code: "zh", nativeName: "中文", htmlLang: "zh-CN" }
  ];
  const SUPPORTED_LANGUAGES = new Set(["zh"]);
  const MESSAGE_LANGUAGES = ["en", "zh"];
  const LANGUAGE_META = new Map(LANGUAGE_OPTIONS.map((item) => [item.code, item]));
  const LANGUAGE_FALLBACKS = new Map();
  const messages = Object.fromEntries(MESSAGE_LANGUAGES.map((language) => [language, {}]));
  const reverse = Object.fromEntries(MESSAGE_LANGUAGES.map((language) => [language, new Map()]));
  const missing = new Set();
  let currentPreference = AUTO_LANGUAGE;
  let currentLanguage = preferredLanguage();

  function hasChromeStorage() {
    return typeof chrome !== "undefined" && Boolean(chrome.storage?.local);
  }

  function normalizeLanguage(language) {
    const lower = String(language || "").replace("_", "-").toLowerCase();
    if (lower === "en" || lower.split("-")[0] === "en") return "en";
    return "zh";
  }

  function normalizeLanguagePreference(language) {
    const lower = String(language || "").replace("_", "-").toLowerCase();
    if (lower === AUTO_LANGUAGE || lower === "system" || lower === "browser") return AUTO_LANGUAGE;
    return normalizeLanguage(language);
  }

  function resolvePreference(preference = currentPreference) {
    return preference === AUTO_LANGUAGE ? preferredLanguage() : normalizeLanguage(preference);
  }

  function preferredLanguage() {
    // The side panel ships in Simplified Chinese only.
    return "zh";
  }

  function rebuildReverse() {
    for (const language of Object.keys(reverse)) {
      reverse[language].clear();
    }
    for (const [language, table] of Object.entries(messages)) {
      for (const [key, value] of Object.entries(table)) {
        reverse[language].set(value, key);
      }
    }
  }

  function registerMessages(nextMessages = {}) {
    for (const [language, table] of Object.entries(nextMessages)) {
      const normalized = normalizeLanguage(language);
      if (!messages[normalized] || !table || typeof table !== "object") continue;
      Object.assign(messages[normalized], table);
    }
    rebuildReverse();
  }

  function registerLegacyMap(language, map) {
    if (!(map instanceof Map)) return;
    registerMessages({ [language]: Object.fromEntries(map.entries()) });
  }

  function sourceKey(value) {
    const text = String(value ?? "");
    for (const language of languageChain(currentLanguage, true)) {
      const source = reverse[language]?.get(text);
      if (source) return source;
    }
    return text;
  }

  function languageChain(language = currentLanguage, includeAll = false) {
    const normalized = normalizeLanguage(language);
    return Array.from(new Set([
      normalized,
      ...(LANGUAGE_FALLBACKS.get(normalized) || []),
      "en",
      ...(includeAll ? SUPPORTED_LANGUAGES : [])
    ]));
  }

  function interpolate(template, values = {}) {
    return String(template ?? "").replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
  }

  function t(key, values = {}) {
    const normalizedKey = sourceKey(key);
    let source = null;
    for (const language of languageChain(currentLanguage)) {
      if (messages[language]?.[normalizedKey] == null) continue;
      source = messages[language][normalizedKey];
      break;
    }
    if (source == null) {
      if (currentLanguage !== "en") missing.add(normalizedKey);
      return interpolate(normalizedKey, values);
    }
    return interpolate(source, values);
  }

  function setText(element, key, values = {}) {
    if (element) element.textContent = t(key, values);
  }

  function setAttr(element, attr, key, values = {}) {
    if (element) element.setAttribute(attr, t(key, values));
  }

  function renderDom(root = document.body) {
    root.querySelectorAll("[data-i18n]").forEach((element) => {
      setText(element, element.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-title]").forEach((element) => {
      setAttr(element, "title", element.dataset.i18nTitle);
    });
    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      setAttr(element, "aria-label", element.dataset.i18nAriaLabel);
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
      setAttr(element, "placeholder", element.dataset.i18nPlaceholder);
    });
    root.querySelectorAll("[data-i18n-value]").forEach((element) => {
      element.value = t(element.dataset.i18nValue);
    });
    document.documentElement.lang = htmlLang();
    document.body.dataset.language = currentLanguage;
    document.body.dataset.languagePreference = currentPreference;
  }

  async function setLanguage(language, { persist = true, render = true } = {}) {
    currentPreference = normalizeLanguagePreference(language);
    currentLanguage = resolvePreference(currentPreference);
    if (render) renderDom();
    if (persist && hasChromeStorage()) {
      await chrome.storage.local.set({ [STORAGE_LANGUAGE]: currentPreference }).catch(() => {});
    }
    window.dispatchEvent(new CustomEvent("xposter:i18n-language", {
      detail: { language: currentLanguage, preference: currentPreference }
    }));
    return currentLanguage;
  }

  async function restoreLanguage({ render = true } = {}) {
    return setLanguage(AUTO_LANGUAGE, { persist: false, render });
  }

  function language() {
    return currentLanguage;
  }

  function preference() {
    return currentPreference;
  }

  function htmlLang(language = currentLanguage) {
    return LANGUAGE_META.get(normalizeLanguage(language))?.htmlLang || "zh-CN";
  }

  function languageOptions() {
    return LANGUAGE_OPTIONS.map((option) => ({ ...option }));
  }

  function missingKeys() {
    return Array.from(missing).sort();
  }

  window.xPosterI18n = {
    STORAGE_LANGUAGE,
    AUTO_LANGUAGE,
    language,
    preference,
    languageOptions,
    normalizeLanguage,
    normalizeLanguagePreference,
    preferredLanguage,
    htmlLang,
    registerMessages,
    registerLegacyMap,
    restoreLanguage,
    setLanguage,
    renderDom,
    setText,
    setAttr,
    sourceKey,
    t,
    missingKeys
  };
})();
