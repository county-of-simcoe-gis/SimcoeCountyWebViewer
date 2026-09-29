import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import GithubButton from "@/components/map/controls/GithubButton";

describe("GithubButton", () => {
  it("renders github button with link", () => {
    render(<GithubButton href="https://github.com/test/repo">View on GitHub</GithubButton>);

    const link = screen.getByRole("link", { name: /view on github/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://github.com/test/repo");
  });

  it("opens link in new tab", () => {
    render(<GithubButton href="https://github.com/test/repo">View on GitHub</GithubButton>);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("displays github icon", () => {
    render(<GithubButton href="https://github.com/test/repo">View on GitHub</GithubButton>);

    expect(screen.getByTestId("github-icon")).toBeInTheDocument();
  });

  it("displays children text", () => {
    render(<GithubButton href="https://github.com/test/repo">Custom GitHub Text</GithubButton>);

    expect(screen.getByText("Custom GitHub Text")).toBeInTheDocument();
  });

  it("has proper button styling", () => {
    render(<GithubButton href="https://github.com/test/repo">View on GitHub</GithubButton>);

    const link = screen.getByRole("link");
    expect(link).toHaveClass("github-button-link");
  });

  it("handles empty children gracefully", () => {
    render(<GithubButton href="https://github.com/test/repo" />);

    const link = screen.getByRole("link");
    expect(link).toBeInTheDocument();
    expect(screen.getByTestId("github-icon")).toBeInTheDocument();
  });

  it("works with different href URLs", () => {
    const customHref = "https://github.com/another/repository";

    render(<GithubButton href={customHref}>Different Repo</GithubButton>);

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", customHref);
  });

  it("is accessible", () => {
    render(<GithubButton href="https://github.com/test/repo">View Source Code</GithubButton>);

    const link = screen.getByRole("link", { name: /view source code/i });
    expect(link).toBeInTheDocument();
  });

  it("maintains focus styles for keyboard navigation", () => {
    render(<GithubButton href="https://github.com/test/repo">View on GitHub</GithubButton>);

    const link = screen.getByRole("link");
    // Should have github-button-link class which includes focus styles
    expect(link).toHaveClass("github-button-link");
  });
});
