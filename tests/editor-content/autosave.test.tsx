import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultResumeDocument, defaultResumeDesign } from "@/domain/resume";
import { useResumeAutosave } from "@/features/editor/useResumeAutosave";

function Harness() {
  const [title, setTitle] = useState("Original");
  const document = useMemo(() => createDefaultResumeDocument(), []);
  const snapshot = useMemo(() => ({ title, content: document, design: defaultResumeDesign }), [title, document]);
  const autosave = useResumeAutosave({ resumeId: "00000000-0000-4000-8000-000000000001", initialVersion: 0, snapshot, delayMs: 750 });
  return (
    <div>
      <span data-testid="title">{title}</span>
      <span data-testid="status">{autosave.status}</span>
      <button type="button" onClick={() => setTitle("First")}>First</button>
      <button type="button" onClick={() => setTitle("Latest")}>Latest</button>
      <button type="button" onClick={() => void autosave.retry()}>Retry</button>
    </div>
  );
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useResumeAutosave", () => {
  it("coalesces rapid changes and sends only the latest snapshot", async () => {
    vi.useFakeTimers();
    const request = vi.fn(async () => Response.json({ resume: { lockVersion: 1 } }));
    vi.stubGlobal("fetch", request);
    render(<Harness />);

    fireEvent.click(screen.getByRole("button", { name: "First" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    fireEvent.click(screen.getByRole("button", { name: "Latest" }));
    await act(async () => { await vi.advanceTimersByTimeAsync(800); });

    expect(request).toHaveBeenCalledTimes(1);
    const call = request.mock.calls[0] as unknown as [RequestInfo | URL, RequestInit];
    const body = JSON.parse(String(call[1].body));
    expect(body.patch.title).toBe("Latest");
    expect(screen.getByTestId("status").textContent).toBe("saved");
  });

  it("keeps local edits on failure and retries them", async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: "offline" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ resume: { lockVersion: 1 } }));
    vi.stubGlobal("fetch", request);
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Latest" }));

    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("error"), { timeout: 2_000 });
    expect(screen.getByTestId("title").textContent).toBe("Latest");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(screen.getByTestId("status").textContent).toBe("saved"));
    expect(request).toHaveBeenCalledTimes(2);
  });
});
