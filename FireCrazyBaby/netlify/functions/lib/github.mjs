// Publishes a post by committing a new Markdown file straight to your
// GitHub repo via GitHub's REST API. No git, no terminal -- this is the
// same thing as clicking "Add file" on github.com, just done by code.

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "")
    .slice(0, 80) || "post";
}

export async function commitPost({ title, pubDate, sourceName, sourceUrl, snippet, commentary }) {
  const token = process.env.GITHUB_TOKEN;
  const repo = process.env.GITHUB_REPO; // e.g. "yourname/ai-law-blog"
  if (!token) throw new Error("Missing GITHUB_TOKEN environment variable");
  if (!repo) throw new Error("Missing GITHUB_REPO environment variable");

  const dateStr = pubDate.toISOString().slice(0, 10);
  const slug = `${dateStr}-${slugify(title)}`;
  const path = `FireCrazyBaby/src/content/posts/${slug}.md`;

  const frontmatter = [
    "---",
    `title: ${JSON.stringify(title)}`,
    `pubDate: ${dateStr}`,
    `sourceName: ${JSON.stringify(sourceName)}`,
    `sourceUrl: ${JSON.stringify(sourceUrl)}`,
    "---",
    "",
  ].join("\n");

  const bodyParts = [];
  if (snippet) bodyParts.push(`> ${snippet.replace(/\s+/g, " ").trim()}`, "");
  if (commentary) bodyParts.push(commentary.trim(), "");
  bodyParts.push(`[Read the full article at ${sourceName} →](${sourceUrl})`);

  const content = Buffer.from(frontmatter + bodyParts.join("\n"), "utf-8").toString("base64");

  const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "ai-law-blog-bot",
    },
    body: JSON.stringify({
      message: `New post: ${title}`,
      content,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub commit failed (${res.status}): ${text}`);
  }

  return { path, slug };
}
