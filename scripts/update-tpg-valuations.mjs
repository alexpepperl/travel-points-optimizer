import { readFile, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export const TPG_URL = "https://thepointsguy.com/loyalty-programs/monthly-valuations/";

const PROGRAMS = {
  bonvoy: { label: "Marriott Bonvoy", min: 0.1, max: 3 },
  alaska: { label: "Alaska Airlines Atmos Rewards", min: 0.1, max: 5 },
  delta: { label: "Delta SkyMiles", min: 0.1, max: 5 },
  chase: { label: "Chase Ultimate Rewards", min: 0.1, max: 5 }
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeCell(value) {
  return value
    .replace(/\\u003c/gi, "<")
    .replace(/\\u003e/gi, ">")
    .replace(/\\u0026/gi, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#xA0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function extractProgramValue(html, program) {
  const rowPattern = new RegExp(
    `<tr[^>]*>(?:(?!</tr>)[\\s\\S])*?${escapeRegExp(program.label)}(?:(?!</tr>)[\\s\\S])*?</tr>`,
    "i"
  );
  const row = html.match(rowPattern)?.[0];
  if (!row) {
    throw new Error(`Could not find the TPG table row for ${program.label}`);
  }

  const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)];
  if (cells.length < 2) {
    throw new Error(`Could not find the valuation cell for ${program.label}`);
  }

  const text = decodeCell(cells[1][1]);
  const value = Number.parseFloat(text.match(/\d+(?:\.\d+)?/)?.[0] ?? "");
  if (!Number.isFinite(value) || value < program.min || value > program.max) {
    throw new Error(`Invalid valuation "${text}" for ${program.label}`);
  }
  return value;
}

export function extractValuations(html) {
  const monthMatch = html.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December) (20\d{2}) valuation\b/i
  );
  if (!monthMatch) {
    throw new Error("Could not determine the valuation month from TPG");
  }

  const date = new Date(`${monthMatch[1]} 1, ${monthMatch[2]} 00:00:00 UTC`);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid valuation month: ${monthMatch[1]} ${monthMatch[2]}`);
  }

  return {
    month: date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" }),
    bonvoy: extractProgramValue(html, PROGRAMS.bonvoy),
    alaska: extractProgramValue(html, PROGRAMS.alaska),
    delta: extractProgramValue(html, PROGRAMS.delta),
    chase: extractProgramValue(html, PROGRAMS.chase)
  };
}

function formatValue(value) {
  return value.toFixed(2);
}

export function updateIndexHtml(html, valuations) {
  const defaultsPattern = /var DEFAULTS = \{ valBonvoy: [\d.]+, valAlaska: [\d.]+, valDelta: [\d.]+, valChase: [\d.]+, certCap: 35000 \};/;
  if (!defaultsPattern.test(html)) {
    throw new Error("Could not find the calculator defaults in index.html");
  }

  let updated = html.replace(
    defaultsPattern,
    `var DEFAULTS = { valBonvoy: ${formatValue(valuations.bonvoy)}, valAlaska: ${formatValue(valuations.alaska)}, valDelta: ${formatValue(valuations.delta)}, valChase: ${formatValue(valuations.chase)}, certCap: 35000 };`
  );

  const historyPattern = /(var HISTORY = \[\r?\n)([\s\S]*?)(\r?\n  \];)/;
  const historyMatch = updated.match(historyPattern);
  if (!historyMatch) {
    throw new Error("Could not find the valuation history in index.html");
  }

  const entry = `    { month: "${valuations.month}", bonvoy: ${formatValue(valuations.bonvoy)}, alaska: ${formatValue(valuations.alaska)}, delta: ${formatValue(valuations.delta)}, chase: ${formatValue(valuations.chase)} }`;
  const existingMonthPattern = new RegExp(
    `^\\s*\\{ month: "${escapeRegExp(valuations.month)}"[^\\r\\n]*\\}`,
    "m"
  );
  let historyBody = historyMatch[2];
  if (existingMonthPattern.test(historyBody)) {
    historyBody = historyBody.replace(existingMonthPattern, entry);
  } else {
    historyBody = `${historyBody.trimEnd().replace(/,?$/, ",")}\n${entry}`;
  }

  updated = updated.replace(historyPattern, `$1${historyBody}$3`);
  return updated;
}

async function fetchTpgHtml() {
  const response = await fetch(TPG_URL, {
    headers: { "User-Agent": "travel-points-optimizer valuation updater" },
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) {
    throw new Error(`TPG request failed with HTTP ${response.status}`);
  }
  return response.text();
}

async function main() {
  const sourceHtml = process.env.TPG_HTML_FILE
    ? await readFile(process.env.TPG_HTML_FILE, "utf8")
    : await fetchTpgHtml();
  const valuations = extractValuations(sourceHtml);
  const indexPath = process.env.INDEX_HTML_FILE ?? "index.html";
  const current = await readFile(indexPath, "utf8");
  const updated = updateIndexHtml(current, valuations);

  if (updated === current) {
    console.log(`TPG valuations are already current for ${valuations.month}.`);
    return;
  }

  await writeFile(indexPath, updated, "utf8");
  console.log(`Updated TPG valuations for ${valuations.month}:`, valuations);
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
