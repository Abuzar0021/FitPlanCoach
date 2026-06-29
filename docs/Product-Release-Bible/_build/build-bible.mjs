#!/usr/bin/env node
/**
 * build-bible.mjs — assembles the FitPlanCoach Product & Release Bible PDF.
 *
 * Pipeline (per spec):
 *   1. Read the ordered chapter list (01..27) from ../chapters/.
 *   2. Pre-render every ```mermaid block to a PNG via mermaid-cli (mmdc),
 *      replacing the fenced block with an image reference.
 *   3. Generate a title page + linked Table of Contents from the headings.
 *   4. Render the combined Markdown to PDF with md-to-pdf (Chromium/Puppeteer).
 *   5. Report the real page count.
 *
 * Toolchain note: pandoc + xelatex are unavailable in this environment, so the
 * spec's sanctioned fallback (md-to-pdf, Puppeteer-based) is used. It reuses the
 * pre-installed Chromium — no browser download. Run `npm run smoke` first.
 */
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BIBLE_DIR = path.resolve(__dirname, "..");
const CHAPTERS_DIR = path.join(BIBLE_DIR, "chapters");
const DIAGRAMS_DIR = path.join(BIBLE_DIR, "assets", "diagrams");
const MMDC = path.join(__dirname, "node_modules", ".bin", "mmdc");
const PUPPETEER_CFG = path.join(__dirname, "puppeteer-config.json");
const CSS = path.join(__dirname, "bible.css");
const CHROMIUM = process.env.BIBLE_CHROMIUM || "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const LAUNCH = {
  executablePath: CHROMIUM,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
};

const SMOKE = process.argv.includes("--smoke");

// Canonical chapter order. Files are authored incrementally; missing files are
// skipped with a warning so the build stays runnable mid-authoring (resumable).
const CHAPTER_FILES = [
  "01_executive_summary.md",
  "02_company_vision.md",
  "03_product_overview.md",
  "04_system_architecture.md",
  "05_database.md",
  "06_backend.md",
  "07_frontend.md",
  "08_mobile_app.md",
  "09_website.md",
  "10_admin_cms.md",
  "11_authentication.md",
  "12_memberships.md",
  "13_workout_system.md",
  "14_nutrition_system.md",
  "15_daily_tips.md",
  "16_analytics.md",
  "17_blog.md",
  "18_media_library.md",
  "19_seo.md",
  "20_security.md",
  "21_accessibility.md",
  "22_performance.md",
  "23_testing.md",
  "24_deployment.md",
  "25_launch_checklist.md",
  "26_future_roadmap.md",
  "27_definition_of_done.md",
];

function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[`*_~]/g, "")
    .replace(/[^\w]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Render all mermaid fences in `md` to PNGs; return rewritten markdown. */
async function renderMermaid(md, srcName) {
  const re = /```mermaid\n([\s\S]*?)```/g;
  const jobs = [];
  let m;
  let i = 0;
  while ((m = re.exec(md))) {
    jobs.push({ block: m[0], code: m[1], idx: i++ });
  }
  if (!jobs.length) return md;
  if (!existsSync(MMDC)) {
    console.warn(`  ! mmdc not found at ${MMDC}; leaving ${jobs.length} mermaid block(s) as code.`);
    return md;
  }
  let out = md;
  for (const j of jobs) {
    const base = `${srcName.replace(/\.md$/, "")}-${j.idx}`;
    const mmd = path.join(DIAGRAMS_DIR, `${base}.mmd`);
    const png = path.join(DIAGRAMS_DIR, `${base}.png`);
    await writeFile(mmd, j.code);
    await execFileP(MMDC, [
      "-i",
      mmd,
      "-o",
      png,
      "-s",
      "3",
      "-b",
      "transparent",
      "-p",
      PUPPETEER_CFG,
      "-q",
    ]);
    const rel = path.relative(BIBLE_DIR, png);
    out = out.replace(j.block, `\n![${base}](${rel})\n`);
    console.log(`  · rendered diagram ${base}.png`);
  }
  return out;
}

/** Inject heading anchors + collect TOC entries (h1/h2 only). */
function anchorAndCollect(md, toc) {
  const lines = md.split("\n");
  let inCode = false;
  const seen = new Set();
  const out = lines.map((line) => {
    if (/^```/.test(line)) inCode = !inCode;
    if (inCode) return line;
    const h = /^(#{1,2})\s+(.*)$/.exec(line);
    if (!h) return line;
    const level = h[1].length;
    const text = h[2].replace(/<a id=.*?<\/a>/g, "").trim();
    let slug = slugify(text);
    let n = 1;
    while (seen.has(slug)) slug = `${slugify(text)}-${n++}`;
    seen.add(slug);
    toc.push({ level, text, slug });
    return `${h[1]} ${text} <a id="${slug}"></a>`;
  });
  return out.join("\n");
}

async function build() {
  await mkdir(DIAGRAMS_DIR, { recursive: true });
  const { mdToPdf } = await import("md-to-pdf");

  let sources;
  if (SMOKE) {
    sources = [
      {
        name: "smoke-01.md",
        body: "# Smoke Chapter One\n\nThis is a **toolchain smoke test**. If you can read this in a PDF with a working table of contents and the diagram below renders, the pipeline is healthy.\n\n## Architecture sketch\n\n```mermaid\nflowchart LR\n  A[Browser] --> B[TanStack Start SSR]\n  B --> C[(Supabase)]\n  B --> D[Server Functions]\n  D --> C\n```\n\n## A table\n\n| Layer | Tech |\n|---|---|\n| UI | React 19 |\n| Data | Supabase |\n",
      },
      {
        name: "smoke-02.md",
        body: "# Smoke Chapter Two\n\nSecond page to confirm multi-page assembly and page breaks.\n\n## Closing\n\nIf this paragraph is on its own page, `page-break` works.\n",
      },
    ];
  } else {
    sources = [];
    for (const f of CHAPTER_FILES) {
      const p = path.join(CHAPTERS_DIR, f);
      if (!existsSync(p)) {
        console.warn(`  ! missing chapter ${f} — skipped`);
        continue;
      }
      sources.push({ name: f, body: await readFile(p, "utf-8") });
    }
    if (!sources.length) {
      console.error("No chapter files found in", CHAPTERS_DIR);
      process.exit(1);
    }
  }

  const toc = [];
  const processed = [];
  for (const s of sources) {
    console.log(`Processing ${s.name} …`);
    let body = await renderMermaid(s.body, s.name);
    body = anchorAndCollect(body, toc);
    processed.push(body);
  }

  const tocHtml =
    `<div class="toc">\n\n# Contents\n\n<ul>\n` +
    toc
      .map(
        (t) =>
          `<li class="toc-h${t.level}"><a href="#${t.slug}">${t.text.replace(/&/g, "&amp;")}</a></li>`,
      )
      .join("\n") +
    `\n</ul>\n\n</div>\n\n<div class="page-break"></div>\n`;

  const today = new Date().toISOString().slice(0, 10);
  const titlePage =
    `<div class="title-page">\n` +
    `<div class="title">FitPlanCoach</div>\n` +
    `<div class="subtitle">Product &amp; Release Bible</div>\n` +
    `<div class="subtitle">Engineering, Product &amp; Operations Reference</div>\n` +
    `<div class="meta">Generated ${today}${SMOKE ? " · SMOKE TEST" : ""}</div>\n` +
    `</div>\n`;

  const combined = titlePage + tocHtml + processed.join('\n\n<div class="page-break"></div>\n\n');

  const dest = path.join(
    SMOKE ? __dirname : BIBLE_DIR,
    SMOKE ? "smoke.pdf" : "FitPlanCoach_Product_Release_Bible.pdf",
  );

  console.log(`Rendering PDF → ${dest} …`);
  await mdToPdf(
    { content: combined },
    {
      dest,
      launch_options: LAUNCH,
      stylesheet: [CSS],
      basedir: BIBLE_DIR,
      marked_options: { headerIds: false, mangle: false },
      pdf_options: {
        format: "A4",
        margin: { top: "18mm", bottom: "18mm", left: "16mm", right: "16mm" },
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate:
          '<div style="font-size:8px;width:100%;text-align:center;color:#999;padding-top:4px;">FitPlanCoach — Product &amp; Release Bible &nbsp;·&nbsp; <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
      },
    },
  );

  // Report real page count by counting PDF page objects.
  const buf = await readFile(dest);
  const pages = (buf.toString("latin1").match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(
    `\n✅ Built ${path.basename(dest)} — ~${pages} pages, ${(buf.length / 1024).toFixed(0)} KB`,
  );
}

build().catch((e) => {
  console.error("\n❌ Build failed:", e?.message || e);
  process.exit(1);
});
