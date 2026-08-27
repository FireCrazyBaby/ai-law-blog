// Thin wrapper around the Telegram Bot API. Nothing fancy -- just
// plain HTTP requests, which is all the Bot API is under the hood.

function botToken() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("Missing TELEGRAM_BOT_TOKEN environment variable");
  return t;
}

function apiUrl(method) {
  return `https://api.telegram.org/bot${botToken()}/${method}`;
}

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function call(method, payload) {
  const res = await fetch(apiUrl(method), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.ok) {
    console.error(`Telegram ${method} failed:`, data);
  }
  return data;
}

export function sendMessage(chatId, text, replyMarkup) {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
    reply_markup: replyMarkup,
  });
}

export function editMessageText(chatId, messageId, text, replyMarkup) {
  return call("editMessageText", {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: "HTML",
    reply_markup: replyMarkup,
  });
}

export function answerCallbackQuery(callbackQueryId, text) {
  return call("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: false,
  });
}

export function approveKeyboard(id) {
  return {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: `approve:${id}` },
        { text: "✏️ Edit comment", callback_data: `edit:${id}` },
        { text: "❌ Skip", callback_data: `skip:${id}` },
      ],
    ],
  };
}
