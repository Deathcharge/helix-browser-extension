// SPDX-License-Identifier: MPL-2.0
// Copyright 2026 Samsarix LLC
const test = require('node:test');
const assert = require('node:assert/strict');
const analyzer = require('../extension/analyzer.js');
const { createQueueStore } = require('../extension/queue.js');

function brief(name) {
  return analyzer.analyzePage({ title: name, url: `https://${name}.example/report`, language: 'en', text: 'Clear research needs careful reading and good sources. '.repeat(5) });
}
function fixture(initial = []) {
  let history = structuredClone(initial); let writes = 0; let failNext = false; let tail = Promise.resolve();
  const storage = {
    async get() { return { history: structuredClone(history) }; },
    async set(value) {
      if (failNext) { failNext = false; throw new Error('Storage unavailable'); }
      writes += 1; history = structuredClone(value.history);
    }
  };
  const locks = { request(name, options, callback) {
    assert.equal(name, 'samsarix-page-lens-history-v2'); assert.equal(options.mode, 'exclusive');
    const task = tail.then(() => { options.signal.throwIfAborted(); return callback(); });
    tail = task.catch(() => {}); return task;
  } };
  return {
    first: createQueueStore({ storage, locks, analyzer }), second: createQueueStore({ storage, locks, analyzer }),
    history: () => structuredClone(history), writes: () => writes, failWrite: () => { failNext = true; }
  };
}

test('queue clients serialize overlapping saves and capture values before waiting', async () => {
  const state = fixture(); const first = brief('first'); const second = brief('second');
  const saving = state.first.save(first);
  first.title = 'Changed after clicking Save'; first.review.note = 'Unsaved later edit';
  await Promise.all([saving, state.second.save(second)]);
  assert.deepEqual(state.history().map(item => item.title), ['second', 'first']);
  assert.equal(state.history()[1].review.note, '');
});

test('migration cannot overwrite an overlapping save and normalized reads do not write', async () => {
  const legacy = { ...brief('legacy'), schemaVersion: 1, url: 'https://legacy.example/report?private=token' };
  const state = fixture([legacy]);
  await Promise.all([state.first.read(), state.second.save(brief('new'))]);
  const history = state.history(); assert.equal(history.length, 2);
  assert.equal(history[1].url, 'https://legacy.example/report'); assert.equal(history[1].sourceSignalsAvailable, false);
  const before = state.writes(); await state.first.read(); assert.equal(state.writes(), before);
});

test('import, removal, and clear operate on the latest committed queue', async () => {
  const old = brief('old'); const imported = brief('imported'); const state = fixture([old]);
  const importing = state.first.importBriefs([imported]);
  imported.title = 'Changed while import pending';
  const removing = state.second.remove(old);
  await Promise.all([importing, removing]);
  assert.deepEqual(state.history().map(item => item.title), ['imported']);
  assert.equal((await state.second.remove(old)).removed, false);
  await Promise.all([state.first.save(brief('before-clear')), state.second.clear()]);
  assert.deepEqual(state.history(), []);
  await Promise.all([state.first.clear(), state.second.save(brief('after-clear'))]);
  assert.deepEqual(state.history().map(item => item.title), ['after-clear']);
});

test('queue releases its lock on write failure and never acknowledges a failed save', async () => {
  const retained = brief('retained'); const state = fixture([retained]); state.failWrite();
  await assert.rejects(state.first.save(brief('failed')), /Storage unavailable/);
  assert.deepEqual(state.history(), [retained]);
  await state.second.save(brief('retry'));
  assert.deepEqual(state.history().map(item => item.title), ['retry', 'retained']);
});

test('queue rejects invalid mutation targets and retains the 25-record cap', async () => {
  const state = fixture();
  assert.throws(() => state.first.save(null), /valid brief/);
  assert.throws(() => state.first.remove({}), /valid saved brief/);
  await state.first.importBriefs(Array.from({ length: 30 }, (_, index) => brief(`item-${index}`)));
  assert.equal(state.history().length, 25);
  await state.second.save(brief('newest')); assert.equal(state.history().length, 25);
  assert.equal(state.history()[0].title, 'newest');
});

test('unavailable locks fail closed before any storage operation', async () => {
  const queue = createQueueStore({ analyzer, locks: null, storage: { get() { assert.fail('Unlocked storage access'); } } });
  await assert.rejects(queue.read(), /requires Web Locks/);
  await assert.rejects(queue.save(brief('unsafe')), /requires Web Locks/);
});

test('lock acquisition timeout reports a retryable busy state without writing', async () => {
  const locks = { request(name, { signal }) { return new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(signal.reason), { once: true })); } };
  const queue = createQueueStore({ analyzer, locks, lockTimeoutMs: 5, storage: { get() { assert.fail('Timed-out storage access'); } } });
  await assert.rejects(queue.save(brief('waiting')), /busy in another Page Lens window/);
});
