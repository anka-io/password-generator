import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("generates an initial password and copies it", async () => {
    const user = userEvent.setup();
    render(<App />);
    const password = screen.getByRole("status", { name: "生成的密码" }).textContent;
    expect(password).toHaveLength(15);

    await user.click(screen.getByRole("button", { name: "复制密码" }));
    expect(screen.getAllByText("已复制").length).toBeGreaterThan(0);
  });

  it("regenerates and keeps at most ten in-memory history entries", async () => {
    const user = userEvent.setup();
    render(<App />);
    const generateButton = screen.getByRole("button", { name: "重新生成" });
    for (let count = 0; count < 12; count += 1) await user.click(generateButton);
    expect(screen.getAllByRole("button", { name: "复制这条密码" })).toHaveLength(10);

    await user.click(screen.getByRole("button", { name: "清空" }));
    expect(screen.queryByRole("button", { name: "复制这条密码" })).not.toBeInTheDocument();
  });

  it("switches languages without persistence", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: "English" }));
    expect(screen.getByRole("heading", { name: "Create a secure password" })).toBeInTheDocument();
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(document.title).toBe("Password Generator");
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);
  });

  it("does not persist passwords or make application network requests", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { unmount } = render(<App />);
    await user.click(screen.getByRole("button", { name: "重新生成" }));
    expect(screen.getByRole("button", { name: "复制这条密码" })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage).toHaveLength(0);
    expect(sessionStorage).toHaveLength(0);

    unmount();
    render(<App />);
    expect(screen.queryByRole("button", { name: "复制这条密码" })).not.toBeInTheDocument();
    fetchSpy.mockRestore();
  });

  it("validates advanced settings and restores defaults", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /高级设置/ }));
    await user.click(screen.getByText("小写字母"));
    await user.click(screen.getByText("大写字母"));
    await user.click(screen.getByText("数字"));
    expect(screen.getByRole("alert")).toHaveTextContent("请至少选择一种字符类型");
    expect(screen.getByRole("button", { name: "重新生成" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "恢复默认设置" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("默认规则")).toBeInTheDocument();
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
