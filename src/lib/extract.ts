import * as cheerio from "cheerio";

export type Extracted = {
  title: string;
  text: string;
  links: string[];
};

const BLOCK = "h1,h2,h3,h4,h5,p,li,tr,dt,dd,pre,blockquote";

function clean(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

/** HTML to readable text. Keeps headings and turns table rows into "a | b | c". */
export function extractHtml(html: string, baseUrl: string): Extracted {
  const $ = cheerio.load(html);

  // collect links before stripping navigation, since menus are how we discover pages
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      links.push(new URL(href, baseUrl).toString());
    } catch {
      /* ignore bad hrefs */
    }
  });

  $("script,style,noscript,svg,iframe,form,nav,footer,aside,header,[role=navigation]").remove();

  const title = clean($("title").first().text() || $("h1").first().text() || "");
  const root = $("main").length ? $("main").first() : $("body");

  const lines: string[] = [];
  root.find(BLOCK).each((_, el) => {
    const $el = $(el);
    const tag = (el as unknown as { tagName: string }).tagName.toLowerCase();

    if (tag !== "tr" && $el.closest("tr").length) return; // handled by the row

    let line = "";
    if (tag === "tr") {
      const cells = $el
        .children("th,td")
        .map((_, c) => clean($(c).text()))
        .get()
        .filter(Boolean);
      line = cells.join(" | ");
    } else if (tag === "li") {
      line = clean($el.clone().children("ul,ol").remove().end().text());
      if (line) line = "- " + line;
    } else if (/^h[1-5]$/.test(tag)) {
      line = clean($el.text());
      if (line) line = "# " + line;
    } else {
      line = clean($el.text());
    }
    if (line) lines.push(line);
  });

  const deduped = lines.filter((l, i) => i === 0 || l !== lines[i - 1]);
  return { title, text: deduped.join("\n"), links };
}

export async function extractPdf(buf: Buffer): Promise<{ title: string; text: string }> {
  // import the inner file: the package index runs a debug routine on import
  const mod = await import("pdf-parse/lib/pdf-parse.js");
  const pdf = (mod as { default?: unknown }).default ?? mod;
  const data = await (pdf as (b: Buffer) => Promise<{ text: string; info?: { Title?: string } }>)(buf);
  const text = data.text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");
  return { title: clean(data.info?.Title ?? ""), text };
}
