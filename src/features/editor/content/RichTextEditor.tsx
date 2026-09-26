"use client";

import { useId, useState } from "react";
import type { KeyboardEvent, SyntheticEvent } from "react";
import type { RichText } from "@/domain/resume/schema";
import { normalizeUrl } from "./editor-utils";
import styles from "./content-editor.module.css";

type Mark = "bold" | "italic" | "underline";
type Selection = { blockIndex: number; start: number; end: number };

export type RichTextEditorProps = {
  value: RichText;
  onChange: (value: RichText) => void;
  label: string;
};

function blockText(block: RichText[number]): string {
  return block.spans?.map((span) => span.text).join("") ?? block.text;
}

function formatSelection(block: RichText[number], start: number, end: number, mark: Mark): RichText[number] {
  if (start === end) return block;
  const source = block.spans?.length ? block.spans : [{ text: block.text, marks: [] as Mark[] }];
  const selectedMarks = source.flatMap((span) =>
    Array.from(span.text, () => span.marks.includes(mark)),
  ).slice(start, end);
  const shouldRemove = selectedMarks.length > 0 && selectedMarks.every(Boolean);
  let offset = 0;
  const spans = source.flatMap((span) => {
    const spanStart = offset;
    const spanEnd = offset + span.text.length;
    offset = spanEnd;
    const cuts = [...new Set([spanStart, Math.max(spanStart, start), Math.min(spanEnd, end), spanEnd])]
      .filter((cut) => cut >= spanStart && cut <= spanEnd)
      .sort((a, b) => a - b);
    return cuts.slice(0, -1).map((cut, index) => {
      const nextCut = cuts[index + 1] ?? cut;
      const selected = cut < end && nextCut > start;
      const marks = selected
        ? shouldRemove
          ? span.marks.filter((item) => item !== mark)
          : [...new Set([...span.marks, mark])]
        : span.marks;
      return { ...span, text: span.text.slice(cut - spanStart, nextCut - spanStart), marks };
    });
  }).filter((span) => span.text.length > 0);
  return { ...block, text: spans.map((span) => span.text).join(""), spans };
}

function linkSelection(block: RichText[number], start: number, end: number, href?: string): RichText[number] {
  if (start === end) return block;
  const source = block.spans?.length ? block.spans : [{ text: block.text, marks: [] as Mark[] }];
  let offset = 0;
  const spans = source.flatMap((span) => {
    const spanStart = offset;
    const spanEnd = offset + span.text.length;
    offset = spanEnd;
    const cuts = [...new Set([spanStart, Math.max(spanStart, start), Math.min(spanEnd, end), spanEnd])]
      .filter((cut) => cut >= spanStart && cut <= spanEnd)
      .sort((a, b) => a - b);
    return cuts.slice(0, -1).map((cut, index) => {
      const nextCut = cuts[index + 1] ?? cut;
      const selected = cut < end && nextCut > start;
      return {
        ...span,
        text: span.text.slice(cut - spanStart, nextCut - spanStart),
        ...(selected ? { href } : {}),
      };
    });
  }).filter((span) => span.text.length > 0);
  return { ...block, text: spans.map((span) => span.text).join(""), spans };
}

function RichPreview({ value }: { value: RichText }) {
  return (
    <div className={styles.richPreview} aria-label="Formatting preview">
      {value.map((block, blockIndex) => {
        const children = (block.spans?.length ? block.spans : [{ text: block.text, marks: [] }]).map((span, spanIndex) => {
          let content = <>{span.text}</>;
          if (span.marks.includes("bold")) content = <strong>{content}</strong>;
          if (span.marks.includes("italic")) content = <em>{content}</em>;
          if (span.marks.includes("underline")) content = <u>{content}</u>;
          return span.href ? <a key={spanIndex} href={span.href}>{content}</a> : <span key={spanIndex}>{content}</span>;
        });
        if (block.type === "bullet") return <div key={blockIndex}>• {children}</div>;
        if (block.type === "ordered-item") return <div key={blockIndex}>{blockIndex + 1}. {children}</div>;
        return <p key={blockIndex}>{children}</p>;
      })}
    </div>
  );
}

export function RichTextEditor({ value, onChange, label }: RichTextEditorProps) {
  const id = useId();
  const blocks = value.length ? value : [{ type: "paragraph" as const, text: "" }];
  const [selection, setSelection] = useState<Selection>({ blockIndex: 0, start: 0, end: 0 });
  const [link, setLink] = useState("");

  const updateBlock = (index: number, block: RichText[number]) => {
    const next = [...blocks];
    next[index] = block;
    onChange(next);
  };

  const captureSelection = (event: SyntheticEvent<HTMLTextAreaElement>, blockIndex: number) => {
    const target = event.currentTarget;
    setSelection({ blockIndex, start: target.selectionStart, end: target.selectionEnd });
  };

  const applyMark = (mark: Mark) => {
    const block = blocks[selection.blockIndex];
    if (!block) return;
    updateBlock(selection.blockIndex, formatSelection(block, selection.start, selection.end, mark));
  };

  const applyLink = () => {
    const block = blocks[selection.blockIndex];
    if (!block) return;
    const href = normalizeUrl(link) || undefined;
    updateBlock(selection.blockIndex, linkSelection(block, selection.start, selection.end, href));
    if (href) setLink(href);
  };

  const splitBlock = (event: KeyboardEvent<HTMLTextAreaElement>, index: number) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    const target = event.currentTarget;
    const text = blockText(blocks[index]!);
    const before = text.slice(0, target.selectionStart);
    const after = text.slice(target.selectionEnd);
    const next = [...blocks];
    next.splice(index, 1, { ...blocks[index]!, text: before, spans: undefined }, { type: blocks[index]!.type, text: after });
    onChange(next);
    setSelection({ blockIndex: index + 1, start: 0, end: 0 });
  };

  return (
    <fieldset className={styles.richEditor}>
      <legend>{label}</legend>
      <div className={styles.richToolbar} role="toolbar" aria-label={`${label} formatting`}>
        <button type="button" onClick={() => applyMark("bold")} aria-label="Bold selected text"><strong>B</strong></button>
        <button type="button" onClick={() => applyMark("italic")} aria-label="Italicize selected text"><em>I</em></button>
        <button type="button" onClick={() => applyMark("underline")} aria-label="Underline selected text"><u>U</u></button>
        <button type="button" onClick={() => {
          const block = blocks[selection.blockIndex];
          if (block) updateBlock(selection.blockIndex, { ...block, type: block.type === "bullet" ? "paragraph" : "bullet" });
        }} aria-label="Toggle unordered list">• List</button>
        <button type="button" onClick={() => {
          const block = blocks[selection.blockIndex];
          if (block) updateBlock(selection.blockIndex, { ...block, type: block.type === "ordered-item" ? "paragraph" : "ordered-item" });
        }} aria-label="Toggle ordered list">1. List</button>
      </div>
      <div className={styles.linkControls}>
        <label htmlFor={`${id}-link`}>Link for selected text</label>
        <input id={`${id}-link`} value={link} onChange={(event) => setLink(event.target.value)} placeholder="example.com" />
        <button type="button" onClick={applyLink}>Apply link</button>
        <button type="button" onClick={() => {
          setLink("");
          const block = blocks[selection.blockIndex];
          if (block) updateBlock(selection.blockIndex, linkSelection(block, selection.start, selection.end));
        }}>Remove link</button>
      </div>
      <div className={styles.richBlocks}>
        {blocks.map((block, index) => (
          <div className={styles.richBlock} key={index}>
            <label htmlFor={`${id}-block-${index}`}>{block.type === "paragraph" ? `Paragraph ${index + 1}` : block.type === "bullet" ? `Bullet ${index + 1}` : `Numbered item ${index + 1}`}</label>
            <textarea
              id={`${id}-block-${index}`}
              value={blockText(block)}
              rows={3}
              onFocus={(event) => captureSelection(event, index)}
              onSelect={(event) => captureSelection(event, index)}
              onKeyDown={(event) => splitBlock(event, index)}
              onChange={(event) => updateBlock(index, { ...block, text: event.target.value, spans: undefined })}
            />
            <div className={styles.inlineActions}>
              <button type="button" disabled={index === 0} onClick={() => onChange(blocks.filter((_, itemIndex) => itemIndex !== index))}>Remove block</button>
              <span>Enter starts a new block; Shift+Enter inserts a line break.</span>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className={styles.secondaryButton} onClick={() => onChange([...blocks, { type: "paragraph", text: "" }])}>Add paragraph</button>
      <RichPreview value={blocks} />
    </fieldset>
  );
}

