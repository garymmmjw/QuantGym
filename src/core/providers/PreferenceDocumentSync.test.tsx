import "@testing-library/jest-dom/vitest";

import { act, render, waitFor } from "@testing-library/react";

import { preferenceController } from "../../domains/platform/preferences";
import { PreferenceDocumentSync } from "./PreferenceDocumentSync";

describe("PreferenceDocumentSync", () => {
  afterEach(() => {
    preferenceController.reset();
    vi.unstubAllGlobals();
  });

  it("applies the current theme and language to the document root", async () => {
    render(<PreferenceDocumentSync />);

    act(() => {
      preferenceController.setTheme("dark");
      preferenceController.setLanguage("en");
    });

    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-qg-theme", "dark");
      expect(document.documentElement).toHaveAttribute("lang", "en");
    });
  });

  it("follows system theme changes until the user chooses an explicit theme", async () => {
    let dark = false;
    let changeListener: (() => void) | undefined;
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      get matches() {
        return dark;
      },
      addEventListener: (_type: string, listener: () => void) => {
        changeListener = listener;
      },
      removeEventListener: vi.fn(),
    })));
    preferenceController.reconcileFromMe({
      preferences: { language: "zh-CN", theme: "system" },
    });
    render(<PreferenceDocumentSync />);

    dark = true;
    act(() => changeListener?.());
    await waitFor(() => {
      expect(document.documentElement).toHaveAttribute("data-qg-theme", "dark");
    });

    act(() => preferenceController.setTheme("light"));
    act(() => changeListener?.());
    expect(document.documentElement).toHaveAttribute("data-qg-theme", "light");
  });
});
