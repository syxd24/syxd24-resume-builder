"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { ClipboardEvent, KeyboardEvent, MouseEvent, ReactNode } from "react";
import type { RichText } from "@/domain/resume/schema";
import {
  clipboardToRichText,
  editorElementToRichText,
  richTextToEditorHtml,
  safeRichTextHref,
} from "./rich-text-codec";
import styles from "./content-editor.module.css";

type EditorCommand = "bold" | "italic" | "underline" | "insertUnorderedList" | "insertOrderedList";
type ActiveFormats = { bold: boolean; italic: boolean; underline: boolean; bullet: boolean; ordered: boolean };

export type RichTextEditorProps = {
  value: RichText;
  onChange: (value: RichText) => void;
  label: string;
};

const EMPTY_FORMATS: ActiveFormats = {
  bold: false,
  italic: false,
  underline: false,
  bullet: false,
  ordered: false,
};

function selectionBelongsToEditor(editor: HTMLElement, selection: Selection | null): selection is Selection {
  return Boolean(selection?.anchorNode && editor.contains(selection.anchorNode));
}

function closestLink(node: Node | null, editor: HTMLElement): HTMLAnchorElement | null {
  const element = node instanceof Element ? node : node?.parentElement;
  const link = element?.closest("a");
  return link instanceof HTMLAnchorElement && editor.contains(link) ? link : null;
}

function replaceEmptyEditor(editor: HTMLElement, html: string): boolean {
  if ((editor.textContent ?? "").trim()) return false;
  editor.innerHTML = html;
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(editor);
  range.collapse(false);
  selection?.removeAllRanges();
  selection?.addRange(range);
  return true;
}

function insertHtmlAtSelection(editor: HTMLElement, html: string): void {
  editor.focus();
  if (replaceEmptyEditor(editor, html)) return;
  if (typeof document.execCommand === "function" && document.execCommand("insertHTML", false, html)) return;

  const selection = window.getSelection();
  if (!selectionBelongsToEditor(editor, selection) || selection.rangeCount === 0) {
    editor.insertAdjacentHTML("beforeend", html);
    return;
  }
  const range = selection.getRangeAt(0);
  const template = document.createElement("template");
  template.innerHTML = html;
  const fragment = template.content;
  const lastNode = fragment.lastChild;
  range.deleteContents();
  range.insertNode(fragment);
  if (lastNode) {
    range.setStartAfter(lastNode);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

function ToolbarIcon({ children }: { children: ReactNode }) {
  return <span aria-hidden="true">{children}</span>;
}

export function RichTextEditor({ value, onChange, label }: RichTextEditorProps) {
  const id = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range>(undefined);
  const lastEmittedRef = useRef<string>(undefined);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkValue, setLinkValue] = useState("");
  const [linkError, setLinkError] = useState("");
  const [activeFormats, setActiveFormats] = useState<ActiveFormats>(EMPTY_FORMATS);
  const serializedValue = JSON.stringify(value);

  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor || lastEmittedRef.current === serializedValue) return;
    editor.innerHTML = richTextToEditorHtml(value);
  }, [serializedValue, value]);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = editorElementToRichText(editor);
    lastEmittedRef.current = JSON.stringify(next);
    onChange(next);
  }, [onChange]);

  const refreshActiveFormats = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selectionBelongsToEditor(editor, selection)) {
      setActiveFormats(EMPTY_FORMATS);
      return;
    }
    if (typeof document.queryCommandState !== "function") return;
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      underline: document.queryCommandState("underline"),
      bullet: document.queryCommandState("insertUnorderedList"),
      ordered: document.queryCommandState("insertOrderedList"),
    });
  }, []);

  const rememberSelection = useCallback(() => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selectionBelongsToEditor(editor, selection) || selection.rangeCount === 0) return;
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    refreshActiveFormats();
  }, [refreshActiveFormats]);

  const restoreSelection = () => {
    const editor = editorRef.current;
    const range = savedRangeRef.current;
    if (!editor || !range) return false;
    editor.focus();
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    return true;
  };

  const runCommand = (command: EditorCommand) => {
    const editor = editorRef.current;
    if (!editor) return;
    restoreSelection();
    editor.focus();
    if (typeof document.execCommand === "function") document.execCommand(command, false);
    rememberSelection();
    emitChange();
  };

  const keepEditorSelection = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
  };

  const openLinkEditor = () => {
    const editor = editorRef.current;
    const range = savedRangeRef.current;
    if (!editor) return;
    const existingLink = closestLink(range?.commonAncestorContainer ?? null, editor);
    if (existingLink && range?.collapsed) {
      const linkRange = document.createRange();
      linkRange.selectNodeContents(existingLink);
      savedRangeRef.current = linkRange;
    }
    setLinkValue(existingLink?.getAttribute("href") ?? "");
    setLinkError("");
    setLinkOpen(true);
    window.setTimeout(() => document.getElementById(`${id}-link-input`)?.focus(), 0);
  };

  const applyLink = () => {
    const editor = editorRef.current;
    const href = safeRichTextHref(linkValue);
    if (!editor) return;
    if (!href) {
      setLinkError("Enter a valid web, email, or phone link.");
      return;
    }
    if (!restoreSelection() || savedRangeRef.current?.collapsed) {
      setLinkError("Select the text you want to link.");
      return;
    }
    if (typeof document.execCommand === "function") document.execCommand("createLink", false, href);
    setLinkOpen(false);
    setLinkError("");
    rememberSelection();
    emitChange();
  };

  const removeLink = () => {
    if (!restoreSelection()) return;
    if (typeof document.execCommand === "function") document.execCommand("unlink", false);
    setLinkOpen(false);
    setLinkValue("");
    setLinkError("");
    rememberSelection();
    emitChange();
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = clipboardToRichText(
      event.clipboardData.getData("text/html"),
      event.clipboardData.getData("text/plain"),
    );
    if (!pasted.length) return;
    insertHtmlAtSelection(event.currentTarget, richTextToEditorHtml(pasted));
    rememberSelection();
    emitChange();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
    const key = event.key.toLowerCase();
    const commands: Partial<Record<string, EditorCommand>> = {
      b: "bold",
      i: "italic",
      u: "underline",
    };
    const command = commands[key];
    if (command) {
      event.preventDefault();
      runCommand(command);
    } else if (key === "k") {
      event.preventDefault();
      rememberSelection();
      openLinkEditor();
    }
    // Undo and redo remain native so the browser preserves its contenteditable history.
  };

  return (
    <fieldset className={styles.richEditor}>
      <legend>{label}</legend>
      <div className={styles.richEditorFrame}>
        <div className={styles.richToolbar} role="toolbar" aria-label={`${label} formatting`}>
          <button type="button" className={styles.richToolbarButton} aria-label="Bold selected text" aria-pressed={activeFormats.bold} title="Bold (Ctrl+B)" onMouseDown={keepEditorSelection} onClick={() => runCommand("bold")}><ToolbarIcon><strong>B</strong></ToolbarIcon></button>
          <button type="button" className={styles.richToolbarButton} aria-label="Italicize selected text" aria-pressed={activeFormats.italic} title="Italic (Ctrl+I)" onMouseDown={keepEditorSelection} onClick={() => runCommand("italic")}><ToolbarIcon><em>I</em></ToolbarIcon></button>
          <button type="button" className={styles.richToolbarButton} aria-label="Underline selected text" aria-pressed={activeFormats.underline} title="Underline (Ctrl+U)" onMouseDown={keepEditorSelection} onClick={() => runCommand("underline")}><ToolbarIcon><u>U</u></ToolbarIcon></button>
          <span className={styles.toolbarDivider} aria-hidden="true" />
          <button type="button" className={styles.richToolbarButton} aria-label="Toggle unordered list" aria-pressed={activeFormats.bullet} title="Bullet list" onMouseDown={keepEditorSelection} onClick={() => runCommand("insertUnorderedList")}><ToolbarIcon>&bull;&equiv;</ToolbarIcon></button>
          <button type="button" className={styles.richToolbarButton} aria-label="Toggle ordered list" aria-pressed={activeFormats.ordered} title="Numbered list" onMouseDown={keepEditorSelection} onClick={() => runCommand("insertOrderedList")}><ToolbarIcon>1&equiv;</ToolbarIcon></button>
          <span className={styles.toolbarDivider} aria-hidden="true" />
          <button type="button" className={styles.richToolbarButton} aria-label="Insert or edit hyperlink" aria-expanded={linkOpen} title="Link (Ctrl+K)" onMouseDown={keepEditorSelection} onClick={openLinkEditor}><ToolbarIcon>&#128279;</ToolbarIcon></button>
        </div>

        {linkOpen ? (
          <div className={styles.linkPopover} role="group" aria-label="Edit hyperlink">
            <label htmlFor={`${id}-link-input`}>Link</label>
            <input id={`${id}-link-input`} type="url" value={linkValue} placeholder="https://example.com" aria-describedby={linkError ? `${id}-link-error` : undefined} onChange={(event) => { setLinkValue(event.target.value); setLinkError(""); }} onKeyDown={(event) => {
              if (event.key === "Enter") { event.preventDefault(); applyLink(); }
              else if (event.key === "Escape") { setLinkOpen(false); restoreSelection(); }
            }} />
            <button type="button" onClick={applyLink}>Apply</button>
            <button type="button" onClick={removeLink}>Remove</button>
            <button type="button" aria-label="Close link editor" onClick={() => setLinkOpen(false)}>&times;</button>
            {linkError ? <span id={`${id}-link-error`} className={styles.linkError}>{linkError}</span> : null}
          </div>
        ) : null}

        <div
          ref={editorRef}
          className={styles.richTextSurface}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-label={label}
          aria-multiline="true"
          data-placeholder="Write a paragraph or paste bullet points..."
          spellCheck
          onInput={emitChange}
          onPaste={handlePaste}
          onKeyDown={handleKeyDown}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onSelect={rememberSelection}
          onFocus={rememberSelection}
        />
      </div>
      <p className={styles.richEditorHint}>Paste complete bullet lists. Enter continues a list; Shift+Enter adds a line break.</p>
    </fieldset>
  );
}
