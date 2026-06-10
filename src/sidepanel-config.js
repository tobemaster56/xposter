(() => {
  const STORAGE_DRAFT = "xposter_sidepanel_draft";
  const STORAGE_LIVE_RESULT = "xposter_live_result_checks";
  const STORAGE_LANGUAGE = "xposter_language";
  const STORAGE_THEME = "xposter_theme";
  const STORAGE_IMPORT_OPTIONS = "xposter_import_options";
  const STORAGE_RECORD_HISTORY = "xposter_publish_record_history";
  const STORAGE_DRAFT_QUEUE = "xposter_publish_queue";
  const STORAGE_TARGET_TAB = "xposter_sidepanel_target_tab";

  const X_ARTICLE_MEDIA_LIMIT_WARNING =
    "Images: {count}/{limit}. Remove {extra} image(s) before writing.";
  const X_ARTICLE_MEDIA_HEADROOM_NOTE =
    "Images: {count}/{limit}. Close to X Article's image limit.";
  const X_ARTICLE_MEDIA_CAPACITY_NOTE =
    "Images: {count}/{limit}.";

  const api = {
    IMPORT_ICON_SVG:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v3H4V4Zm0 5h10v3H4V9Zm0 5h8v3H4v-3Zm13.5-.7V9h2v4.3l1.6-1.6 1.4 1.4-3.5 3.5-3.5-3.5 1.4-1.4 1.6 1.6ZM17 18h5v2h-5v-2Z"/></svg>',
    STORAGE_DRAFT,
    STORAGE_LIVE_RESULT,
    STORAGE_LANGUAGE,
    STORAGE_THEME,
    STORAGE_IMPORT_OPTIONS,
    STORAGE_RECORD_HISTORY,
    STORAGE_DRAFT_QUEUE,
    STORAGE_TARGET_TAB,
    MAX_RECORD_HISTORY: 30,
    MAX_DRAFT_QUEUE: 24,
    MAX_DRAFT_QUEUE_STORAGE_BYTES: 4 * 1024 * 1024,
    MAX_DRAFT_QUEUE_ITEM_BYTES: 512 * 1024,
    MAX_RECORD_MARKDOWN_CHARS: 120000,
    X_ARTICLE_MEDIA_SOFT_LIMIT: 25,
    X_ARTICLE_MEDIA_HEADROOM_THRESHOLD: 21,
    X_ARTICLE_MEDIA_LIMIT_WARNING,
    X_ARTICLE_MEDIA_HEADROOM_NOTE,
    X_ARTICLE_MEDIA_CAPACITY_NOTE,
    MARKDOWN_FILE_RE: /\.(md|markdown|mdown|mkd|txt)$/i,
    MARKDOWN_FILE_ACCEPT: ".md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain",
    MARKDOWN_TRANSFER_MIME_RE: /^(text\/markdown|text\/plain|application\/octet-stream)$/i,
    MARKDOWN_LOAD_ERROR_TITLE: "Could not load Markdown",
    MARKDOWN_LOAD_ERROR_DETAIL: "Try a .md, .markdown, .txt file, or plain Markdown text.",
    NO_NEW_DRAFTS_DETAIL: "No new Markdown drafts were added.",
    DRAFT_EDITOR_MODES: new Set(["edit", "read"]),
    EDITOR_HISTORY_LIMIT: 40,
    DRAFT_SAVE_DELAY_MS: 220,
    DRAFT_ANALYZE_DELAY_MS: 140,
    RECORD_SEARCH_DELAY_MS: 120,
    STARTUP_DRAFT_ANALYZE_DELAY_MS: 260,
    STARTUP_IDLE_TIMEOUT_MS: 650,
    STARTUP_PAGE_STATE_TIMEOUT_MS: 900,
    STARTUP_STORAGE_KEYS: [
      STORAGE_DRAFT,
      STORAGE_DRAFT_QUEUE,
      STORAGE_THEME,
      STORAGE_LANGUAGE,
      STORAGE_IMPORT_OPTIONS,
      STORAGE_LIVE_RESULT,
      STORAGE_TARGET_TAB
    ],
    SYNTAX_HIGHLIGHT_DETAIL_LIMIT: 60000,
    THEME_MODES: new Set(["system", "light", "dark"]),
    CONTENT_VERSION_UNKNOWN: "unknown",
    EXTENSION_PATH: "the folder you cloned or downloaded"
  };

  if (typeof window !== "undefined") {
    window.xPosterSidepanelConfig = api;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
