#!/usr/bin/env node
/**
 * Builds the deployable site into ./_site (or the directory given as argv[2]):
 *   1. copies this repository's static site (excluding tooling)
 *   2. clones every repo of the bio organization into _site/bio/<repo-name>/
 *   3. writes _site/bio/projects.json, which powers the /bio/ listing page
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

const ORG = process.env.BIO_ORG || "Jolly-Panda-Me";
const OUT = path.resolve(process.argv[2] || "_site");
const TOKEN = process.env.BIO_TOKEN || process.env.GITHUB_TOKEN || "";
const EXCLUDE = new Set((process.env.BIO_EXCLUDE || "").split(/\s+/).filter(Boolean));
const SITE_ORIGIN = "https://me.jollypanda.ir";

// Top-level entries that are tooling, not part of the public site.
const SKIP_TOP = new Set([
  ".git", ".github", ".vscode", ".vercel", "scripts", "templates", "_site",
  "node_modules", "README.md", "CONTRIBUTING.md", "SECURITY.md", "LICENSE",
  ".gitignore", "vercel.json",
]);
const IMAGE_EXT = /\.(png|jpe?g|webp|avif|gif|svg)$/i;
const FALLBACK_IMAGES = [
  "preview", "screenshot", "og-image", "og", "cover", "thumbnail",
  "assets/preview", "assets/og-image", "assets/images/preview",
  "assets/images/og/og-image", "assets/images/og/og", "assets/og/og-image",
];
const EXTS = ["jpg", "jpeg", "png", "webp", "avif"];

// ---------------------------------------------------------------- helpers
const log = (...a) => console.log(...a);

function copySite() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  for (const entry of fs.readdirSync(".")) {
    if (SKIP_TOP.has(entry)) continue;
    fs.cpSync(entry, path.join(OUT, entry), { recursive: true });
  }
  fs.mkdirSync(path.join(OUT, "bio"), { recursive: true });
}

async function listRepos() {
  if (process.env.BIO_REPOS) {
    return process.env.BIO_REPOS.split(/\s+/).filter(Boolean).map((name) => ({ name }));
  }
  const repos = [];
  for (let page = 1; ; page++) {
    const res = await fetch(
      `https://api.github.com/orgs/${ORG}/repos?type=all&per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
          ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
        },
      }
    );
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
  // matches <meta name|property="key" content="..."> in either attribute order
  const a = new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)["']`, "i");
  const b = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, "i");
  const m = html.match(a) || html.match(b);
  return m ? decode(m[1]) : "";
}

function extractInfo(html, repoName) {
  const title = decode((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ""])[1]);
  const full = meta(html, "og:title") || title || repoName;
  // "Name — Role", "Name | Role", "Name - Role"
  const parts = full.split(/\s+[—–|\-]\s+/);
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
  const candidates = [meta(html, "og:image"), meta(html, "twitter:image")].filter(Boolean);
  for (const c of candidates) {
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

// ------------------------------------------------------------------- main
copySite();

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

  const html = fs.readFileSync(indexPath, "utf8");
  const info = extractInfo(html, name);
  projects.push({
    slug: name,
    name: info.name,
    subtitle: info.subtitle,
    description: info.description || repo.description || "",
    image: findPreview(clone, html, name),
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
fs.writeFileSync(path.join(OUT, "bio", "projects.json"), JSON.stringify(projects, null, 2));
log(`Published ${projects.length} bio site(s) from ${ORG}.`);
