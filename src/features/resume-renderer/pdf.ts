import "server-only";

import path from "node:path";

import serverlessChromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

import { getServerEnv } from "@/config/env";
import type { ResumeRecord } from "@/data/resumes";
import type { ResumePdf } from "@/server/import-export/contracts";

function safeFilename(title: string): string {
  const value = title.normalize("NFKC").replace(/[^\p{L}\p{N}._ -]+/gu, "").trim().replace(/\s+/g, "-").slice(0, 120);
  return `${value || "resume"}.pdf`;
}

export async function renderResumePdf(resume: ResumeRecord, appOrigin: string): Promise<ResumePdf> {
  const env = getServerEnv();
  const serverless = process.env.VERCEL === "1" || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  const executablePath = serverless
    ? await serverlessChromium.executablePath(path.join(process.cwd(), "node_modules", "@sparticuz", "chromium", "bin"))
    : playwrightChromium.executablePath();
  const browser = await playwrightChromium.launch({
    headless: true,
    args: serverless ? serverlessChromium.args : [],
    executablePath,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
    if (env.VERCEL_AUTOMATION_BYPASS_SECRET) {
      await page.setExtraHTTPHeaders({
        "x-vercel-protection-bypass": env.VERCEL_AUTOMATION_BYPASS_SECRET,
        "x-vercel-set-bypass-cookie": "true",
      });
    }
    const url = new URL(`/resumes/${resume.id}/print`, appOrigin);
    const response = await page.goto(url.href, { waitUntil: "networkidle", timeout: 30_000 });
    if (!response?.ok()) throw new Error(`Print page returned ${response?.status() ?? "no response"}.`);
    await page.waitForSelector('[data-print-ready="true"]', { state: "attached", timeout: 10_000 });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.emulateMedia({ media: "print" });
    const bytes = await page.pdf({
      format: resume.pageFormat,
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      tagged: true,
      outline: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return { bytes, filename: safeFilename(resume.title), contentType: "application/pdf" };
  } finally {
    await browser.close();
  }
}
