import { afterEach, describe, expect, it, vi } from "vitest";

import type { ResumeRecord } from "@/data/resumes";

const { browser, executablePath, launch, page } = vi.hoisted(() => {
  const mockedPage = {
    emulateMedia: vi.fn(),
    evaluate: vi.fn(),
    goto: vi.fn().mockResolvedValue({ ok: () => true }),
    pdf: vi.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])),
    setExtraHTTPHeaders: vi.fn(),
    waitForSelector: vi.fn(),
  };
  const mockedBrowser = { close: vi.fn(), newPage: vi.fn().mockResolvedValue(mockedPage) };
  return {
    browser: mockedBrowser,
    executablePath: vi.fn().mockResolvedValue("/tmp/chromium"),
    launch: vi.fn().mockResolvedValue(mockedBrowser),
    page: mockedPage,
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@sparticuz/chromium", () => ({
  default: { args: ["--no-sandbox"], executablePath },
}));
vi.mock("playwright-core", () => ({ chromium: { executablePath: () => "/local/chromium", launch } }));
vi.mock("@/config/env", () => ({
  getServerEnv: () => ({
    APP_URL: "http://localhost:3000",
    SUPABASE_SECRET_KEY: "test-secret",
    SUPABASE_URL: "https://example.supabase.co",
  }),
}));

import { renderResumePdf } from "@/features/resume-renderer/pdf";

const resume = {
  id: "2a2de08c-54a2-496a-95c6-269a593a0407",
  title: "Platform Resume",
  pageFormat: "A4",
} as ResumeRecord;

afterEach(() => {
  vi.clearAllMocks();
  delete process.env.VERCEL;
});

describe("renderResumePdf", () => {
  it("opens the print page on the request origin instead of APP_URL", async () => {
    process.env.VERCEL = "1";

    await renderResumePdf(resume, "https://resume-builder.example");

    expect(executablePath).toHaveBeenCalledOnce();
    expect(page.goto).toHaveBeenCalledWith(
      `https://resume-builder.example/resumes/${resume.id}/print`,
      { waitUntil: "networkidle", timeout: 30_000 },
    );
    expect(page.goto).not.toHaveBeenCalledWith(expect.stringContaining("localhost"), expect.anything());
    expect(browser.close).toHaveBeenCalledOnce();
  });
});
