import { Fragment, type ReactNode } from "react";

import type { RichText } from "@/domain/resume";

import { safeHref } from "./format";
import styles from "./resume-renderer.module.css";

type RichTextBlock = RichText[number];

function renderSpan(block: RichTextBlock, blockIndex: number): ReactNode {
  if (!block.spans?.length) return block.text;

  return block.spans.map((span, spanIndex) => {
    let content: ReactNode = span.text;
    if (span.marks.includes("underline")) content = <u>{content}</u>;
    if (span.marks.includes("italic")) content = <em>{content}</em>;
    if (span.marks.includes("bold")) content = <strong>{content}</strong>;

    const href = safeHref(span.href);
    if (href) {
      content = (
        <a href={href} rel="noreferrer" data-resume-link="rich-text">
          {content}
        </a>
      );
    }

    return <Fragment key={`${blockIndex}-${spanIndex}`}>{content}</Fragment>;
  });
}

export function RichTextContent({ value }: { value: RichText }) {
  const rendered: ReactNode[] = [];
  let index = 0;

  while (index < value.length) {
    const block = value[index]!;
    if (block.type === "paragraph") {
      rendered.push(<p key={`paragraph-${index}`}>{renderSpan(block, index)}</p>);
      index += 1;
      continue;
    }

    const listType = block.type;
    const items: ReactNode[] = [];
    const startIndex = index;
    while (index < value.length && value[index]!.type === listType) {
      const item = value[index]!;
      items.push(<li key={`item-${index}`}>{renderSpan(item, index)}</li>);
      index += 1;
    }

    rendered.push(
      listType === "bullet" ? (
        <ul key={`list-${startIndex}`}>{items}</ul>
      ) : (
        <ol key={`list-${startIndex}`}>{items}</ol>
      ),
    );
  }

  return <div className={styles.richText}>{rendered}</div>;
}
