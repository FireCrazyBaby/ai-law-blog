// Telegram calls this function every time you tap a button (Approve /
// Edit / Skip) or send a text message in your bot's chat. This is what
// actually publishes a post by committing a Markdown file to GitHub.
//
// Its live address, once deployed, is:
//   https://YOUR-SITE-NAME.netlify.app/.netlify/functions/telegram-webhook
// You tell Telegram about this address once, during setup (SETUP_GUIDE
// Part 6). You should never need to call this function yourself.

import {
  getCandidate,
  deleteCandidate,
  setPendingEdit,
  getPendingEdit,
  clearPendingEdit,
} from "./lib/blobs.mjs";
import { commitPost } from "./lib/github.mjs";
import { sendMessage, editMessageText, answerCallbackQuery, escapeHtml } from "./lib/telegram.mjs";

async function handleCallback(callbackQuery) {
  const [action, id] = (callbackQuery.data || "").split(":");
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;

  const candidate = await getCandidate(id);
  if (!candidate) {
    await answerCallbackQuery(callbackQuery.id, "This one's no longer available.");
    return;
  }

  if (action === "skip") {
    await deleteCandidate(id);
    await editMessageText(chatId, messageId, `⏭ Skipped: <b>${escapeHtml(candidate.title)}</b>`);
    await answerCallbackQuery(callbackQuery.id, "Skipped");
    return;
  }

  if (action === "approve") {
    try {
      await commitPost(candidate);
      await deleteCandidate(id);
      await editMessageText(
        chatId,
        messageId,
        `✅ Posted: <b>${escapeHtml(candidate.title)}</b>\n\nIt'll appear on your site within about a minute.`
      );
      await answerCallbackQuery(callbackQuery.id, "Posted!");
    } catch (err) {
      console.error("Failed to publish approved post:", err);
      await answerCallbackQuery(callbackQuery.id, "Something went wrong publishing this -- check the Netlify function logs.");
    }
    return;
  }

  if (action === "edit") {
    await setPendingEdit(chatId, id);
    await editMessageText(
      chatId,
      messageId,
      `✏️ <b>${escapeHtml(candidate.title)}</b>\n\nReply to this chat with the comment you want to use instead, then send it.`
    );
    await answerCallbackQuery(callbackQuery.id, "Reply with your comment");
    return;
  }

  await answerCallbackQuery(callbackQuery.id, "Unknown action.");
}

async function handleMessage(message) {
  const chatId = message.chat.id;
  const text = (message.text || "").trim();
  if (!text) return;

  const pendingId = await getPendingEdit(chatId);
  if (!pendingId) return; // Not waiting on anything -- ignore plain chat.

  const candidate = await getCandidate(pendingId);
  await clearPendingEdit(chatId);

  if (!candidate) {
    await sendMessage(chatId, "That one expired before your comment came in -- sorry! It'll likely show up again on a future run if it's still relevant.");
    return;
  }

  try {
    await commitPost({ ...candidate, commentary: text });
    await deleteCandidate(pendingId);
    await sendMessage(chatId, `✅ Posted with your comment: <b>${escapeHtml(candidate.title)}</b>`);
  } catch (err) {
    console.error("Failed to publish edited post:", err);
    await sendMessage(chatId, "Something went wrong publishing this -- check the Netlify function logs.");
  }
}

export default async (req) => {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const receivedSecret = req.headers.get("x-telegram-bot-api-secret-token");
  if (expectedSecret && receivedSecret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let update;
  try {
    update = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  try {
    if (update.callback_query) {
      await handleCallback(update.callback_query);
    } else if (update.message) {
      await handleMessage(update.message);
    }
  } catch (err) {
    console.error("Webhook handling error:", err);
  }

  // Telegram just needs a 200 response -- it doesn't look at the body.
  return new Response("OK", { status: 200 });
};
