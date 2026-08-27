import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";

import { I18nProvider } from "./I18nProvider";
import { useI18n } from "./i18n-context";
import {
  createTranslator,
  enMessages,
  messageCatalogs,
  zhCNMessages,
  type MessageKey,
} from "./messages";

const Probe = () => {
  const { language, t } = useI18n();
  return (
    <output data-testid="translation" lang={language}>
      {t("network.retry")} · {t("toast.dismiss")}
    </output>
  );
};

describe("Task 7 message catalogs", () => {
  it("keeps Chinese and English catalogs structurally identical", () => {
    expect(Object.keys(enMessages).sort()).toEqual(Object.keys(zhCNMessages).sort());
    expect(messageCatalogs["zh-CN"]).toBe(zhCNMessages);
    expect(messageCatalogs.en).toBe(enMessages);
  });

  it.each(["shell", "drawer", "account", "network", "toast"] as const)(
    "covers the %s surface",
    (surface) => {
      const keys = Object.keys(zhCNMessages) as MessageKey[];
      expect(keys.some((key) => key.startsWith(`${surface}.`))).toBe(true);
    },
  );

  it("returns type-safe translations for either supported language", () => {
    expect(createTranslator("zh-CN")("drawer.title")).toBe("全部模块");
    expect(createTranslator("en")("drawer.title")).toBe("All modules");
    expect(createTranslator("en")("network.requestId")).toBe("Request ID");
  });
});

describe("I18nProvider", () => {
  it("defaults to Chinese when a component is outside the provider", () => {
    render(<Probe />);
    expect(screen.getByTestId("translation")).toHaveAttribute("lang", "zh-CN");
    expect(screen.getByText("重试 · 关闭通知")).toBeInTheDocument();
  });

  it("updates consumers synchronously when language changes", () => {
    const { rerender } = render(
      <I18nProvider language="zh-CN">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByText("重试 · 关闭通知")).toBeInTheDocument();

    rerender(
      <I18nProvider language="en">
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId("translation")).toHaveAttribute("lang", "en");
    expect(screen.getByText("Retry · Dismiss notification")).toBeInTheDocument();
  });
});
