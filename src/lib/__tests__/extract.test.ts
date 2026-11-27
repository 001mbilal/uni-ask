import { describe, test, expect } from "vitest";
import { extractHtml } from "../extract";

const BASE = "https://example.com/";

describe("extractHtml", () => {
  test("extracts page title from <title>", () => {
    const { title } = extractHtml("<html><head><title>Fee Structure</title></head><body><p>text</p></body></html>", BASE);
    expect(title).toBe("Fee Structure");
  });

  test("falls back to <h1> when <title> is absent", () => {
    const { title } = extractHtml("<html><body><h1>Admissions 2026</h1><p>text</p></body></html>", BASE);
    expect(title).toBe("Admissions 2026");
  });

  test("renders table rows as pipe-separated cells", () => {
    const html = `<table><tr><th>Program</th><th>Fee</th></tr><tr><td>BS CS</td><td>120,000</td></tr></table>`;
    const { text } = extractHtml(html, BASE);
    expect(text).toContain("Program | Fee");
    expect(text).toContain("BS CS | 120,000");
  });

  test("prefixes headings with #", () => {
    const { text } = extractHtml("<h2>Eligibility Criteria</h2><p>Some text</p>", BASE);
    expect(text).toContain("# Eligibility Criteria");
  });

  test("prefixes list items with -", () => {
    const { text } = extractHtml("<ul><li>HSSC / A-Level</li><li>50% marks</li></ul>", BASE);
    expect(text).toContain("- HSSC / A-Level");
    expect(text).toContain("- 50% marks");
  });

  test("collects links from <a href>", () => {
    const html = `<a href="/admissions">Apply</a><a href="https://other.com/">Other</a>`;
    const { links } = extractHtml(html, BASE);
    expect(links).toContain("https://example.com/admissions");
    expect(links).toContain("https://other.com/");
  });

  test("resolves relative links using baseUrl", () => {
    const { links } = extractHtml(`<a href="../fees">Fees</a>`, "https://example.com/programs/");
    expect(links).toContain("https://example.com/fees");
  });

  test("strips nav/footer/script/style from text", () => {
    const html = `
      <nav>Nav links</nav>
      <main><p>Main content</p></main>
      <footer>Footer stuff</footer>
      <script>alert(1)</script>
      <style>body{color:red}</style>`;
    const { text } = extractHtml(html, BASE);
    expect(text).toContain("Main content");
    expect(text).not.toContain("Nav links");
    expect(text).not.toContain("Footer stuff");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("body{color");
  });

  test("deduplicates adjacent identical lines", () => {
    const html = "<p>Duplicate line</p><p>Duplicate line</p><p>Unique line</p>";
    const { text } = extractHtml(html, BASE);
    const lines = text.split("\n");
    const dups = lines.filter((l) => l === "Duplicate line");
    expect(dups.length).toBe(1);
  });

  test("collapses internal whitespace in text", () => {
    const { text } = extractHtml("<p>too   many    spaces</p>", BASE);
    expect(text).toBe("too many spaces");
  });
});
