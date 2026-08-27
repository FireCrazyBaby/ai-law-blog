// Asks Claude to (1) score how relevant a headline is to an "AI and the
// law" blog, and (2) draft a short editor's-note style comment you can
// approve as-is or overwrite before it posts.

const MODEL = "claude-haiku-4-5-20251001";

export async function analyzeArticle({ title, snippet, sourceName }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY environment variable");

  const prompt = `You help curate a blog about AI and the law. Given a headline and short snippet, decide:
1. A relevance score from 0-10 for how well this fits a blog specifically about the intersection of artificial intelligence and law (regulation, litigation, courts, legislation, legal ethics, IP, liability, privacy law, antitrust, etc). General AI product news with no legal angle should score low (0-3).
2. A one-to-two sentence draft "editor's commentary" in a knowledgeable, slightly informal voice, as if a lawyer-technologist were adding context for readers -- a point of view or "why this matters," NOT a restatement of the headline.

Headline: ${title}
Source: ${sourceName}
Snippet: ${snippet || "(no snippet available)"}

Respond with ONLY a JSON object, no other text, in exactly this shape:
{"score": <integer 0-10>, "commentary": "<your draft commentary>"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic API error (${res.status}): ${text}`);
  }

  const data = await res.json();
  const raw = data?.content?.[0]?.text?.trim() || "{}";

  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match ? match[0] : raw);
    return {
      score: Number(parsed.score) || 0,
      commentary: String(parsed.commentary || "").trim(),
    };
  } catch {
    return { score: 0, commentary: "" };
  }
}
