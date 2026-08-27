# AI & Law headline blog

A semi-automated blog: an hourly Netlify scheduled function pulls RSS +
Google News headlines about AI and the law, scores relevance and drafts
commentary with Claude, and sends candidates to Telegram with
Approve/Edit/Skip buttons. Approving commits a Markdown post straight to
this repo via the GitHub API, which triggers a Netlify rebuild of the
Astro static site.

**If you're not a developer, ignore this file and use `SETUP_GUIDE.md`
instead** — it's the click-by-click walkthrough for getting this deployed
without a terminal.

## Structure

```
src/                          Astro static site (blog front-end)
  content/posts/*.md          Blog posts (frontmatter: title, pubDate, sourceName, sourceUrl)
  content.config.ts           Content collection schema
  pages/                      Homepage + post template
netlify/functions/
  aggregate.mjs                Scheduled (hourly) — pulls feeds, filters via Claude, posts to Telegram
  telegram-webhook.mjs          HTTP — handles button taps + comment replies, commits to GitHub
  sources.mjs                   Feed list + tunable thresholds
  lib/
    blobs.mjs                   Netlify Blobs helpers (dedupe set, pending-candidate queue, edit state)
    github.mjs                  Commits a new post via the GitHub Contents API
    telegram.mjs                Telegram Bot API wrapper
    anthropic.mjs                Relevance score + draft commentary via Claude (Messages API)
```

## Local development

Not required for normal use (see `SETUP_GUIDE.md`), but if you do want to
run this locally:

```
npm install
npm run dev        # Astro site only, at localhost:4321
netlify dev         # Site + functions together, needs the Netlify CLI
```

`netlify dev` needs the same environment variables listed in `.env.example`
available locally (e.g. via a `.env` file, which is gitignored) and will
use a sandboxed local Blobs store rather than production data.

## Environment variables

See `.env.example` for the full list and where each value comes from.

## Tuning

Edit `netlify/functions/sources.mjs` to change the RSS/Google News source
list, how many new items get sent to Telegram per hourly run
(`MAX_NEW_PER_RUN`), and the minimum relevance score to surface at all
(`MIN_RELEVANCE_SCORE`).
