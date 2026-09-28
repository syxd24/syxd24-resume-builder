import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { createDefaultResumeDocument, defaultResumeDesign } from "../../src/domain/resume";
import type { ResumeRecord } from "../../src/data/resumes/types";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

import { DashboardLibrary } from "../../src/features/dashboard/DashboardLibrary";

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute("open");
  };
});

function record(overrides: Partial<ResumeRecord> = {}): ResumeRecord {
  return {
    id: "2a2de08c-54a2-496a-95c6-269a593a0407",
    title: "Resume Germany",
    content: createDefaultResumeDocument(),
    design: defaultResumeDesign,
    language: "en-GB",
    pageFormat: "A4",
    sortOrder: 0,
    sourceImportPath: null,
    sourceImportType: null,
    lockVersion: 2,
    createdAt: "2026-09-20T12:00:00.000Z",
    updatedAt: "2026-09-23T12:00:00.000Z",
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  cleanup();
  push.mockReset();
  vi.unstubAllGlobals();
});

describe("DashboardLibrary", () => {
  it("loads persisted resumes and renders each thumbnail through the shared renderer", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ resumes: [record()] }));
    vi.stubGlobal("fetch", fetchMock);

    render(<DashboardLibrary />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading resumes");
    expect(await screen.findByText("Resume Germany")).toBeVisible();
    expect(screen.getByTestId("shared-resume-renderer")).toHaveAttribute("data-mode", "thumbnail");
    expect(screen.getByTestId("shared-resume-renderer")).toHaveAttribute("data-page-limit", "1");
    expect(fetchMock).toHaveBeenCalledWith("/api/resumes", expect.objectContaining({ cache: "no-store" }));
  });

  it("creates a persisted blank resume before navigating to the editor", async () => {
    const created = record({ id: "55da0d58-3bd0-4854-b932-e9bbff9f81bd", title: "Untitled Resume" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ resumes: [] }))
      .mockResolvedValueOnce(jsonResponse({ resume: created }, 201));
    vi.stubGlobal("fetch", fetchMock);

    render(<DashboardLibrary />);
    await screen.findByText(/first resume will appear/i);

    fireEvent.click(screen.getAllByRole("button", { name: /new resume/i })[0]!);
    const createDialog = screen.getByRole("dialog", { name: "Create a resume" });
    fireEvent.click(within(createDialog).getByRole("button", { name: /start blank/i }));

    await waitFor(() => expect(push).toHaveBeenCalledWith(`/resumes/${created.id}`));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/resumes", expect.objectContaining({ method: "POST" }));
  });

  it("confirms the exact target title before deleting and removes the persisted card", async () => {
    const target = record();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ resumes: [target] }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    render(<DashboardLibrary />);
    await screen.findByText(target.title);

    fireEvent.click(screen.getByRole("button", { name: `Actions for ${target.title}` }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete" }));
    expect(screen.getByText(new RegExp(`“${target.title}”`))).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Delete resume" }));

    await waitFor(() => expect(screen.queryByText(target.title)).not.toBeInTheDocument());
    expect(fetchMock).toHaveBeenLastCalledWith(`/api/resumes/${target.id}`, { method: "DELETE" });
  });
});
