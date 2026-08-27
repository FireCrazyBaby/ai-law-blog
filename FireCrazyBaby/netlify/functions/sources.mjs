// ---------------------------------------------------------------------
// This is the ONE file you'll probably want to edit over time. It's a
// plain list -- no programming needed to change it. Add or remove lines,
// commit the change on GitHub, and the very next scheduled run will use
// the updated list. Nothing else in the project needs to change.
// ---------------------------------------------------------------------

// Regular RSS feeds. Each one is just a name (for your own reference in
// Telegram) and the feed's URL.
export const RSS_FEEDS = [
  { name: "TechCrunch - AI", url: "https://techcrunch.com/category/artificial-intelligence/feed/" },
  { name: "The Verge - AI", url: "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml" },
  { name: "VentureBeat - AI", url: "https://venturebeat.com/category/ai/feed/" },
  { name: "Ars Technica - AI", url: "https://arstechnica.com/tag/ai/feed/" },
  { name: "MIT Technology Review - AI", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed" },
  { name: "Above the Law", url: "https://abovethelaw.com/feed/" },
  { name: "EFF Deeplinks", url: "https://www.eff.org/rss/updates.xml" },
  { name: "IAPP News", url: "https://iapp.org/news/rss/" },
  { name: "Stanford HAI", url: "https://hai.stanford.edu/rss.xml" },
];

// Google News searches. You don't need any API key for these -- Google
// News publishes an RSS feed for any search query. Add a new phrase here
// any time you think of a good search term.
const GOOGLE_NEWS_QUERIES = [
  '"artificial intelligence" law',
  '"AI regulation"',
  '"AI Act"',
  "AI copyright lawsuit",
  "algorithm discrimination lawsuit",
  "generative AI court case",
  "AI liability law",
  "facial recognition lawsuit",
  "AI antitrust",
  "AI privacy law",
  "chatbot lawsuit",
  "AI patent law",
];

function googleNewsFeed(query) {
  const q = encodeURIComponent(query);
  return {
    name: `Google News: ${query}`,
    url: `https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`,
  };
}

export const ALL_FEEDS = [...RSS_FEEDS, ...GOOGLE_NEWS_QUERIES.map(googleNewsFeed)];

// Safety valve: the most new candidates the aggregator will send to
// Telegram in a single run, so one busy hour (or your very first run,
// when EVERYTHING looks "new") doesn't flood your chat or make the
// function time out. Raise this later if you want.
export const MAX_NEW_PER_RUN = 8;

// Anything the AI filter scores below this (0-10) is silently skipped
// and never shown to you at all. Lower this if you feel like you're
// missing relevant stories; raise it if you're getting too much noise.
export const MIN_RELEVANCE_SCORE = 6;
