import type { RichText } from "@/domain/resume/schema";
import { normalizeUrl } from "./editor-utils";

type RichTextBlock = RichText[number];
type RichTextSpan = NonNullable<RichTextBlock["spans"]>[number];
type Mark = RichTextSpan["marks"][number];

const BULLET_PREFIX = /^\s*[-*\u2022\u25aa\u25e6\u2013\u2014]\s+/;
const ORDERED_PREFIX = /^\s*\d+[.)]\s+/;
const BLOCK_TAGS = new Set(["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6"]);

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function safeRichTextHref(value: string): string | undefined {
  const normalized = normalizeUrl(value);
  if (!normalized) return undefined;
  try {
    const parsed = new URL(normalized);
    return ["http:", "https:", "mailto:", "tel:"].includes(parsed.protocol)
      ? normalized
      : undefined;
  } catch {
    return undefined;
  }
}

function renderSpan(span: RichTextSpan): string {
  let content = escapeHtml(span.text).replaceAll("\n", "<br>");
  if (span.marks.includes("bold")) content = `<strong>${content}</strong>`;
  if (span.marks.includes("italic")) content = `<em>${content}</em>`;
  if (span.marks.includes("underline")) content = `<u>${content}</u>`;
  const href = span.href ? safeRichTextHref(span.href) : undefined;
  return href ? `<a href="${escapeHtml(href)}">${content}</a>` : content;
}

function renderInline(block: RichTextBlock): string {
  const spans = block.spans?.length
    ? block.spans
    : [{ text: block.text, marks: [] as Mark[] }];
  return spans.map(renderSpan).join("") || "<br>";
}

export function richTextToEditorHtml(value: RichText): string {
  if (!value.length) return "<p><br></p>";
  const output: string[] = [];
  let listType: "bullet" | "ordered-item" | undefined;
  let listItems: string[] = [];

  const flushList = () => {
    if (!listType) return;
    const tag = listType === "bullet" ? "ul" : "ol";
    output.push(`<${tag}>${listItems.map((item) => `<li>${item}</li>`).join("")}</${tag}>`);
    listType = undefined;
    listItems = [];
  };

  for (const block of value) {
    if (block.type === "paragraph") {
      flushList();
      output.push(`<p>${renderInline(block)}</p>`);
      continue;
    }
    if (listType && listType !== block.type) flushList();
    listType = block.type;
    listItems.push(renderInline(block));
  }
  flushList();
  return output.join("");
}

function sameMarks(left: readonly Mark[], right: readonly Mark[]): boolean {
  return left.length === right.length && left.every((mark, index) => mark === right[index]);
}

function appendSpan(output: RichTextSpan[], span: RichTextSpan) {
  if (!span.text) return;
  const previous = output.at(-1);
  if (previous && previous.href === span.href && sameMarks(previous.marks, span.marks)) {
    previous.text += span.text;
    return;
  }
  output.push(span);
}

function styleMarks(element: Element): Mark[] {
  const style = element.getAttribute("style")?.toLowerCase() ?? "";
  const marks: Mark[] = [];
  if (/font-weight\s*:\s*(?:bold|[6-9]00)/.test(style)) marks.push("bold");
  if (/font-style\s*:\s*italic/.test(style)) marks.push("italic");
  if (/text-decoration(?:-line)?\s*:[^;]*underline/.test(style)) marks.push("underline");
  return marks;
}

function collectInline(
  node: Node,
  output: RichTextSpan[],
  inheritedMarks: readonly Mark[] = [],
  inheritedHref?: string,
) {
  if (node.nodeType === Node.TEXT_NODE) {
    appendSpan(output, {
      text: (node.textContent ?? "").replaceAll("\u00a0", " ").replaceAll("\u200b", ""),
      marks: [...inheritedMarks],
      ...(inheritedHref ? { href: inheritedHref } : {}),
    });
    return;
  }
  if (!(node instanceof Element)) return;
  if (node.tagName === "BR") {
    appendSpan(output, {
      text: "\n",
      marks: [...inheritedMarks],
      ...(inheritedHref ? { href: inheritedHref } : {}),
    });
    return;
  }

  const marks = new Set(inheritedMarks);
  if (node.matches("B, STRONG")) marks.add("bold");
  if (node.matches("I, EM")) marks.add("italic");
  if (node.matches("U")) marks.add("underline");
  for (const mark of styleMarks(node)) marks.add(mark);
  const href = node.matches("A")
    ? safeRichTextHref(node.getAttribute("href") ?? "")
    : inheritedHref;
  for (const child of node.childNodes) collectInline(child, output, [...marks], href);
}

function stripSpanPrefix(spans: RichTextSpan[], count: number): RichTextSpan[] {
  let remaining = count;
  return spans.flatMap((span) => {
    if (remaining >= span.text.length) {
      remaining -= span.text.length;
      return [];
    }
    if (remaining > 0) {
      const next = { ...span, text: span.text.slice(remaining) };
      remaining = 0;
      return [next];
    }
    return [span];
  });
}

function blockFromNode(node: Node, fallbackType: RichTextBlock["type"] = "paragraph"): RichTextBlock {
  let spans: RichTextSpan[] = [];
  collectInline(node, spans);
  let text = spans.map((span) => span.text).join("");
  // Browsers commonly keep one terminal BR as a caret placeholder.
  if (text === "\n") {
    spans = [];
    text = "";
  }

  const bulletMatch = fallbackType === "paragraph" ? text.match(BULLET_PREFIX) : null;
  const orderedMatch = fallbackType === "paragraph" ? text.match(ORDERED_PREFIX) : null;
  const type = bulletMatch ? "bullet" : orderedMatch ? "ordered-item" : fallbackType;
  const prefixLength = bulletMatch?.[0].length ?? orderedMatch?.[0].length ?? 0;
  if (prefixLength) {
    spans = stripSpanPrefix(spans, prefixLength);
    text = spans.map((span) => span.text).join("");
  }

  const hasFormatting = spans.some((span) => span.marks.length > 0 || span.href);
  return {
    type,
    text,
    ...(hasFormatting ? { spans } : {}),
  };
}

function parseChildren(parent: ParentNode, output: RichText[]) {
  let looseNodes: Node[] = [];
  const flushLooseNodes = () => {
    if (!looseNodes.length) return;
    const wrapper = document.createElement("p");
    for (const node of looseNodes) wrapper.append(node.cloneNode(true));
    const block = blockFromNode(wrapper);
    if (block.text || block.spans?.length) output.push([block]);
    looseNodes = [];
  };

  for (const node of parent.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent?.trim()) looseNodes.push(node);
      continue;
    }
    if (!(node instanceof Element)) continue;
    const tag = node.tagName;
    if (tag === "UL" || tag === "OL") {
      flushLooseNodes();
      const type = tag === "UL" ? "bullet" : "ordered-item";
      for (const child of node.children) {
        if (child.tagName === "LI") output.push([blockFromNode(child, type)]);
      }
      continue;
    }
    if (tag === "LI") {
      flushLooseNodes();
      output.push([blockFromNode(node, node.parentElement?.tagName === "OL" ? "ordered-item" : "bullet")]);
      continue;
    }
    if (BLOCK_TAGS.has(tag)) {
      flushLooseNodes();
      const nestedLists = [...node.children].some((child) => child.tagName === "UL" || child.tagName === "OL");
      if (nestedLists) parseChildren(node, output);
      else output.push([blockFromNode(node)]);
      continue;
    }
    looseNodes.push(node);
  }
  flushLooseNodes();
}

export function editorElementToRichText(root: HTMLElement): RichText {
  const groups: RichText[] = [];
  parseChildren(root, groups);
  return groups.flat().slice(0, 2_000);
}

export function plainTextToRichText(value: string): RichText {
  const normalized = value.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
  if (!normalized) return [];
  return normalized.split("\n").map((line) => {
    const bullet = line.match(BULLET_PREFIX);
    const ordered = line.match(ORDERED_PREFIX);
    const prefix = bullet?.[0] ?? ordered?.[0] ?? "";
    const content = line.slice(prefix.length);
    const spans: RichTextSpan[] = [];
    const markdown = /(\*\*[^*\n]+\*\*|__[^_\n]+__|\*[^*\n]+\*|_[^_\n]+_|\[([^\]]+)\]\(([^)\s]+)\))/g;
    let cursor = 0;
    for (const match of content.matchAll(markdown)) {
      const index = match.index ?? 0;
      if (index > cursor) appendSpan(spans, { text: content.slice(cursor, index), marks: [] });
      const token = match[0];
      const linkText = match[2];
      const linkHref = match[3];
      if (linkText !== undefined && linkHref !== undefined) {
        spans.push({ text: linkText, marks: [], ...(safeRichTextHref(linkHref) ? { href: safeRichTextHref(linkHref) } : {}) });
      } else {
        const isBold = token.startsWith("**") || token.startsWith("__");
        const text = token.slice(isBold ? 2 : 1, isBold ? -2 : -1);
        appendSpan(spans, { text, marks: [isBold ? "bold" : "italic"] });
      }
      cursor = index + token.length;
    }
    if (cursor < content.length) appendSpan(spans, { text: content.slice(cursor), marks: [] });
    return {
      type: bullet ? "bullet" as const : ordered ? "ordered-item" as const : "paragraph" as const,
      text: spans.length ? spans.map((span) => span.text).join("") : content,
      ...(spans.some((span) => span.marks.length || span.href) ? { spans } : {}),
    };
  });
}

export function clipboardToRichText(html: string, plainText: string): RichText {
  if (html.trim()) {
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const richText = editorElementToRichText(parsed.body);
    if (richText.length) return richText;
  }
  return plainTextToRichText(plainText);
}
