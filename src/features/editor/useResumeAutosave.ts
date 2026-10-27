"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { ResumeDesign, ResumeDocument } from "@/domain/resume";
import type { ResumeRecord } from "@/data/resumes";

export type SaveStatus = "saved" | "saving" | "error";

type Snapshot = { title: string; content: ResumeDocument; design: ResumeDesign };

function hash(snapshot: Snapshot): string {
  return JSON.stringify(snapshot);
}

export function useResumeAutosave(options: {
  resumeId: string;
  initialVersion: number;
  snapshot: Snapshot;
  delayMs?: number;
  disabled?: boolean;
}) {
  const { resumeId, initialVersion, snapshot, delayMs = 750, disabled = false } = options;
  const [status, setStatus] = useState<SaveStatus>("saved");
  const [error, setError] = useState<string>();
  const latestRef = useRef(snapshot);
  const savedHashRef = useRef(hash(snapshot));
  const versionRef = useRef(initialVersion);
  const dirtyRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const inFlightRef = useRef<Promise<boolean> | undefined>(undefined);
  const conflictRef = useRef(false);
  const hasPendingChanges = useCallback(() => dirtyRef.current || Boolean(inFlightRef.current), []);

  const flush = useCallback(async (): Promise<boolean> => {
    if (disabled) return true;
    if (conflictRef.current) {
      setStatus("error");
      setError("This resume was changed elsewhere. Copy your unsaved edits before reloading; Retry cannot overwrite newer data.");
      return false;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = undefined;
    while (true) {
      if (inFlightRef.current) {
        const succeeded = await inFlightRef.current;
        if (!succeeded) return false;
        if (!dirtyRef.current) return true;
        continue;
      }

      const current = latestRef.current;
      const sentHash = hash(current);
      if (!dirtyRef.current && sentHash === savedHashRef.current) return true;

      setStatus("saving");
      setError(undefined);
      const request = (async (): Promise<boolean> => {
        const response = await fetch(`/api/resumes/${resumeId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expectedVersion: versionRef.current,
            patch: { title: current.title.trim() || "Untitled Resume", content: current.content, design: current.design },
          }),
        });
        const payload = await response.json().catch(() => ({})) as { resume?: ResumeRecord; current?: ResumeRecord; error?: string };
        if (!response.ok) {
          if (response.status === 409) conflictRef.current = true;
          throw new Error(payload.error || "Save failed. Your local edits are still here.");
        }
        if (!payload.resume) throw new Error("The save response was incomplete.");
        versionRef.current = payload.resume.lockVersion;
        savedHashRef.current = sentHash;
        dirtyRef.current = hash(latestRef.current) !== sentHash;
        if (!dirtyRef.current) setStatus("saved");
        return true;
      })().catch((cause): boolean => {
        dirtyRef.current = true;
        setStatus("error");
        setError(cause instanceof Error ? cause.message : "Save failed. Your local edits are still here.");
        return false;
      }).finally(() => {
        inFlightRef.current = undefined;
      });
      inFlightRef.current = request;
      const succeeded = await request;
      if (!succeeded || !dirtyRef.current) return succeeded;
    }
  }, [disabled, resumeId]);

  useEffect(() => {
    latestRef.current = snapshot;
    const nextHash = hash(snapshot);
    if (disabled) {
      savedHashRef.current = nextHash;
      dirtyRef.current = false;
      setStatus("saved");
      setError(undefined);
      return;
    }
    if (nextHash === savedHashRef.current) return;
    dirtyRef.current = true;
    if (conflictRef.current) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void flush().catch(() => undefined), delayMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [snapshot, delayMs, disabled, flush]);

  useEffect(() => {
    if (disabled) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current && !inFlightRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [disabled]);

  return { status, error, flush, retry: flush, versionRef, hasPendingChanges };
}
