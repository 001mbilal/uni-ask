import { describe, test, expect } from "vitest";
import { isStaleUrl, normalizeUrl, score, inDomain, SKIP_ROLL } from "../crawl";

// ── isStaleUrl ────────────────────────────────────────────────────────────────

describe("isStaleUrl", () => {
  const recentYear = new Date().getFullYear();
  const oldYear = recentYear - 3;

  test("flags a URL whose only year is 3+ years old", () => {
    expect(isStaleUrl(`https://example.com/prospectus-${oldYear}.pdf`)).toBe(true);
  });

  test("passes a URL with a recent year", () => {
    expect(isStaleUrl(`https://example.com/fee-${recentYear}.pdf`)).toBe(false);
  });

  test("passes a URL that spans old and recent years", () => {
    expect(isStaleUrl(`https://example.com/fee-${oldYear}-to-${recentYear}.pdf`)).toBe(false);
  });

  test("passes a URL with no years at all", () => {
    expect(isStaleUrl("https://example.com/admissions/apply")).toBe(false);
  });

  test("ignores 4-digit numbers that are not years (e.g. port in URL context)", () => {
    // 1999 is not in the 20xx range matched by the regex
    expect(isStaleUrl("https://example.com/page-1999")).toBe(false);
  });
});

// ── normalizeUrl ──────────────────────────────────────────────────────────────

describe("normalizeUrl", () => {
  test("strips hash fragment", () => {
    expect(normalizeUrl("https://example.com/page#section")).toBe("https://example.com/page");
  });

  test("strips utm_ tracking params", () => {
    expect(normalizeUrl("https://example.com/?utm_source=google&q=1")).toBe(
      "https://example.com/?q=1"
    );
  });

  test("strips fbclid", () => {
    expect(normalizeUrl("https://example.com/?fbclid=abc123")).toBe("https://example.com/");
  });

  test("returns null for mailto: links", () => {
    expect(normalizeUrl("mailto:test@example.com")).toBeNull();
  });

  test("returns null for javascript: links", () => {
    expect(normalizeUrl("javascript:void(0)")).toBeNull();
  });

  test("returns null for URLs longer than 220 chars", () => {
    const long = "https://example.com/" + "a".repeat(210);
    expect(normalizeUrl(long)).toBeNull();
  });

  test("returns null for URLs with query strings longer than 60 chars", () => {
    expect(normalizeUrl("https://example.com/?" + "k=v&".repeat(20))).toBeNull();
  });

  test("accepts a normal https URL", () => {
    expect(normalizeUrl("https://admissions.lums.edu.pk/apply")).toBe(
      "https://admissions.lums.edu.pk/apply"
    );
  });

  test("accepts http URLs", () => {
    expect(normalizeUrl("http://example.com/")).toBe("http://example.com/");
  });
});

// ── score ─────────────────────────────────────────────────────────────────────

describe("score", () => {
  test("gives positive score to admission-related URLs at depth 0", () => {
    expect(score("https://uni.edu.pk/admissions/apply", 0)).toBeGreaterThan(0);
  });

  test("gives positive score to fee/scholarship URLs at depth 0", () => {
    expect(score("https://uni.edu.pk/fee-structure", 0)).toBeGreaterThan(0);
  });

  test("penalises news/event URLs", () => {
    const s1 = score("https://uni.edu.pk/admissions", 0);
    const s2 = score("https://uni.edu.pk/news/event-2025", 0);
    expect(s1).toBeGreaterThan(s2);
  });

  test("penalises deeper depth", () => {
    const url = "https://uni.edu.pk/programs";
    expect(score(url, 0)).toBeGreaterThan(score(url, 3));
  });

  test("boosts PDF URLs", () => {
    const html = score("https://uni.edu.pk/fee-structure", 0);
    const pdf = score("https://uni.edu.pk/fee-structure.pdf", 0);
    expect(pdf).toBeGreaterThan(html);
  });
});

// ── inDomain ──────────────────────────────────────────────────────────────────

describe("inDomain", () => {
  test("matches exact domain", () => {
    expect(inDomain("https://lums.edu.pk/", "lums.edu.pk")).toBe(true);
  });

  test("matches subdomain", () => {
    expect(inDomain("https://admissions.lums.edu.pk/apply", "lums.edu.pk")).toBe(true);
  });

  test("rejects different domain", () => {
    expect(inDomain("https://nust.edu.pk/", "lums.edu.pk")).toBe(false);
  });

  test("rejects domain that only suffix-matches (not subdomain)", () => {
    // "notlums.edu.pk" should not match "lums.edu.pk"
    expect(inDomain("https://notlums.edu.pk/", "lums.edu.pk")).toBe(false);
  });
});

// ── SKIP_ROLL ─────────────────────────────────────────────────────────────────

describe("SKIP_ROLL", () => {
  test("matches 'seat list'", () => {
    expect(SKIP_ROLL.test("Seat List BS Computer Science 2026")).toBe(true);
  });

  test("matches 'merit list'", () => {
    expect(SKIP_ROLL.test("Merit List Final 2026")).toBe(true);
  });

  test("matches 'merit-list' with hyphen", () => {
    expect(SKIP_ROLL.test("Merit-List Round 2")).toBe(true);
  });

  test("matches 'result sheet'", () => {
    expect(SKIP_ROLL.test("Result Sheet Annual Examination")).toBe(true);
  });

  test("matches roll number pattern", () => {
    expect(SKIP_ROLL.test("Roll No. 20212345 Ali Raza")).toBe(true);
  });

  test("matches 'student name gender' column header", () => {
    expect(SKIP_ROLL.test("Student Name Gender Father Name")).toBe(true);
  });

  test("does not match normal admission page", () => {
    expect(SKIP_ROLL.test("Admission Requirements for BS Programs")).toBe(false);
  });

  test("does not match fee structure page", () => {
    expect(SKIP_ROLL.test("Fee Structure Spring 2025")).toBe(false);
  });

  test("does not match 'admission merit criteria' (not a list)", () => {
    expect(SKIP_ROLL.test("Merit criteria for admission")).toBe(false);
  });
});

// ── exclude / excludePrefixes (integration with push logic) ───────────────────

describe("exclude and excludePrefixes filtering", () => {
  // These rules are enforced inside crawlUniversity(); we verify the
  // normalizeUrl + inDomain + SKIP_ROLL contract on representative URLs.

  test("known frx prefix URL is not stale (exclusion must be explicit)", () => {
    // frx URLs don't have years, so isStaleUrl won't catch them
    expect(isStaleUrl("https://www.uok.edu.pk/admissions/2026/frxABCDEF.pdf")).toBe(false);
  });

  test("old prospectus URL is stale", () => {
    expect(isStaleUrl("https://docs.szabist.edu.pk/websites/Prospectus/2023/Prospectus-2023-24.pdf")).toBe(true);
  });
});
