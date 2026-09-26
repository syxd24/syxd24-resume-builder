import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultResumeDocument, defaultResumeDesign } from "@/domain/resume";
import { useResumeAutosave } from "@/features/editor/useResumeAutosave";

function Harness() {
  const [summary, setSummary] = useState("Initial");
  const base = useMemo(() => createDefaultResumeDocument(), []);
  const document = useMemo(() => ({ ...base, personal: { ...base.personal, jobTitle: summary } }), [base, summary]);
  const snapshot = useMemo(() => ({ title: "QA", content: document, design: defaultResumeDesign }), [document]);
  const autosave = useResumeAutosave({ resumeId: "00000000-0000-4000-8000-000000000001", initialVersion: 0, snapshot, delayMs: 10 });
  return <div><span data-testid="value">{summary}</span><span data-testid="status">{autosave.status}</span><button onClick={() => setSummary("First request")}>First</button><button onClick={() => setSummary("Latest request")}>Latest</button><button onClick={() => void autosave.retry()}>Retry</button></div>;
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("autosave stale request ordering", () => {
  it("serializes an edit made while a request is in flight and persists the newest snapshot with the next version", async () => {
    let resolveFirst!: (response: Response) => void;
    const first = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    const request = vi.fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValueOnce(Response.json({ resume: { lockVersion: 2 } }));
    vi.stubGlobal("fetch", request);
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "First" }));
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: "Latest" }));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(request).toHaveBeenCalledTimes(1);

    resolveFirst(Response.json({ resume: { lockVersion: 1 } }));
    await first;
    await waitFor(() => expect(request).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("saved"));

    const firstBody = JSON.parse(String((request.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    const latestBody = JSON.parse(String((request.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(firstBody).toMatchObject({ expectedVersion: 0, patch: { content: { personal: { jobTitle: "First request" } } } });
    expect(latestBody).toMatchObject({ expectedVersion: 1, patch: { content: { personal: { jobTitle: "Latest request" } } } });
    expect(screen.getByTestId("value")).toHaveTextContent("Latest request");
  });

  it("keeps the latest local snapshot after failure and retries that exact value", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: "offline" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ resume: { lockVersion: 1 } }));
    vi.stubGlobal("fetch", request);
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Latest" }));

    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("error"), { timeout: 2_000 });
    expect(screen.getByTestId("value")).toHaveTextContent("Latest request");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByTestId("status")).toHaveTextContent("saved"));
    const retryBody = JSON.parse(String((request.mock.calls[1] as unknown as [string, RequestInit])[1].body));
    expect(retryBody.patch.content.personal.jobTitle).toBe("Latest request");
  });
});
