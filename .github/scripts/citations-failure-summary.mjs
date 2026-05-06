#!/usr/bin/env node
/**
 * Reads the Vitest JSON report and emits a Markdown summary of failed
 * citation tests, with extracted "broken refs" hints when present in the
 * failure messages (e.g. "[3]", "ref #5", "citation 7", URLs marked broken).
 */
import fs from "node:fs";

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error("No vitest JSON report found:", file);
  process.exit(0);
}

let report;
try {
  report = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (e) {
  console.error("Failed to parse JSON:", e.message);
  process.exit(0);
}

const failures = [];
const walk = (results = []) => {
  for (const r of results) {
    if (r.status === "failed") {
      const messages = (r.failureMessages || []).join("\n");
      failures.push({
        name: r.fullName || r.title || "(test)",
        ancestors: r.ancestorTitles || [],
        message: messages,
      });
    }
  }
};

for (const tf of report.testResults || []) {
  walk(tf.assertionResults || tf.testResults || []);
}

if (failures.length === 0) {
  process.exit(0);
}

const refRegex = /(?:\[(\d{1,3})\]|ref(?:erence)?\s*#?(\d{1,3})|citation\s*#?(\d{1,3}))/gi;
const urlRegex = /https?:\/\/[^\s)"'`]+/g;

const extractRefs = (msg) => {
  const refs = new Set();
  for (const m of msg.matchAll(refRegex)) {
    const n = m[1] || m[2] || m[3];
    if (n) refs.add(`[${n}]`);
  }
  return [...refs];
};

const extractBrokenUrls = (msg) => {
  const urls = new Set();
  const lines = msg.split("\n");
  for (const line of lines) {
    if (/broken|cass[ée]e?|invalid|404|missing|manquant/i.test(line)) {
      for (const u of line.matchAll(urlRegex)) urls.add(u[0]);
    }
  }
  return [...urls];
};

let out = "";
out += "### ❌ Tests de citations en échec\n\n";
out += `**${failures.length}** test(s) en échec dans la suite citations Vitest.\n\n`;

const allRefs = new Set();
const allUrls = new Set();

for (const f of failures) {
  const refs = extractRefs(f.message);
  const urls = extractBrokenUrls(f.message);
  refs.forEach((r) => allRefs.add(r));
  urls.forEach((u) => allUrls.add(u));

  out += `<details><summary>🔻 <code>${escape(f.name)}</code></summary>\n\n`;
  if (f.ancestors.length) {
    out += `*Suite :* ${f.ancestors.map(escape).join(" › ")}\n\n`;
  }
  if (refs.length) out += `**Refs cassées détectées :** ${refs.join(", ")}\n\n`;
  if (urls.length) out += `**URLs problématiques :**\n${urls.map((u) => `- ${u}`).join("\n")}\n\n`;
  out += "```\n" + truncate(f.message, 1500) + "\n```\n\n</details>\n\n";
}

if (allRefs.size || allUrls.size) {
  out += "---\n\n#### 📊 Résumé global\n\n";
  if (allRefs.size) out += `- **Refs cassées :** ${[...allRefs].join(", ")}\n`;
  if (allUrls.size) out += `- **URLs invalides :** ${allUrls.size}\n`;
  out += "\n";
}

out += `_Généré automatiquement par le workflow \`citation-tests.yml\`._\n`;

function escape(s) {
  return String(s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c]));
}
function truncate(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n) + "\n…[tronqué]" : s;
}

process.stdout.write(out);
