import { memo } from "react";

import type { ResumeRecord } from "@/data/resumes/types";
import { ResumeRenderer } from "@/features/resume-renderer/ResumeRenderer";

import styles from "./dashboard.module.css";

function ResumeThumbnailComponent({ resume }: { resume: ResumeRecord }) {
  return (
    <div className={styles.thumbnailViewport} data-page-format={resume.pageFormat} aria-hidden="true" inert>
      <div className={styles.thumbnailScale}>
        <ResumeRenderer
          document={resume.content}
          design={resume.design}
          pageFormat={resume.pageFormat}
          mode="thumbnail"
        />
      </div>
    </div>
  );
}

export const ResumeThumbnail = memo(ResumeThumbnailComponent);
