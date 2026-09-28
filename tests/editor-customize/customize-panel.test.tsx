// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { defaultResumeDesign, type ResumeDesign } from "@/domain/resume";
import { CustomizePanel, type CustomizePanelProps } from "@/features/editor/customize";

afterEach(cleanup);

function Harness({ onDesignChange = () => undefined, ...props }: Omit<CustomizePanelProps, "design" | "onChange"> & { onDesignChange?: (design: ResumeDesign) => void }) {
  const [design, setDesign] = useState(defaultResumeDesign);
  return <CustomizePanel {...props} design={design} onChange={(next) => { setDesign(next); onDesignChange(next); }} />;
}

describe("CustomizePanel", () => {
  it("exposes every documented category and writes document controls to the canonical design", () => {
    const onDesignChange = vi.fn();
    render(<Harness onDesignChange={onDesignChange} />);

    const navigation = screen.getByRole("navigation", { name: "Customize resume" });
    for (const label of ["Document", "Templates", "Layout", "Font Size", "Spacing", "Entries", "Headings", "Font", "Colors", "Header", "Photo", "Links", "Footer", "Sections"]) {
      expect(within(navigation).getByRole("button", { name: label })).toBeInTheDocument();
    }

    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Document settings",
      "Design template",
      "Layout",
      "Font size",
      "Spacing",
      "Entries",
      "Headings",
      "Font",
      "Colors",
      "Header",
      "Photo",
      "Link styling",
      "Footer",
      "Section customizations",
    ]);

    fireEvent.change(screen.getByLabelText("Language"), { target: { value: "de-DE" } });
    expect(onDesignChange).toHaveBeenLastCalledWith(expect.objectContaining({
      document: expect.objectContaining({ language: "de-DE" }),
    }));

    fireEvent.click(screen.getByRole("radio", { name: "US Letter" }));
    expect(onDesignChange).toHaveBeenLastCalledWith(expect.objectContaining({
      document: expect.objectContaining({ language: "de-DE", pageFormat: "Letter" }),
    }));
  });

  it("keeps stepped values in schema bounds and emits concrete normalized values", () => {
    const onDesignChange = vi.fn();
    render(<Harness initialCategory="font-size" onDesignChange={onDesignChange} />);

    fireEvent.click(screen.getByRole("button", { name: "Increase Base font size" }));
    expect(onDesignChange).toHaveBeenLastCalledWith(expect.objectContaining({
      typography: expect.objectContaining({ baseSizePt: 11 }),
    }));

    fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "15" } });
    expect(onDesignChange).toHaveBeenLastCalledWith(expect.objectContaining({
      typography: expect.objectContaining({ nameOffsetPt: 15 }),
    }));
  });

  it("updates semantic colors and individual accent targets without dropping sibling values", () => {
    const onDesignChange = vi.fn();
    render(<Harness initialCategory="colors" onDesignChange={onDesignChange} />);

    fireEvent.change(screen.getByLabelText("Accent"), { target: { value: "#112233" } });
    expect(onDesignChange).toHaveBeenLastCalledWith(expect.objectContaining({
      colors: expect.objectContaining({ accent: "#112233" }),
    }));

    fireEvent.click(screen.getByRole("checkbox", { name: "Job title" }));
    expect(onDesignChange).toHaveBeenLastCalledWith(expect.objectContaining({
      colors: expect.objectContaining({
        accent: "#112233",
        accentTargets: expect.objectContaining({ jobTitle: true, name: true, rules: true }),
      }),
    }));
  });

  it("binds photo transforms and asset actions without storing the asset in component state", () => {
    const onDesignChange = vi.fn();
    const onPhotoUpload = vi.fn();
    const onPhotoRemove = vi.fn();
    render(<Harness initialCategory="photo" onDesignChange={onDesignChange} photoAsset={{ present: true }} onPhotoUpload={onPhotoUpload} onPhotoRemove={onPhotoRemove} />);

    const file = new File(["photo"], "portrait.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("Replace photo"), { target: { files: [file] } });
    expect(onPhotoUpload).toHaveBeenCalledWith(file);

    fireEvent.change(screen.getByLabelText("Zoom"), { target: { value: "2.2" } });
    expect(onDesignChange).toHaveBeenLastCalledWith(expect.objectContaining({
      photo: expect.objectContaining({ zoom: 2.2 }),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(onPhotoRemove).toHaveBeenCalledTimes(1);
  });

  it("creates canonical per-section overrides and offers skill presentation only for skills", () => {
    const onDesignChange = vi.fn();
    render(<Harness initialCategory="sections" onDesignChange={onDesignChange} sections={[
      { id: "experience", label: "Experience", type: "experience" },
      { id: "skills", label: "Skills", type: "skills" },
    ]} />);

    fireEvent.change(screen.getByLabelText("Experience heading style"), { target: { value: "boxed" } });
    expect(onDesignChange).toHaveBeenLastCalledWith(expect.objectContaining({
      sections: expect.objectContaining({ experience: { headingStyle: "boxed", skillDisplay: "text" } }),
    }));

    fireEvent.change(screen.getByLabelText("Skill presentation"), { target: { value: "level" } });
    expect(onDesignChange).toHaveBeenLastCalledWith(expect.objectContaining({
      sections: expect.objectContaining({
        experience: { headingStyle: "boxed", skillDisplay: "text" },
        skills: { headingStyle: "inherit", skillDisplay: "level" },
      }),
    }));
    expect(screen.getAllByLabelText("Skill presentation")).toHaveLength(1);
  });

  it("moves section ordering and visibility into Customize with keyboard-accessible layout rows", () => {
    const onSectionMove = vi.fn();
    const onSectionVisibilityChange = vi.fn();
    render(<Harness
      sections={[
        { id: "experience", label: "Professional Experience", type: "experience", visible: true, column: "full" },
        { id: "skills", label: "Skills", type: "skills", visible: true, column: "full" },
      ]}
      onSectionMove={onSectionMove}
      onSectionVisibilityChange={onSectionVisibilityChange}
    />);

    fireEvent.keyDown(screen.getByRole("button", { name: /reorder professional experience/i }), { key: "ArrowDown" });
    expect(onSectionMove).toHaveBeenCalledWith(0, 1);

    fireEvent.click(screen.getByRole("checkbox", { name: "Show Professional Experience" }));
    expect(onSectionVisibilityChange).toHaveBeenCalledWith("experience", false);

    fireEvent.click(screen.getByRole("button", { name: "Layout" }));
    expect(screen.getByRole("button", { name: "Layout" })).toHaveAttribute("aria-current", "location");
  });

  it("offers the professional self-hosted resume font set", () => {
    const onDesignChange = vi.fn();
    render(<Harness onDesignChange={onDesignChange} />);
    const bodyFont = screen.getByLabelText("Body font");
    for (const font of ["Source Sans 3", "Inter", "Lato", "Open Sans", "Roboto", "Merriweather", "Libre Baskerville"]) {
      expect(within(bodyFont).getByRole("option", { name: font })).toBeInTheDocument();
    }
    fireEvent.change(bodyFont, { target: { value: "Source Sans 3" } });
    expect(bodyFont).toHaveValue("Source Sans 3");
    expect(onDesignChange).toHaveBeenLastCalledWith(expect.objectContaining({
      typography: expect.objectContaining({ bodyFont: "Source Sans 3" }),
    }));
  });
});
