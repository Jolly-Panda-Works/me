#!/usr/bin/env node
/**
 * Builds the deployable site into ./_site (or the directory given as argv[2]).
 *
 *   1. copies the static site (css, js, assets, lang, root redirector)
 *   2. clones every repo of the bio organization into _site/bio/<repo-name>/
 *      and writes _site/bio/projects.json
 *   3. renders the generated pages from content/*.json (EN + FA):
 *      /{en,fa}/bio/, how-it-works/, faq/, privacy/, plus 404.html and /bio/
 *   4. puts the shared header/footer into the home pages
 *   5. writes sitemap.xml (home + pages + every published profile) and robots.txt
 *
 * Runs on Vercel (Build Command in vercel.json). No npm dependencies; needs
 * Node 18+ and git, both present in Vercel's build image.
 *
 * Env vars:
 *   BIO_ORG      GitHub organization to scan          (default: Jolly-Panda-Me)
 *   BIO_TOKEN    token with read access to that org   (only for private repos /
 *                higher API rate limits; falls back to GITHUB_TOKEN)
 *   BIO_EXCLUDE  space-separated repo names to skip
 *   BIO_REPOS    space-separated repo names; skips the API listing (local tests)
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { document_, header, footer, LANGS } from "./lib/layout.mjs";
import * as pages from "./lib/pages.mjs";
import { notFoundPage, bioRedirectPage, sitemap, robotsTxt } from "./lib/extras.mjs";

const ORG = process.env.BIO_ORG || "Jolly-Panda-Me";
const OUT = path.resolve(process.argv[2] || "_site");
const TOKEN = process.env.BIO_TOKEN || process.env.GITHUB_TOKEN || "";
const EXCLUDE = new Set((process.env.BIO_EXCLUDE || "").split(/\s+/).filter(Boolean));

// Top-level entries that are source / tooling, not part of the public site.
const SKIP_TOP = new Set([
  ".git", ".github", ".vscode", ".vercel", "scripts", "templates", "content", "src", "api", "_site",
  "node_modules", "package.json", "package-lock.json", "server", "README.md", "CONTRIBUTING.md", "SECURITY.md",
  "LICENSE", ".gitignore", "vercel.json",
  "en", "fa", "bio", // generated below
]);
const IMAGE_EXT = /\.(png|jpe?g|webp|avif|gif|svg)$/i;
const FALLBACK_IMAGES = [
  "preview", "screenshot", "og-image", "og", "cover", "thumbnail",
  "assets/preview", "assets/og-image", "assets/images/preview",
  "assets/images/og/og-image", "assets/images/og/og", "assets/og/og-image",
];
const EXTS = ["jpg", "jpeg", "png", "webp", "avif"];

const log = (...a) => console.log(...a);
const readJson = (f) => JSON.parse(fs.readFileSync(path.join("content", f), "utf8"));
const write = (rel, content) => {
  const abs = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
};

const site = readJson("site.json");
const SITE_ORIGIN = site.domain;

// ---------------------------------------------------------------- 1. static
function copySite() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const entry of fs.readdirSync(".")) {
    if (SKIP_TOP.has(entry)) continue;
    fs.cpSync(entry, path.join(OUT, entry), { recursive: true });
  }
  fs.mkdirSync(path.join(OUT, "bio"), { recursive: true });
}

// ----------------------------------------------------------------- 2. bios
async function listRepos() {
  if (process.env.BIO_REPOS) {
    return process.env.BIO_REPOS.split(/\s+/).filter(Boolean).map((name) => ({ name }));
  }
  const repos = [];
  for (let page = 1; ; page++) {
    const res = await fetch(`https://api.github.com/orgs/${ORG}/repos?type=all&per_page=100&page=${page}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      },
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status} while listing ${ORG}: ${await res.text()}`);
    const batch = await res.json();
    repos.push(...batch.filter((r) => !r.archived));
    if (batch.length < 100) break;
  }
  return repos;
}

function gitClone(url, dest) {
  const args = [];
  if (TOKEN) {
    const basic = Buffer.from(`x-access-token:${TOKEN}`).toString("base64");
    args.push("-c", `http.extraheader=AUTHORIZATION: basic ${basic}`);
  }
  args.push("clone", "--depth", "1", "--quiet", url, dest);
  execFileSync("git", args, { stdio: ["ignore", "ignore", "ignore"] });
}

function decode(s) {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/\s+/g, " ").trim();
}

function meta(html, key) {
  const a = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, "i");
  const m = html.match(a) || html.match(b);
  return m ? decode(m[1]) : "";
}

function extractInfo(html, repoName) {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ""])[1]);
  const full = meta(html, "og:title") || title || repoName;
  const parts = full.split(/\s+[—–|\-]\s+/); // "Name — Role", "Name | Role", "Name - Role"
  const name = (parts.shift() || repoName).trim();
  const subtitle = parts.join(" — ").trim();
  const description = meta(html, "og:description") || meta(html, "description");
  return { name, subtitle, description };
}

function findPreview(repoDir, html, slug) {
  const exists = (rel) => {
    const abs = path.resolve(repoDir, rel);
    return abs.startsWith(repoDir + path.sep) && fs.existsSync(abs) && fs.statSync(abs).isFile();
  };
  for (const c of [meta(html, "og:image"), meta(html, "twitter:image")].filter(Boolean)) {
    let rel = c;
    if (/^https?:\/\//i.test(c)) {
      if (c.startsWith(SITE_ORIGIN + "/bio/")) {
        // our own domain: the slug in the URL may be stale, so map the rest
        // of the path onto the repo's files instead of trusting it.
        rel = c.slice((SITE_ORIGIN + "/bio/").length).split("/").slice(1).join("/");
      } else {
        return c; // external image, use as-is
      }
    }
    rel = rel.replace(/^\.?\//, "").split(/[?#]/)[0];
    if (rel && IMAGE_EXT.test(rel) && exists(rel)) return `/bio/${slug}/${rel}`;
  }
  for (const base of FALLBACK_IMAGES) {
    for (const ext of EXTS) if (exists(`${base}.${ext}`)) return `/bio/${slug}/${base}.${ext}`;
  }
  return "";
}

/**
 * Prepare a profile's index.html for being served under /bio/<slug>/:
 * pin the <base> URL, and make search engines index the page under the URL
 * it is really served at (<link rel="canonical"> and og:url point to
 * /bio/<slug>/; a repo's own tags may carry a stale or different slug).
 */
export function fixProfileHead(html, slug) {
  // Profile pages use relative asset paths (css/style.css). Those only resolve
  // when the page is opened as /bio/<slug>/ (with the slash), so pin the base
  // URL: it then also works when someone opens /bio/<slug> without it.
  if (!/<base\s/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>\n  <base href="/bio/${slug}/" />`);
  }
  const url = `${SITE_ORIGIN}/bio/${slug}/`;
  const canonical = `<link rel="canonical" href="${url}" />`;
  if (/<link[^>]+rel=["']canonical["'][^>]*>/i.test(html)) {
    html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>/i, canonical);
  } else if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `  ${canonical}\n</head>`);
  }
  html = html.replace(/(<meta[^>]+property=["']og:url["'][^>]*content=["'])[^"']*(["'])/i, `$1${url}$2`);
  html = html.replace(/(<meta[^>]+content=["'])[^"']*(["'][^>]*property=["']og:url["'])/i, `$1${url}$2`);
  return html;
}

async function cloneProfiles() {
  const repos = await listRepos();
  const projects = [];

  for (const repo of repos) {
    const name = repo.name;
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(name)) { log(`skip  ${name} (not a valid URL segment)`); continue; }
    if (EXCLUDE.has(name)) { log(`skip  ${name} (excluded)`); continue; }

    const dest = path.join(OUT, "bio", name);
    if (fs.existsSync(dest)) { log(`skip  ${name} (collides with an existing path in bio/)`); continue; }

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "bio-"));
    const clone = path.join(tmp, "repo");
    try {
      gitClone(`https://github.com/${ORG}/${name}.git`, clone);
    } catch {
      log(`skip  ${name} (clone failed or repo is empty)`);
      fs.rmSync(tmp, { recursive: true, force: true });
      continue;
    }

    const indexPath = path.join(clone, "index.html");
    // Only publish repos that are actually websites. This also stops private
    // non-site repos from being published by accident.
    if (!fs.existsSync(indexPath)) {
      log(`skip  ${name} (no index.html in repo root)`);
      fs.rmSync(tmp, { recursive: true, force: true });
      continue;
    }

    for (const junk of [".git", ".github"]) fs.rmSync(path.join(clone, junk), { recursive: true, force: true });
    for (const f of fs.readdirSync(clone)) if (f.startsWith(".env")) fs.rmSync(path.join(clone, f), { force: true });

    let html = fs.readFileSync(indexPath, "utf8");
    if (/<meta[^>]+name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) {
      log(`warn  ${name}: index.html has a noindex robots tag, Google will not list it`);
    }
    const info = extractInfo(html, name);
    const image = findPreview(clone, html, name);
    html = fixProfileHead(html, name);
    fs.writeFileSync(indexPath, html);

    projects.push({
      slug: name,
      name: info.name,
      subtitle: info.subtitle,
      description: info.description || repo.description || "",
      image,
      topics: repo.topics || [],
      updated: repo.pushed_at || "",
      url: `/bio/${name}/`,
    });

    // copy instead of rename: /tmp and the build dir can be different devices
    // on Vercel (EXDEV), and rename() cannot cross devices.
    fs.cpSync(clone, dest, { recursive: true });
    fs.rmSync(tmp, { recursive: true, force: true });
    log(`ok    ${name} -> /bio/${name}/`);
  }

  projects.sort((a, b) => a.name.localeCompare(b.name, "en", { sensitivity: "base" }));
  write("bio/projects.json", JSON.stringify(projects, null, 2));
  return projects;
}

// --------------------------------------------------------------- 3. pages
function renderGeneratedPages(projects) {
  const how = readJson("how-it-works.json");
  const faq = readJson("faq.json");
  const priv = readJson("privacy.json");
  const bio = readJson("bio.json");
  const notFound = readJson("not-found.json");

  for (const lang of LANGS) {
    const list = [
      pages.howItWorks(site, how, lang),
      pages.faq(site, faq, lang),
      pages.privacy(site, priv, lang),
      pages.bio(site, bio, lang, projects),
    ];
    for (const p of list) {
      write(`${lang}/${p.path}index.html`, document_(site, { lang, ...p }));
    }
  }
  write("404.html", notFoundPage(site, notFound));
  write("bio/index.html", bioRedirectPage(site));
}

// ----------------------------------------------- 4. home: shared header/footer
function renderHomePages() {
  for (const lang of LANGS) {
    const src = fs.readFileSync(path.join(lang, "index.html"), "utf8");
    if (!src.includes("<!--@header-->") || !src.includes("<!--@footer-->")) {
      throw new Error(`${lang}/index.html is missing the <!--@header--> / <!--@footer--> markers`);
    }
    const html = src
      .replace("<!--@header-->", () => header(site, lang, "home", ""))
      .replace("<!--@footer-->", () => footer(site, lang));
    write(`${lang}/index.html`, html);
  }
}

// ------------------------------------------------------------ 5. seo files
function writeSeoFiles(projects) {
  const pagePaths = ["", "bio/", "how-it-works/", "faq/", "privacy/"];
  write("sitemap.xml", sitemap(site, pagePaths, projects));
  write("robots.txt", robotsTxt(site));
}

// ------------------------------------------------------------------- main
copySite();
const projects = await cloneProfiles();
renderGeneratedPages(projects);
renderHomePages();
writeSeoFiles(projects);
log(`Published ${projects.length} bio site(s) from ${ORG}.`);
