// Small HTML helpers shared by the page renderers. No dependencies.

export function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Replaces {token} placeholders (only the ones that are provided). */
export function fill(text, vars = {}) {
  return String(text ?? "").replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/**
 * Inline markup for content written in the JSON files:
 *   **bold**   [text](/relative | https://… | mailto:… | #anchor)
 * Everything else is escaped, so the JSON can never inject HTML.
 */
export function inline(text, vars = {}) {
  let out = esc(fill(text, vars));
  out = out.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
    if (!/^(\/|https:\/\/|mailto:|#)/.test(url)) return m;
    const ext = url.startsWith("https://") ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${url}"${ext}>${label}</a>`;
  });
  return out;
}

/** Blank-line separated paragraphs -> <p>…</p> */
export function paragraphs(text, vars = {}) {
  return String(text ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${inline(p, vars)}</p>`)
    .join("\n");
}

/** Plain-text version of inline markup (for meta tags / JSON-LD). */
export function plain(text, vars = {}) {
  return fill(text, vars)
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, "$1");
}

export const escXml = esc;
