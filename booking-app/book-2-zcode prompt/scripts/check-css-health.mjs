#!/usr/bin/env node

const DEFAULT_BASE_URL = "http://localhost:5173";
const baseUrl = (process.env.BASE_URL || process.argv[2] || DEFAULT_BASE_URL).replace(/\/+$/, "");
const pagesToCheck = ["/", "/book", "/services"];

function formatPageUrl(pathname) {
  return `${baseUrl}${pathname}`;
}

function extractStylesheetHrefs(html) {
  const hrefs = [];
  const regex = /<link[^>]+rel=["']stylesheet["'][^>]+href=["']([^"']+)["']/gi;

  let match = regex.exec(html);
  while (match) {
    hrefs.push(match[1]);
    match = regex.exec(html);
  }

  return hrefs;
}

function selectAppStylesheet(hrefs) {
  return hrefs.find((href) => href.includes("/_next/static/css/app/layout.css")) || hrefs[0] || null;
}

function ensure(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log(`[css-health] Checking CSS delivery at ${baseUrl}`);

  const stylesheetUrls = new Set();

  for (const pathname of pagesToCheck) {
    const pageUrl = formatPageUrl(pathname);
    const response = await fetch(pageUrl);
    const html = await response.text();

    ensure(response.ok, `Page request failed for ${pageUrl} (status ${response.status}).`);

    const hrefs = extractStylesheetHrefs(html);
    ensure(hrefs.length > 0, `No stylesheet link tags found on ${pageUrl}.`);

    const selectedHref = selectAppStylesheet(hrefs);
    ensure(selectedHref, `No usable stylesheet href found on ${pageUrl}.`);

    const stylesheetUrl = new URL(selectedHref, pageUrl).toString();
    stylesheetUrls.add(stylesheetUrl);

    console.log(`[css-health] ${pathname} -> ${stylesheetUrl}`);
  }

  for (const stylesheetUrl of stylesheetUrls) {
    const response = await fetch(stylesheetUrl);
    const css = await response.text();
    const contentType = response.headers.get("content-type") || "";

    ensure(response.ok, `Stylesheet request failed for ${stylesheetUrl} (status ${response.status}).`);
    ensure(contentType.includes("text/css"), `Expected text/css for ${stylesheetUrl}, got '${contentType}'.`);
    ensure(!css.startsWith("<!DOCTYPE html>"), `Stylesheet URL returned HTML for ${stylesheetUrl}.`);
    ensure(css.includes(".min-h-screen"), `Expected Tailwind utility '.min-h-screen' in ${stylesheetUrl}.`);
    ensure(css.includes("--background:"), `Expected CSS variables in ${stylesheetUrl}.`);

    console.log(`[css-health] Verified ${stylesheetUrl}`);
  }

  console.log("[css-health] OK: CSS assets are loading and contain expected Tailwind styles.");
}

run().catch((error) => {
  console.error(`[css-health] FAIL: ${error.message}`);
  process.exit(1);
});
