import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(window.navigator, "language", { value: "zh-CN", configurable: true });
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates a symbol-enabled default password and copies it", async () => {
    const user = userEvent.setup();
    render(<App />);
    const password = screen.getByRole("status", { name: "生成的密码" }).textContent ?? "";
    expect(password).toHaveLength(15);
    expect(password).toMatch(/[-_.:!]/);

    await user.click(screen.getByRole("button", { name: "复制密码" }));
    expect(screen.getByRole("button", { name: "已复制" })).toBeInTheDocument();
  });

  it("restores the copy button after a short success state", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "复制密码" }));
    expect(screen.getByRole("button", { name: "已复制" })).toBeInTheDocument();
    await waitFor(
      () => expect(screen.getByRole("button", { name: "复制密码" })).toBeInTheDocument(),
      { timeout: 2000 },
    );
  });

  it("applies valid settings immediately without adding history", async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.queryByRole("region", { name: "最近生成" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /高级设置/ }));
    const lengthInput = screen.getByRole("spinbutton", { name: "密码长度" });
    await user.clear(lengthInput);
    expect(screen.getByRole("alert")).toHaveTextContent("密码长度必须在 4 到 200 之间");
    expect(screen.getByRole("button", { name: "复制密码" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "换一个" })).toBeDisabled();

    await user.type(lengthInput, "20");
    expect(screen.getByRole("status", { name: "生成的密码" }).textContent).toHaveLength(20);
    expect(screen.queryByRole("region", { name: "最近生成" })).not.toBeInTheDocument();
  });

  it("adds history only when requesting another password and keeps ten entries", async () => {
    const user = userEvent.setup();
    render(<App />);
    const generateButton = screen.getByRole("button", { name: "换一个" });
    for (let count = 0; count < 12; count += 1) await user.click(generateButton);
    expect(screen.getAllByRole("button", { name: "复制这条密码" })).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: "清空" }));
    expect(screen.queryByRole("region", { name: "最近生成" })).not.toBeInTheDocument();
  });

  it("switches languages without persistence", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("heading", { name: "Create a secure password" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Another one" })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(document.title).toBe("Password Generator");
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
  });

  it("does not persist passwords or make application network requests", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { unmount } = render(<App />);
    await user.click(screen.getByRole("button", { name: "换一个" }));
    expect(screen.getByRole("region", { name: "最近生成" })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);

    unmount();
    render(<App />);
    expect(screen.queryByRole("region", { name: "最近生成" })).not.toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it("validates character selections and restores defaults immediately", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /高级设置/ }));
    await user.click(screen.getByText("小写字母"));
    await user.click(screen.getByText("大写字母"));
    await user.click(screen.getByText("数字"));
    await user.click(screen.getByText("符号"));
    expect(screen.getByRole("alert")).toHaveTextContent("请至少选择一种字符类型");
    expect(screen.getByRole("button", { name: "复制密码" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "换一个" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "恢复默认设置" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("默认规则")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "生成的密码" }).textContent).toMatch(/[-_.:!]/);
  });

  it("keeps product branding neutral in visible content and metadata", () => {
    render(<App />);
    expect(screen.getByRole("link", { name: "密码生成器" })).toBeInTheDocument();
    expect(document.title).toBe("密码生成器");
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      "content",
      expect.not.stringMatching(/chrome|google|chromium/i),
    );
    expect(document.body.textContent).not.toMatch(/chrome|google|chromium/i);
  });
});
