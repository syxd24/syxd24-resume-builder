"use client";

import { memo, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import type { ResumeRecord } from "@/data/resumes/types";
import { ResumeRenderer } from "@/features/resume-renderer/ResumeRenderer";
import { PAGE_DIMENSIONS } from "@/features/resume-renderer/format";

import styles from "./dashboard.module.css";

function ResumeThumbnailComponent({ resume }: { resume: ResumeRecord }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);
  const pageSize = useMemo(() => {
    const dimensions = PAGE_DIMENSIONS[resume.pageFormat];
    const cssPixelsPerMillimetre = 96 / 25.4;
    return {
      width: dimensions.widthMm * cssPixelsPerMillimetre,
      height: dimensions.heightMm * cssPixelsPerMillimetre,
    };
  }, [resume.pageFormat]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const updateScale = () => {
      const computed = window.getComputedStyle(viewport);
      const horizontalPadding = Number.parseFloat(computed.paddingLeft) + Number.parseFloat(computed.paddingRight);
      const verticalPadding = Number.parseFloat(computed.paddingTop) + Number.parseFloat(computed.paddingBottom);
      const availableWidth = viewport.clientWidth - horizontalPadding;
      const availableHeight = viewport.clientHeight - verticalPadding;
      if (availableWidth <= 0 || availableHeight <= 0) return;
      const nextScale = Math.min(availableWidth / pageSize.width, availableHeight / pageSize.height);
      setScale((current) => Math.abs(current - nextScale) > 0.001 ? nextScale : current);
    };

    updateScale();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateScale);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [pageSize]);

  const stageStyle = {
    width: `${pageSize.width * scale}px`,
    height: `${pageSize.height * scale}px`,
    "--thumbnail-scale": scale,
  } as CSSProperties;

  return (
    <div ref={viewportRef} className={styles.thumbnailViewport} data-resume-thumbnail="true" data-page-format={resume.pageFormat} aria-hidden="true" inert>
      <div className={styles.thumbnailScale} data-thumbnail-page="true" style={stageStyle}>
        <ResumeRenderer
          document={resume.content}
          design={resume.design}
          pageFormat={resume.pageFormat}
          mode="thumbnail"
          pageLimit={1}
        />
      </div>
    </div>
  );
}

export const ResumeThumbnail = memo(ResumeThumbnailComponent);
