const CACHE_PREFIX = "facturo:cache:";
const QUEUE_KEY = "facturo:offlineQueue";

export function cacheSet(key, data) {
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(data)); } catch {}
}
export function cacheGet(key) {
  try { const raw = localStorage.getItem(CACHE_PREFIX + key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function getQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY)) || []; } catch { return []; }
}
function setQueue(q) { try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} }

export function enqueueAction(type, payload, label) {
  setQueue([...getQueue(), { id: Date.now() + "-" + Math.random(), type, payload, label }]);
}
export function queueLength() { return getQueue().length; }
export function queuedActions() { return getQueue(); }

// handlers: { [type]: async (payload) => ({ error }) }
export async function flushQueue(handlers) {
  const q = getQueue();
  if (!q.length) return { synced: 0, failed: 0 };
  const remaining = [];
  let synced = 0, failed = 0;
  for (const action of q) {
    const handler = handlers[action.type];
    if (!handler) { remaining.push(action); continue; }
    try {
      const { error } = await handler(action.payload);
      error ? (failed++, remaining.push(action)) : synced++;
    } catch { failed++; remaining.push(action); }
  }
  setQueue(remaining);
  return { synced, failed };
}
