import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

test('live Worker and SQLite session contract', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'agent-ops-demo-test-'));
  const options = convertV4MiniflareOptions({
    name: 'demo-test', modules: true, scriptPath: 'dist/worker.js', compatibilityDate: '2026-09-17',
    durableObjects: { SESSIONS: { className: 'DemoSession', useSQLite: true } },
  });
  options.resourcePersistencePath = dir;
  let mf = new Miniflare(options);
  const call = async (path, cookie, body, extra = {}) => {
    const response = await mf.dispatchFetch(`https://demo.example.test${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Origin: 'https://demo.example.test', 'Content-Type': 'application/json', 'X-Demo-Request': '1', ...(cookie ? { Cookie: cookie } : {}), ...extra },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = await response.json();
    return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] };
  };
  let cookie, state, admission;
  try {
    await t.test('page is public; state is private and cookie is protected', async () => {
      const page = await mf.dispatchFetch('https://demo.example.test/');
      assert.equal(page.status, 200);
      const html = await page.text();
      assert.match(html, /Agents reason/);
      assert.match(html, /architecture\.js/);
      assert.doesNotMatch(html, /ExampleCorp|src="\/app\.js"/);
      assert.equal(page.headers.get('Set-Cookie'), null);
      const reference = await mf.dispatchFetch('https://demo.example.test/reference/jobs');
      assert.equal(reference.status, 200);
      assert.match(await reference.text(), /ExampleCorp/);
      for (const asset of ['/architecture.js', '/architecture.css']) {
        assert.equal((await mf.dispatchFetch('https://demo.example.test' + asset)).status, 200);
      }
      assert.match(page.headers.get('Content-Security-Policy'), /frame-ancestors 'none'/);
      assert.equal((await call('/api/state')).response.status, 401);
      const start = await call('/api/session', null, {});
      cookie = start.cookie; state = start.data.state;
      assert.match(start.response.headers.get('set-cookie'), /HttpOnly; Secure; SameSite=Strict/);
      assert.equal(state.version, 1);
      assert.ok(state.expiresAt > Date.now() && state.expiresAt <= Date.now() + 3600000);
    });
    await t.test('crawlers can read share metadata and HEAD static pages without creating a session', async () => {
      const headers = { 'User-Agent': 'LinkedInBot/1.0' };
      const page = await mf.dispatchFetch('https://demo.example.test/', { headers });
      const html = await page.text();
      for (const tag of ['og:title', 'og:description', 'og:image', 'og:url']) assert.ok(html.includes(`property="${tag}"`));
      assert.equal(page.headers.get('set-cookie'), null);
      for (const path of ['/', '/reference/jobs', '/reference/jobs/', '/architecture.css', '/architecture.js', '/style.css', '/app.js', '/robots.txt']) {
        const get = await mf.dispatchFetch('https://demo.example.test' + path, { headers });
        const head = await mf.dispatchFetch('https://demo.example.test' + path, { method: 'HEAD', headers });
        assert.equal(head.status, 200, path);
        assert.equal(await head.text(), '');
        assert.equal(head.headers.get('content-type'), get.headers.get('content-type'));
        assert.equal(head.headers.get('set-cookie'), null);
      }
      assert.equal((await mf.dispatchFetch('https://demo.example.test/api/session', { method: 'HEAD', headers })).status, 405);
      assert.equal((await mf.dispatchFetch('https://demo.example.test/unknown', { method: 'HEAD', headers })).status, 404);
    });
    await t.test('origin, schema, size and ordering reject unsupported input', async () => {
      assert.equal((await call('/api/action', cookie, { action: 'observe' }, { Origin: 'https://untrusted.example.test' })).response.status, 403);
      assert.equal((await call('/api/action', cookie, { action: 'observe', text: 'not accepted' })).response.status, 400);
      assert.equal((await call('/api/action', cookie, { action: 'observe', text: 'x'.repeat(2000) })).response.status, 400);
      assert.equal((await call('/api/action', cookie, { action: 'propose' })).data.code, 'EVIDENCE_REQUIRED');
      assert.deepEqual((await call('/api/state', cookie)).data.state, state);
    });
    await t.test('observation and proposal preserve the lifecycle', async () => {
      state = (await call('/api/action', cookie, { action: 'observe' })).data.state;
      assert.equal(state.version, 1); assert.equal(state.lifecycle, 'APPLIED');
      state = (await call('/api/action', cookie, { action: 'propose' })).data.state;
      assert.equal(state.version, 1); assert.equal(state.task, null);
      assert.equal(state.audit.length, 2);
      admission = { action: 'admit', proposalId: state.proposal.id, expectedVersion: 1, confirmed: true, idempotencyKey: crypto.randomUUID() };
    });
    await t.test('missing authority makes no state or audit write', async () => {
      const denied = await call('/api/action', cookie, { ...admission, confirmed: false });
      assert.equal(denied.response.status, 403);
      assert.equal(denied.data.code, 'AUTHORITY_REQUIRED');
      assert.deepEqual((await call('/api/state', cookie)).data.state, state);
    });
    await t.test('concurrent exact commands commit once and return one receipt', async () => {
      const results = await Promise.all(Array.from({ length: 5 }, () => call('/api/action', cookie, admission)));
      assert.equal(results.filter(r => r.data.code === 'ADMIT').length, 1);
      assert.equal(results.filter(r => r.data.code === 'REPLAYED').length, 4);
      assert.equal(new Set(results.map(r => r.data.state.receipt.id)).size, 1);
      state = results[0].data.state;
      assert.equal(state.version, 2); assert.equal(state.lifecycle, 'RECRUITER_CONTACT');
      assert.equal(state.task.taskKind, 'RESPOND_TO_RECRUITER');
      assert.equal(state.audit.length, 3);
    });
    await t.test('stale command, changed payload and revoked confirmation make no writes', async () => {
      const stale = { ...admission, proposalId: state.proposal.alternativeId, idempotencyKey: crypto.randomUUID() };
      assert.equal((await call('/api/action', cookie, stale)).data.code, 'VERSION_CONFLICT');
      assert.equal((await call('/api/action', cookie, { ...admission, expectedVersion: 2 })).data.code, 'IDEMPOTENCY_CONFLICT');
      assert.equal((await call('/api/action', cookie, { ...admission, confirmed: false })).data.code, 'AUTHORITY_REQUIRED');
      assert.deepEqual((await call('/api/state', cookie)).data.state, state);
    });
    await t.test('a second visitor cannot affect the first workspace', async () => {
      const second = await call('/api/session', null, {});
      assert.notEqual(second.cookie, cookie);
      assert.equal(second.data.state.version, 1);
      assert.equal((await call('/api/action', second.cookie, admission)).data.code, 'PROPOSAL_REQUIRED');
      await call('/api/action', second.cookie, { action: 'reset' });
      assert.deepEqual((await call('/api/state', cookie)).data.state, state);
    });
    await t.test('state and idempotency receipt survive a runtime restart', async () => {
      await mf.dispose();
      mf = new Miniflare(options);
      assert.deepEqual((await call('/api/state', cookie)).data.state, state);
      assert.equal((await call('/api/action', cookie, admission)).data.code, 'REPLAYED');
    });
    await t.test('reset starts a clean scenario without extending retention', async () => {
      const reset = await call('/api/action', cookie, { action: 'reset' });
      assert.equal(reset.data.state.expiresAt, state.expiresAt);
      assert.equal(reset.data.state.version, 1);
      assert.equal(reset.data.state.receipt, null);
      assert.equal((await call('/api/action', cookie, admission)).data.code, 'PROPOSAL_REQUIRED');
    });
  } finally {
    await mf.dispose();
    await rm(dir, { recursive: true, force: true });
  }
});
