(() => {
  function createEditorHistory() {
    return {
      undo: [],
      redo: [],
      pending: null,
      pendingTimer: null
    };
  }

  function createTextareaEditor({
    historyLimit = 40,
    getDefaultTextarea = () => null,
    getHistory = () => null,
    setHistory = () => {}
  } = {}) {
    const clock = typeof window !== "undefined" ? window : globalThis;
    const maxHistory = Math.max(1, Number(historyLimit) || 40);

    function defaultTextarea() {
      return getDefaultTextarea?.() || null;
    }

    function textareaSelection(textarea = defaultTextarea()) {
      if (!textarea) return { start: 0, end: 0, selected: "" };
      const start = Math.max(0, textarea.selectionStart || 0);
      const end = Math.max(start, textarea.selectionEnd || start);
      return {
        start,
        end,
        selected: textarea.value.slice(start, end)
      };
    }

    function editorHistoryForTextarea(textarea) {
      const history = getHistory(textarea);
      if (history) return history;
      const nextHistory = createEditorHistory();
      setHistory(textarea, nextHistory);
      return nextHistory;
    }

    function resetEditorHistory(textarea = defaultTextarea()) {
      const previous = editorHistoryForTextarea(textarea);
      if (previous?.pendingTimer) clock.clearTimeout(previous.pendingTimer);
      setHistory(textarea, createEditorHistory());
    }

    function editorSnapshot(textarea) {
      const selection = textareaSelection(textarea);
      return {
        value: textarea?.value || "",
        start: selection.start,
        end: selection.end
      };
    }

    function editorSnapshotsEqual(left, right) {
      return Boolean(left && right) &&
        left.value === right.value &&
        left.start === right.start &&
        left.end === right.end;
    }

    function pushEditorUndoSnapshot(textarea, snapshot = editorSnapshot(textarea)) {
      if (!textarea) return;
      const history = editorHistoryForTextarea(textarea);
      if (editorSnapshotsEqual(history.undo[history.undo.length - 1], snapshot)) return;
      history.undo.push(snapshot);
      if (history.undo.length > maxHistory) history.undo.shift();
      history.redo = [];
    }

    function restoreEditorSnapshot(textarea, snapshot, onChange) {
      if (!textarea || !snapshot) return false;
      textarea.value = snapshot.value;
      const end = textarea.value.length;
      textarea.setSelectionRange(Math.min(snapshot.start, end), Math.min(snapshot.end, end));
      textarea.focus();
      onChange?.();
      return true;
    }

    function handleTextareaUndoShortcut(event, { textarea = event?.target, onChange } = {}) {
      if (!textarea || event.defaultPrevented) return false;
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return false;
      const key = String(event.key || "").toLowerCase();
      const wantsUndo = key === "z" && !event.shiftKey;
      const wantsRedo = key === "y" || (key === "z" && event.shiftKey);
      if (!wantsUndo && !wantsRedo) return false;
      const history = editorHistoryForTextarea(textarea);
      const action = wantsRedo ? "redo" : "undo";
      const stack = action === "redo" ? history.redo : history.undo;
      if (!stack.length) return false;
      const before = editorSnapshot(textarea);
      if (history.pendingTimer) clock.clearTimeout(history.pendingTimer);
      history.pending = { action, before };
      history.pendingTimer = clock.setTimeout(() => {
        history.pendingTimer = null;
        if (!history.pending || history.pending.action !== action) return;
        if (!editorSnapshotsEqual(editorSnapshot(textarea), before)) {
          history.pending = null;
          return;
        }
        const activeStack = action === "redo" ? history.redo : history.undo;
        const next = activeStack.pop();
        if (!next) return;
        if (action === "redo") history.undo.push(before);
        else history.redo.push(before);
        restoreEditorSnapshot(textarea, next, onChange);
        history.pending = null;
      }, 80);
      return false;
    }

    function syncProgrammaticUndoFallback(event, textarea = defaultTextarea()) {
      const action = event?.inputType === "historyRedo" ? "redo" : event?.inputType === "historyUndo" ? "undo" : "";
      if (!textarea || !action) return;
      const history = editorHistoryForTextarea(textarea);
      const pending = history.pending?.action === action ? history.pending : null;
      const stack = action === "redo" ? history.redo : history.undo;
      const current = editorSnapshot(textarea);
      const expected = stack[stack.length - 1];
      if (expected?.value === current.value) {
        stack.pop();
        if (pending?.before && !editorSnapshotsEqual(pending.before, current)) {
          if (action === "redo") history.undo.push(pending.before);
          else history.redo.push(pending.before);
        }
      }
      if (pending) {
        if (history.pendingTimer) clock.clearTimeout(history.pendingTimer);
        history.pendingTimer = null;
        history.pending = null;
      }
    }

    function clearProgrammaticHistoryOnTextInput(event, textarea = defaultTextarea()) {
      if (!textarea || !event?.inputType || event.inputType === "historyUndo" || event.inputType === "historyRedo") return;
      const history = editorHistoryForTextarea(textarea);
      history.undo = [];
      history.redo = [];
      if (history.pendingTimer) clock.clearTimeout(history.pendingTimer);
      history.pendingTimer = null;
      history.pending = null;
    }

    function replaceTextareaSelection(text, selectStart = 0, selectEnd = text.length, { textarea = defaultTextarea(), onChange } = {}) {
      if (!textarea) return;
      pushEditorUndoSnapshot(textarea);
      const { start, end } = textareaSelection(textarea);
      textarea.setRangeText(text, start, end, "end");
      textarea.focus();
      textarea.setSelectionRange(start + selectStart, start + selectEnd);
      onChange?.();
    }

    function surroundTextareaSelection(before, after = before, options = {}) {
      const { selected } = textareaSelection(options.textarea || defaultTextarea());
      replaceTextareaSelection(`${before}${selected}${after}`, before.length, before.length + selected.length, options);
    }

    function insertAtCurrentLine(prefix, { textarea = defaultTextarea(), onChange } = {}) {
      if (!textarea) return;
      pushEditorUndoSnapshot(textarea);
      const position = Math.max(0, textarea.selectionStart || 0);
      const lineStart = textarea.value.lastIndexOf("\n", position - 1) + 1;
      textarea.setRangeText(prefix, lineStart, lineStart, "end");
      textarea.focus();
      textarea.setSelectionRange(position + prefix.length, position + prefix.length);
      onChange?.();
    }

    function applyTextareaCommand(command, options = {}) {
      if (command === "bold") surroundTextareaSelection("**", "**", options);
      else if (command === "italic") surroundTextareaSelection("_", "_", options);
      else if (command === "heading") insertAtCurrentLine("## ", options);
      else if (command === "code") surroundTextareaSelection("`", "`", options);
      else if (command === "link") replaceTextareaSelection("[link text](https://)", 1, 10, options);
      else if (command === "image") replaceTextareaSelection("![alt text](https://)", 2, 10, options);
      else if (command === "table") replaceTextareaSelection("| Column | Value |\n| --- | --- |\n|  |  |\n", 34, 34, options);
    }

    return {
      textareaSelection,
      resetEditorHistory,
      pushEditorUndoSnapshot,
      restoreEditorSnapshot,
      handleTextareaUndoShortcut,
      syncProgrammaticUndoFallback,
      clearProgrammaticHistoryOnTextInput,
      replaceTextareaSelection,
      surroundTextareaSelection,
      insertAtCurrentLine,
      applyTextareaCommand
    };
  }

  const api = {
    createEditorHistory,
    createTextareaEditor
  };

  if (typeof window !== "undefined") {
    window.xPosterSidepanelEditor = api;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
