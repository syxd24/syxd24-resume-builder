import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

import { extractResume } from "@/features/import/extractor";

const goldenCvPath = process.env.GOLDEN_CV_PATH?.trim();

describe.runIf(Boolean(goldenCvPath))("owner-provided golden CV", () => {
  it("imports the real PDF into clean editable sections", async () => {
    const bytes = new Uint8Array(await readFile(goldenCvPath!));
    const result = await extractResume("pdf", bytes);
    const byType = new Map(result.document.sections.map((section) => [section.type, section]));

    expect(result.document.personal.fullName).not.toBe("");
    expect(result.document.personal.email).toMatch(/@/);
    expect(result.document.personal.phone).toBeTruthy();
    expect(result.document.personal.location).toBeTruthy();

    const experience = byType.get("experience");
    expect(experience).toMatchObject({ type: "experience" });
    if (!experience || experience.type !== "experience") throw new Error("Experience was not classified.");
    expect(experience.entries.length).toBeGreaterThan(0);
    expect(experience.entries.every((entry) => entry.position && entry.employer)).toBe(true);
    expect(experience.entries.flatMap((entry) => entry.description).filter((block) => block.type === "bullet").length).toBeGreaterThan(0);

    const skills = byType.get("skills");
    expect(skills).toMatchObject({ type: "skills" });
    if (!skills || skills.type !== "skills") throw new Error("Skills were not classified.");
    expect(skills.entries.every((entry) => Boolean(entry.description) || skills.entries.length < 10)).toBe(true);

    const languages = byType.get("languages");
    expect(languages).toMatchObject({ type: "languages" });
    if (!languages || languages.type !== "languages") throw new Error("Languages were not classified.");
    expect(languages.entries.every((entry) => entry.name && entry.proficiency)).toBe(true);

    const certificates = byType.get("certificates");
    expect(certificates).toMatchObject({ type: "certificates" });
    if (!certificates || certificates.type !== "certificates") throw new Error("Certificates were not classified.");
    expect(certificates.entries.length).toBeGreaterThan(1);

    console.info("GOLDEN_IMPORT_RESULT", JSON.stringify(result, null, 2));
  });
});
