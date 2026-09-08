import { relative, resolve } from "node:path";
import { normalizePath, type HtmlTagDescriptor, type Plugin } from "vite";

import { SITE_PAGES } from "../src/site-pages.ts";
import { publicThemeBootstrapScript } from "../src/types/bingo/public-preferences.ts";

const OPEN_GRAPH_DESCRIPTION = "技大祭ビンゴ大会の番号表示・景品確認を行うアプリケーション";

const escapeHtml = (value: string) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

function robotsText(siteUrl: string) {
  return [
    "User-agent: *",
    "Allow: /",
    "Allow: /prizes",
    "Disallow: /admin",
    "Disallow: /screen",
    "Disallow: /api",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\n");
}

function sitemapXml(siteUrl: string) {
  const lastmod = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${escapeHtml(siteUrl)}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>1</priority></url>
  <url><loc>${escapeHtml(`${siteUrl}/prizes`)}</loc><lastmod>${lastmod}</lastmod><changefreq>daily</changefreq><priority>0.8</priority></url>
</urlset>
`;
}

export function siteHtml({ siteUrl }: { siteUrl: string }): Plugin {
  const root = resolve(import.meta.dirname, "..");
  const pagesByHtml = new Map<string, (typeof SITE_PAGES)[number]>(
    SITE_PAGES.map((page) => [page.html, page]),
  );

  return {
    name: "nutfes-site-html",
    transformIndexHtml: {
      order: "pre",
      handler(html, context) {
        // Cloudflare passes an absolute filename as the dev transform URL.
        const filename = context.server ? context.path : context.filename;
        const relativeFilename = normalizePath(relative(root, filename));
        const page = pagesByHtml.get(relativeFilename);
        const isNotFound = relativeFilename === "404.html";
        if (!page && !isNotFound) {
          throw new Error(`HTML input is not registered in SITE_PAGES: ${relativeFilename}`);
        }

        const title = page?.title ?? "404 | NUTFes Bingo";
        const description = page?.description ?? "指定されたページが見つかりません。";
        const noindex = page?.noindex ?? true;
        const tags: HtmlTagDescriptor[] = [
          { tag: "title", children: title, injectTo: "head" as const },
          {
            tag: "meta",
            attrs: { name: "description", content: description },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { name: "robots", content: noindex ? "noindex,nofollow" : "index,follow" },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { property: "og:title", content: "NUTFes Bingo" },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { property: "og:description", content: OPEN_GRAPH_DESCRIPTION },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { property: "og:url", content: siteUrl },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { property: "og:site_name", content: "NUTFes Bingo" },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { property: "og:locale", content: "ja_JP" },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { property: "og:type", content: "website" },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { property: "og:image", content: `${siteUrl}/opengraph-image.png` },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { name: "twitter:card", content: "summary" },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { name: "twitter:title", content: "NUTFes Bingo" },
            injectTo: "head" as const,
          },
          {
            tag: "meta",
            attrs: { name: "twitter:description", content: OPEN_GRAPH_DESCRIPTION },
            injectTo: "head" as const,
          },
        ];
        if (page && page.area !== "admin") {
          tags.push({
            tag: "script",
            children: publicThemeBootstrapScript(false),
            injectTo: "head-prepend",
          });
        }
        return { html, tags };
      },
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url === "/robots.txt") {
          response.statusCode = 200;
          response.setHeader("Content-Type", "text/plain; charset=utf-8");
          response.end(robotsText(siteUrl));
          return;
        }
        if (request.url === "/sitemap.xml") {
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/xml; charset=utf-8");
          response.end(sitemapXml(siteUrl));
          return;
        }
        next();
      });
    },
    generateBundle() {
      if (this.environment.name !== "client") return;
      this.emitFile({ type: "asset", fileName: "robots.txt", source: robotsText(siteUrl) });
      this.emitFile({ type: "asset", fileName: "sitemap.xml", source: sitemapXml(siteUrl) });
    },
  };
}
