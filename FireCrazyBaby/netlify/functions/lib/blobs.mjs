// Small wrapper around Netlify Blobs (a free built-in key-value store).
// You never need to set up a database -- this works automatically as
// soon as the project is deployed on Netlify.

import { getStore } from "@netlify/blobs";

export function seenStore() {
  return getStore("seen-urls");
}

export function queueStore() {
  return getStore("pending-candidates");
}

export function stateStore() {
  return getStore("bot-state");
}

// Returns a Set of every article URL we've already shown to you before
// (whether you approved, edited, or skipped it), so we never show the
// same headline twice.
export async function getSeenSet() {
  const list = await seenStore().get("urls", { type: "json" });
  return new Set(list || []);
}

export async function saveSeenSet(set) {
  // Keep only the most recent 5000 so this doesn't grow forever.
  const arr = Array.from(set).slice(-5000);
  await seenStore().setJSON("urls", arr);
}

// A "candidate" is one headline that's been sent to Telegram and is
// waiting for you to tap a button. We store it by a random ID so the
// webhook can look up the full details when you tap Approve/Edit/Skip.
export async function saveCandidate(id, candidate) {
  await queueStore().setJSON(id, candidate);
}

export async function getCandidate(id) {
  return queueStore().get(id, { type: "json" });
}

export async function deleteCandidate(id) {
  await queueStore().delete(id);
}

// Tracks "we're waiting for you to type a comment for candidate X" so
// that when you reply with a plain text message, the webhook knows
// which headline it belongs to.
export async function setPendingEdit(chatId, candidateId) {
  await stateStore().setJSON(`pending-edit:${chatId}`, { candidateId });
}

export async function getPendingEdit(chatId) {
  const data = await stateStore().get(`pending-edit:${chatId}`, { type: "json" });
  return data?.candidateId || null;
}

export async function clearPendingEdit(chatId) {
  await stateStore().delete(`pending-edit:${chatId}`);
}
