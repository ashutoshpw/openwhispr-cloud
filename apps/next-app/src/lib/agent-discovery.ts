import {
  absoluteUrl,
  getPublicBlogPaths,
  normalizePathname,
  sha256,
} from "@/lib/site-config";
import { blog } from "@/lib/source";

export function isMarkdownRequest(request: Request): boolean {
  return request.headers.get("accept")?.includes("text/markdown") ?? false;
}

export function isPublicMarkdownPath(pathname: string): boolean {
  const normalized = normalizePathname(pathname);

  if (
    normalized.startsWith("/api") ||
    normalized.startsWith("/auth") ||
    normalized.startsWith("/dashboard") ||
    normalized.startsWith("/account") ||
    normalized.startsWith("/adminx") ||
    normalized.startsWith("/consent") ||
    normalized.startsWith("/_next")
  ) {
    return false;
  }

  return new Set([
    "/",
    "/blog",
    "/help",
    "/privacy",
    "/terms",
    "/changelog",
    "/marketing-page",
    ...getPublicBlogPaths(),
  ]).has(normalized);
}

export function getMarkdownContent(pathname: string): string | null {
  const normalized = normalizePathname(pathname);

  if (normalized === "/") {
    return [
      "# Nextjs Starter Kit",
      "",
      "Build a SAAS with a solid foundation.",
      "",
      "## Key sections",
      "- Authentication and onboarding",
      "- Billing and Stripe integration",
      "- Admin and workspace dashboards",
      "- Blog and docs publishing",
      "- MCP and AI-agent integration",
      "",
      `Blog: ${absoluteUrl("/blog")}`,
      `Get started: ${absoluteUrl("/auth/sign-in")}`,
    ].join("\n");
  }

  if (normalized === "/blog") {
    return [
      "# Blog",
      "",
      "Explore the latest blog posts available in this starter template.",
      "",
      ...blog
        .slice()
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((post) => {
          const slug = post.info.path.replace(/\.mdx$/, "");
          return `- [${post.title}](${absoluteUrl(`/blog/${slug}`)}): ${post.excerpt ?? ""}`;
        }),
    ].join("\n");
  }

  if (normalized.startsWith("/blog/")) {
    const slug = normalized.replace("/blog/", "");
    const post = blog.find(
      (entry) => entry.info.path.replace(/\.mdx$/, "") === slug,
    );
    if (!post) return null;

    return [
      `# ${post.title}`,
      "",
      `URL: ${absoluteUrl(normalized)}`,
      `Date: ${post.date}`,
      post.author ? `Author: ${post.author}` : null,
      "",
      post.excerpt ?? "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  const staticPages: Record<string, string> = {
    "/help":
      "# Help\n\nSupport and self-serve guidance for the starter template.",
    "/privacy": "# Privacy Policy\n\nPrivacy and data handling information.",
    "/terms": "# Terms\n\nTerms and conditions for the product.",
    "/changelog": "# Changelog\n\nRecent product and template changes.",
    "/marketing-page":
      "# Marketing Page\n\nAlternative public marketing page for the starter template.",
  };

  return staticPages[normalized] ?? null;
}

export function createLinkHeader(pathname: string): string {
  const normalized = normalizePathname(pathname);
  const markdownUrl = normalized === "/" ? "/" : normalized;

  return [
    `</.well-known/api-catalog>; rel="api-catalog"`,
    `<${markdownUrl}>; rel="alternate"; type="text/markdown"`,
  ].join(", ");
}

function skillEntry(name: string, description: string, path: string) {
  const url = absoluteUrl(path);
  return {
    name,
    type: "documentation",
    description,
    url,
    sha256: sha256(getSkillDocument(name, description, url)),
  };
}

export function getSkillDocument(
  name: string,
  description: string,
  url: string,
): string {
  return [`# ${name}`, "", description, "", `Reference: ${url}`].join("\n");
}

export function getAgentSkillsIndex() {
  return {
    $schema: "https://agentskills.io/schemas/index.json",
    skills: [
      skillEntry(
        "sitemap",
        "Describes how sitemap.xml is generated for canonical public URLs.",
        "/.well-known/agent-skills/sitemap",
      ),
      skillEntry(
        "link-headers",
        "Describes Link headers published for agent discovery.",
        "/.well-known/agent-skills/link-headers",
      ),
      skillEntry(
        "markdown-negotiation",
        "Describes markdown content negotiation for public pages.",
        "/.well-known/agent-skills/markdown-negotiation",
      ),
      skillEntry(
        "content-signals",
        "Describes AI content preferences advertised via robots.txt.",
        "/.well-known/agent-skills/content-signals",
      ),
      skillEntry(
        "api-catalog",
        "Describes the RFC 9727 API catalog published by the app.",
        "/.well-known/agent-skills/api-catalog",
      ),
      skillEntry(
        "oauth-discovery",
        "Describes OIDC and OAuth discovery endpoints exposed by the app.",
        "/.well-known/agent-skills/oauth-discovery",
      ),
      skillEntry(
        "oauth-protected-resource",
        "Describes OAuth protected resource metadata for authenticated APIs.",
        "/.well-known/agent-skills/oauth-protected-resource",
      ),
      skillEntry(
        "mcp-server-card",
        "Describes the MCP server card published for the authenticated MCP endpoint.",
        "/.well-known/agent-skills/mcp-server-card",
      ),
      skillEntry(
        "webmcp",
        "Describes WebMCP tools exposed to supporting browsers.",
        "/.well-known/agent-skills/webmcp",
      ),
    ],
  };
}
