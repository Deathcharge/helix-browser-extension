// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SamsarixQueue = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const LOCK_NAME = 'samsarix-page-lens-history-v2';
  function createQueueStore({ storage, locks, analyzer, lockTimeoutMs = 5000 }) {
    async function transaction(transform) {
      if (!locks?.request) throw new Error('Safe queue access requires Web Locks. Update Chrome and reopen Page Lens.');
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), lockTimeoutMs);
      try {
        return await locks.request(LOCK_NAME, { mode: 'exclusive', signal: controller.signal }, async () => {
          // The timeout bounds waiting, not an in-flight Chrome storage write.
          clearTimeout(timer);
          const stored = await storage.get({ history: [] });
          const original = Array.isArray(stored.history) ? stored.history : [];
          const history = analyzer.createQueueBackup(original).briefs;
          const result = transform(history);
          if (JSON.stringify(result.history) !== JSON.stringify(original)) await storage.set({ history: result.history });
          return result;
        });
      } catch (error) {
        if (error.name === 'AbortError') throw new Error('The queue is busy in another Page Lens window. Try again.');
        throw error;
      } finally { clearTimeout(timer); }
    }
    return {
      read: async () => (await transaction(history => ({ history }))).history,
      save: brief => {
        const snapshot = analyzer.migrateStoredResult(brief);
        if (!snapshot) throw new Error('Choose a valid brief before saving.');
        return transaction(history => ({ history: analyzer.mergeQueueHistory([snapshot], history) }));
      },
      importBriefs: briefs => {
        const snapshots = analyzer.createQueueBackup(briefs).briefs;
        return transaction(history => ({ history: analyzer.mergeQueueHistory(snapshots, history) }));
      },
      remove: brief => {
        const snapshot = analyzer.migrateStoredResult(brief);
        if (!snapshot) throw new Error('Choose a valid saved brief to remove.');
        return transaction(history => {
          const next = analyzer.removeQueueBrief(history, snapshot);
          return { history: next, removed: next.length < history.length };
        });
      },
      clear: () => transaction(() => ({ history: [] }))
    };
  }
  return { createQueueStore };
});
