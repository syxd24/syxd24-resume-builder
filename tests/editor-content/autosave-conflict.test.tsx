import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMemo, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createDefaultResumeDocument, defaultResumeDesign } from "@/domain/resume";
import { useResumeAutosave } from "@/features/editor/useResumeAutosave";

function Harness() {
  const [title, setTitle] = useState("Original");
  const doc = useMemo(() => createDefaultResumeDocument(), []);
  const snapshot = useMemo(() => ({ title, content: doc, design: defaultResumeDesign }), [title, doc]);
  const save = useResumeAutosave({ resumeId: "00000000-0000-4000-8000-000000000001", initialVersion: 4, snapshot, delayMs: 10 });
  return <div>
    <span data-testid="state">{save.status}</span>
    <button onClick={() => setTitle("Edited")}>Edit</button>
    <button onClick={() => void save.retry()}>Retry</button>
  </div>;
}

afterEach(() => { vi.restoreAllMocks(); });

describe("external edit conflict", () => {
  it("never silently retries with a newer external lock version", async () => {
    const request = vi.fn().mockResolvedValue(Response.json({ error: "Version conflict", current: { lockVersion: 5 } }, { status: 409 }));
    vi.stubGlobal("fetch", request);
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await waitFor(() => expect(screen.getByTestId("state").textContent).toBe("error"));
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Retry" })); });
    expect(request).toHaveBeenCalledTimes(1);
    const body = JSON.parse(String((request.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(body.expectedVersion).toBe(4);
  });
});
