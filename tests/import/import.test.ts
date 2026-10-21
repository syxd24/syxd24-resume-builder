import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";

vi.mock("pdf-parse/lib/pdf-parse.js", () => ({
  default: vi.fn(async () => ({ text: "", numpages: 1, numrender: 1, info: {}, metadata: null, version: "test" })),
}));

import { importMimeTypes } from "@/data/imports/types";
import { classifyResumeText } from "@/features/import/classifier";
import { ResumeImportError } from "@/features/import/errors";
import { docxHtmlToText, extractResume } from "@/features/import/extractor";
import { sanitizeImportFilename, validateImportSource } from "@/features/import/validation";

async function minimalDocx(text: string): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.folder("_rels")?.file(".rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  zip.folder("word")?.file("document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${text.split("\n").map((line) => `<w:p><w:r><w:t>${line}</w:t></w:r></w:p>`).join("")}<w:sectPr/></w:body></w:document>`);
  return zip.generateAsync({ type: "uint8array" });
}

describe("resume import", () => {
  it("validates extension, MIME, size, and safe storage names", () => {
    const bytes = new TextEncoder().encode("Alex Morgan\nSummary\nExperienced engineer");
    expect(validateImportSource({ originalName: "resume.txt", mimeType: importMimeTypes.txt, size: bytes.length }, bytes)).toBe("txt");
    expect(sanitizeImportFilename("../private\\Alex:Resume.txt")).toBe("Alex_Resume.txt");
    expect(() => validateImportSource({ originalName: "resume.pdf", mimeType: importMimeTypes.pdf, size: bytes.length }, bytes)).toThrow(ResumeImportError);
  });

  it("classifies supported headings and preserves ambiguous text", () => {
    const result = classifyResumeText(`Alex Morgan\nBackend Engineer\nalex@example.com\nNeeds manual review\n\nSUMMARY\nBuilds reliable systems.\n\nSKILLS\nTypeScript, PostgreSQL\n\nEXPERIENCE\nEngineer\nExample Ltd\nBuilt APIs.`);
    expect(result.document.personal).toMatchObject({ fullName: "Alex Morgan", jobTitle: "Backend Engineer", email: "alex@example.com" });
    expect(result.document.sections.map((section) => section.type)).toEqual(["custom", "summary", "skills", "experience"]);
    expect(result.unclassifiedText).toEqual(["Needs manual review"]);
  });

  it("extracts TXT into a canonical editable document", async () => {
    const bytes = new TextEncoder().encode("Alex Morgan\nEngineer\n\nSUMMARY\nReliable engineer.\n\nEDUCATION\nBSc Computing\nExample University");
    const result = await extractResume("txt", bytes);
    expect(result.document.personal.fullName).toBe("Alex Morgan");
    expect(result.document.sections.some((section) => section.type === "education")).toBe(true);
  });

  it("does not misclassify an alphanumeric name suffix as a phone number", () => {
    const result = classifyResumeText(`TXT Candidate 1792508969555-38cf2658289aa
Platform Engineer

SUMMARY
Reliable TXT import.`);

    expect(result.document.personal.fullName).toBe("TXT Candidate 1792508969555-38cf2658289aa");
    expect(result.document.personal.phone).toBeUndefined();
    expect(result.document.personal.jobTitle).toBe("Platform Engineer");
    expect(result.unclassifiedText).toEqual([]);
  });

  it("extracts real DOCX paragraph text without a paid service", async () => {
    const bytes = await minimalDocx("Alex Morgan\nEngineer\nSUMMARY\nDOCX content preserved.");
    const result = await extractResume("docx", bytes);
    expect(result.document.personal.fullName).toBe("Alex Morgan");
    expect(result.document.sections[0]?.type).toBe("summary");
  });

  it("reports image-only PDFs explicitly instead of inventing content", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\nmock scanned payload");
    await expect(extractResume("pdf", bytes)).rejects.toMatchObject({ code: "NO_TEXT" });
  });

  it("maps dense PDF text into structured header, jobs, grouped skills, languages, education, and certificates", () => {
    const result = classifyResumeText(`Taylor Example
taylor@example.com
+48 555 010 020
Krakow, Poland

SUMMARY
Customer support professional with international experience and
strong analytical skills.
PROFESSIONAL EXPERIENCE
Customer Service Representative, Example Co08/2025 – Present | Krakow, Poland
•Resolve complex customer cases across multiple channels and
document accurate solutions.
•Train colleagues on new processes.
SKILLS
Case Handling & Customer Support: Complex Case Resolution, Complaint Handling,
Escalation Management
Tools & Digital Skills: Excel, PowerPoint, Teams
EDUCATION
Bachelor of Education, Example UniversityPresent | Krakow, Poland
LANGUAGES
English
Fluent
Polish
Native/Bilingual
CERTIFICATES
— Service Award — Example Co
Q1 2026
— Data Analytics — Coursera`);

    expect(result.document.personal).toMatchObject({
      fullName: "Taylor Example",
      email: "taylor@example.com",
      phone: "+48 555 010 020",
      location: "Krakow, Poland",
    });
    expect(result.document.personal.jobTitle).toBeUndefined();

    const summary = result.document.sections.find((section) => section.type === "summary");
    expect(summary).toMatchObject({ type: "summary", content: [{ type: "paragraph", text: "Customer support professional with international experience and strong analytical skills." }] });

    const experience = result.document.sections.find((section) => section.type === "experience");
    expect(experience).toMatchObject({
      type: "experience",
      entries: [{
        position: "Customer Service Representative",
        employer: "Example Co",
        location: "Krakow, Poland",
        dateRange: { start: { month: 8, year: 2025, raw: "08/2025" }, current: true },
        description: [
          { type: "bullet", text: "Resolve complex customer cases across multiple channels and document accurate solutions." },
          { type: "bullet", text: "Train colleagues on new processes." },
        ],
      }],
    });

    const skills = result.document.sections.find((section) => section.type === "skills");
    expect(skills).toMatchObject({
      type: "skills",
      entries: [
        { name: "Case Handling & Customer Support", description: "Complex Case Resolution, Complaint Handling, Escalation Management" },
        { name: "Tools & Digital Skills", description: "Excel, PowerPoint, Teams" },
      ],
    });

    const education = result.document.sections.find((section) => section.type === "education");
    expect(education).toMatchObject({
      type: "education",
      entries: [{ degree: "Bachelor of Education", institution: "Example University", location: "Krakow, Poland", dateRange: { current: true } }],
    });

    const languages = result.document.sections.find((section) => section.type === "languages");
    expect(languages).toMatchObject({
      type: "languages",
      entries: [
        { name: "English", proficiency: "Fluent" },
        { name: "Polish", proficiency: "Native/Bilingual" },
      ],
    });

    const certificates = result.document.sections.find((section) => section.type === "certificates");
    expect(certificates).toMatchObject({
      type: "certificates",
      entries: [
        { title: "Service Award", issuer: "Example Co", date: { raw: "Q1 2026" } },
        { title: "Data Analytics", issuer: "Coursera" },
      ],
    });
    expect(result.unclassifiedText).toEqual([]);
  });

  it("retains DOCX list items as bullet blocks", () => {
    const text = docxHtmlToText("<p>EXPERIENCE</p><p>Engineer, Example Co 2024 - Present</p><ul><li>Built APIs.</li><li>Supported users.</li></ul>");
    const result = classifyResumeText(`Alex Morgan\n${text}`);
    const experience = result.document.sections.find((section) => section.type === "experience");
    expect(experience).toMatchObject({
      type: "experience",
      entries: [{ description: [{ type: "bullet", text: "Built APIs." }, { type: "bullet", text: "Supported users." }] }],
    });
  });

  it("maps the reference header without promoting LinkedIn to job title or creating fallback content", () => {
    const result = classifyResumeText(`Syed Suhel Ahmed  linkedin.com/in/syed-suhel-ahmed
syedsuhel26a@gmail.com  +48 513678988
Kraków, Małopolskie, Poland  github.com/syxd24  Authorized to work in Poland | No sponsorship required

SUMMARY
Information Technology Graduate and Backend-focused Software Developer with experience building fintech and AI-enabled applications.

PROFESSIONAL EXPERIENCE
Junior Software Developer, CryptoMate
• Developed backend features for payment transaction processing and customer account workflows.
• Contributed to a GenAI support agent using Python and FastAPI.
Kaunas, Lithuania 06/2025 – 04/2026

PROJECTS
SafeTrip AI — AI Travel Safety Report
• Built a full-stack travel-safety application.

EDUCATION
Bachelor's Degree in Information Systems, Vytautas Magnus University 09/2022 – 06/2026 | Kaunas, Lithuania`);

    expect(result.document.personal).toMatchObject({
      fullName: "Syed Suhel Ahmed",
      email: "syedsuhel26a@gmail.com",
      phone: "+48 513678988",
      location: "Kraków, Małopolskie, Poland",
    });
    expect(result.document.personal.jobTitle).toBeUndefined();
    expect(result.document.personal.links.map(({ label, url }) => ({ label, url }))).toEqual([
      { label: "LinkedIn", url: "https://linkedin.com/in/syed-suhel-ahmed" },
      { label: "GitHub", url: "https://github.com/syxd24" },
    ]);
    expect(result.document.personal.details).toMatchObject([
      { kind: "work-authorization", label: "Work Authorization", value: "Authorized to work in Poland | No sponsorship required", visible: true },
    ]);
    expect(result.document.sections.some((section) => section.type === "custom")).toBe(false);
    expect(result.unclassifiedText).toEqual([]);

    const experience = result.document.sections.find((section) => section.type === "experience");
    expect(experience).toMatchObject({
      type: "experience",
      entries: [{
        position: "Junior Software Developer",
        employer: "CryptoMate",
        location: "Kaunas, Lithuania",
        dateRange: {
          start: { month: 6, year: 2025, raw: "06/2025" },
          end: { month: 4, year: 2026, raw: "04/2026" },
          current: false,
        },
        description: [
          { type: "bullet", text: "Developed backend features for payment transaction processing and customer account workflows." },
          { type: "bullet", text: "Contributed to a GenAI support agent using Python and FastAPI." },
        ],
      }],
    });

    const project = result.document.sections.find((section) => section.type === "projects");
    expect(project).toMatchObject({
      type: "projects",
      entries: [{ title: "SafeTrip AI", subtitle: "AI Travel Safety Report", description: [{ type: "bullet", text: "Built a full-stack travel-safety application." }] }],
    });
  });

  it("recognizes explicit professional titles, visa details, additional contacts, and varied date layouts", () => {
    const result = classifyResumeText(`Alex Morgan
Professional Title: Senior Product Designer
alex@example.com | alex.secondary@example.com | +1 (415) 555-0134
Location: San Francisco, California, USA
Visa Status: H-1B visa holder
Nationality: Canadian | Date of Birth: 12 March 1990
https://alexmorgan.design | www.linkedin.com/in/alex-morgan | github.com/alexmorgan

CAREER HISTORY
Senior Product Designer at Northstar Labs
January 2022 to Present | Remote
• Led research and product design across two platforms.

ACADEMIC QUALIFICATIONS
BFA Interaction Design
State University
Sep 2017 - May 2021 | Boston, Massachusetts`);

    expect(result.document.personal).toMatchObject({
      fullName: "Alex Morgan",
      jobTitle: "Senior Product Designer",
      email: "alex@example.com",
      phone: "+1 (415) 555-0134",
      location: "San Francisco, California, USA",
      website: "https://alexmorgan.design/",
    });
    expect(result.document.personal.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "visa-status", value: "H-1B visa holder" }),
      expect.objectContaining({ kind: "nationality", label: "Nationality", value: "Canadian" }),
      expect.objectContaining({ kind: "date-of-birth", label: "Date of Birth", value: "12 March 1990" }),
      expect.objectContaining({ kind: "additional", label: "Additional Email", value: "alex.secondary@example.com" }),
    ]));
    expect(result.document.personal.links).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "LinkedIn", url: "https://linkedin.com/in/alex-morgan" }),
      expect.objectContaining({ label: "GitHub", url: "https://github.com/alexmorgan" }),
    ]));

    const experience = result.document.sections.find((section) => section.type === "experience");
    expect(experience).toMatchObject({
      type: "experience",
      entries: [{ position: "Senior Product Designer", employer: "Northstar Labs", location: "Remote", dateRange: { current: true } }],
    });
    const education = result.document.sections.find((section) => section.type === "education");
    expect(education).toMatchObject({
      type: "education",
      entries: [{ degree: "BFA Interaction Design", institution: "State University", location: "Boston, Massachusetts" }],
    });
  });

  it("handles compact two-column extraction, inline section headings, and preserves only truly ambiguous text", () => {
    const result = classifyResumeText(`PRIYA SHAH
priya.shah.dev | London, England, United Kingdom
github.com/priyashah | linkedin.com/in/priya-shah

PROFILE: Platform engineer focused on resilient distributed systems.
AREAS OF EXPERTISE: TypeScript, Kubernetes; Cloud: AWS, Terraform
SELECTED PROJECTS
Release Console — Technical Lead
Mar 2023 – Dec 2023
• Reduced deployment recovery time.
LICENSES & CERTIFICATIONS
Cloud Practitioner — Amazon Web Services
2024
COMMUNITY NOTES
Mentors early-career engineers every month.`);

    expect(result.document.personal).toMatchObject({
      fullName: "PRIYA SHAH",
      location: "London, England, United Kingdom",
      website: "https://priya.shah.dev/",
    });
    expect(result.document.personal.jobTitle).toBeUndefined();
    expect(result.document.sections.map((section) => section.type)).toEqual(["summary", "skills", "projects", "certificates", "custom"]);
    expect(result.unclassifiedText).toEqual(["Mentors early-career engineers every month."]);
    expect(result.warnings).toHaveLength(1);

    const project = result.document.sections.find((section) => section.type === "projects");
    expect(project).toMatchObject({
      type: "projects",
      entries: [{ title: "Release Console", subtitle: "Technical Lead", dateRange: { start: { month: 3, year: 2023 }, end: { month: 12, year: 2023 }, current: false } }],
    });
  });
});
