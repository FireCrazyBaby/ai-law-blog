// This is the function that runs automatically once an hour (see the
// `config.schedule` line at the bottom). It pulls headlines from every
// feed in sources.mjs, asks Claude to score how relevant each one is to
// an "AI and the law" blog and draft a short comment, then sends the
// good ones to your Telegram chat with Approve / Edit / Skip buttons.
//
// You should never need to run this by hand, but you can trigger it
// manually from the Netlify dashboard while testing (see SETUP_GUIDE
// Part 6).

import Parser from "rss-parser";
import { randomUUID } from "node:crypto";
import { ALL_FEEDS, MAX_NEW_PER_RUN, MIN_RELEVANCE_SCORE } from "./sources.mjs";
import { getSeenSet, saveSeenSet, saveCandidate } from "./lib/blobs.mjs";
import { analyzeArticle } from "./lib/anthropic.mjs";
import { sendMessage, approveKeyboard, escapeHtml } from "./lib/telegram.mjs";

// Safety valve so one giant catch-up run (e.g. your very first run)
// can't blow past Netlify's 30-second time limit.
const MAX_CONSIDER_PER_RUN = 40;

async function fetchAllFeeds() {
  const parser = new Parser({ timeout: 8000 });
  const results = await Promise.allSettled(
    ALL_FEEDS.map(async (feed) => {
      const parsed = await parser.parseURL(feed.url);
      return (parsed.items || []).map((item) => ({
        title: (item.title || "").trim(),
        link: item.link,
        pubDate: item.isoDate || item.pubDate || new Date().toISOString(),
        snippet: (item.contentSnippet || item.content || "").slice(0, 500).trim(),
        sourceName: feed.name,
      }));
    })
  );

  const items = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      items.push(...r.value);
    } else {
      console.error(`Feed failed: ${ALL_FEEDS[i].name} (${ALL_FEEDS[i].url})`, r.reason?.message || r.reason);
    }
  });
  return items;
}

// Run analyzeArticle on a list of items with limited concurrency, so we
// don't fire 40 requests at Anthropic at the exact same instant.
async function analyzeInBatches(items, batchSize = 8) {
  const out = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const analyzed = await Promise.all(
      batch.map(async (item) => {
        try {
          const { score, commentary } = await analyzeArticle(item);
          return { ...item, score, commentary };
        } catch (err) {
          console.error("Anthropic analysis failed for", item.link, err.message);
          return { ...item, score: 0, commentary: "" };
        }
      })
    );
    out.push(...analyzed);
  }
  return out;
}

function formatMessage(item) {
  const lines = [
    `<b>${escapeHtml(item.title)}</b>`,
    `<i>${escapeHtml(item.sourceName)}</i> · relevance ${item.score}/10`,
    "",
  ];
  if (item.snippet) lines.push(escapeHtml(item.snippet), "");
  if (item.commentary) lines.push(`💬 <b>Draft comment:</b> ${escapeHtml(item.commentary)}`, "");
  lines.push(item.link);
  return lines.join("\n");
}

export default async () => {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.error("Missing TELEGRAM_CHAT_ID environment variable -- nothing to do.");
    return;
  }

  const seen = await getSeenSet();

  const allItems = await fetchAllFeeds();

  // Drop anything without a link, dedupe by link, drop anything already seen.
  const byLink = new Map();
  for (const item of allItems) {
    if (!item.link || seen.has(item.link)) continue;
    if (!byLink.has(item.link)) byLink.set(item.link, item);
  }

  // Newest first, then cap so one run can't run forever.
  const unseen = Array.from(byLink.values())
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, MAX_CONSIDER_PER_RUN);

  if (unseen.length === 0) {
    console.log("No new headlines this run.");
    return;
  }

  const scored = await analyzeInBatches(unseen);

  const passed = scored.filter((s) => s.score >= MIN_RELEVANCE_SCORE);
  const failed = scored.filter((s) => s.score < MIN_RELEVANCE_SCORE);

  // Items that didn't pass are done -- mark them seen so we don't
  // re-evaluate them every hour.
  for (const item of failed) seen.add(item.link);

  passed.sort((a, b) => b.score - a.score);
  const toSend = passed.slice(0, MAX_NEW_PER_RUN);
  // Anything above the per-run cap stays UNSEEN on purpose, so it gets
  // reconsidered (and likely sent) on the next run instead of being lost.

  for (const item of toSend) {
    const id = randomUUID();
    await saveCandidate(id, item);
    await sendMessage(chatId, formatMessage(item), approveKeyboard(id));
    seen.add(item.link);
  }

  await saveSeenSet(seen);

  console.log(
    `Considered ${unseen.length}, sent ${toSend.length}, filtered out ${failed.length}.`
  );
};

export const config = {
  schedule: "@hourly",
};
