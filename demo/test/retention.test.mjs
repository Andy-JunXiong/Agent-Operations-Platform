import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('expiry rejects access and cleanup preserves only unexpired sessions', async () => {
  // Test-only subclass: none of these inspection methods ship in the bundle.
  const harness = `
    import { DemoSession } from './worker.js';
    export class RetentionTestSession extends DemoSession {
      expireForTest() {
        const state = this.ctx.storage.kv.get('state');
        state.expiresAt = Date.now() - 1000;
        this.ctx.storage.kv.put('state', state);
      }
      async cleanupForTest() { await super.alarm(); }
      async inspectForTest() {
        return { stored: !!this.ctx.storage.kv.get('state'), alarm: await this.ctx.storage.getAlarm() };
      }
    }
    export default { async fetch(request, env) {
      const session = env.SESSIONS.getByName('retention-test');
      switch (new URL(request.url).pathname) {
        case '/start': return Response.json(await session.start());
        case '/read': return Response.json(await session.read());
        case '/reset': return Response.json(await session.run({ action: 'reset' }));
        case '/expire': await session.expireForTest(); break;
        case '/cleanup': await session.cleanupForTest(); break;
      }
      return Response.json(await session.inspectForTest());
    }};
  `;
  const mf = new Miniflare(convertV4MiniflareOptions({
    name: 'retention-test', compatibilityDate: '2026-09-17', modulesRoot: process.cwd(),
    modules: [
      { type: 'ESModule', path: resolve('harness.js'), contents: harness },
      { type: 'ESModule', path: resolve('worker.js'), contents: await readFile('dist/worker.js', 'utf8') },
    ],
    durableObjects: { SESSIONS: { className: 'RetentionTestSession', useSQLite: true } },
  }));
  const call = async path => (await mf.dispatchFetch(`https://demo.example.test${path}`)).json();
  try {
    const start = await call('/start');
    const freshCleanup = await call('/cleanup');
    assert.equal(freshCleanup.stored, true);
    assert.equal(freshCleanup.alarm, start.state.expiresAt);
    await call('/expire');
    assert.equal((await call('/read')).code, 'SESSION_EXPIRED');
    assert.equal((await call('/reset')).code, 'SESSION_EXPIRED');
    assert.deepEqual(await call('/cleanup'), { stored: false, alarm: null });
    assert.equal((await call('/start')).state.version, 1);
  } finally { await mf.dispose(); }
});
