import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildShowcase } from './build-showcase.mjs';

test('Pages artifact has crawlable metadata, base-path-safe assets and a working reference destination', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'aop-showcase-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  await buildShowcase(dir);
  assert.deepEqual((await readdir(dir)).sort(), ['.nojekyll', 'agent-operations-social.png', 'architecture.css', 'architecture.js', 'index.html']);
  const html = await readFile(join(dir, 'index.html'), 'utf8');
  const base = 'https://andy-junxiong.github.io/Agent-Operations-Platform/';
  const tags = Object.fromEntries([...html.matchAll(/<meta property="([^"]+)" content="([^"]+)"/g)].map(m => [m[1], m[2]]));
  for (const tag of ['og:title', 'og:description', 'og:image', 'og:url']) assert.ok(tags[tag], tag);
  assert.equal(tags['og:url'], base);
  assert.equal(tags['og:image'], base + 'agent-operations-social.png');
  assert.ok(html.includes(`rel="canonical" href="${base}"`));
  assert.match(html, /href="https:\/\/agent-operations-demo\.agentops-portfolio\.workers\.dev\/reference\/jobs"/);
  assert.doesNotMatch(html, /(?:href|src)="\//);
  for (const [, link] of html.matchAll(/(?:href|src)="(\.\/[^"#]*)"/g)) {
    const url = new URL(link, base);
    assert.equal(url.origin, new URL(base).origin);
    assert.ok(url.href.startsWith(base));
    await readFile(join(dir, link === './' ? 'index.html' : link.slice(2)));
  }
  const png = await readFile(join(dir, 'agent-operations-social.png'));
  assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  assert.ok(png.length < 5 * 1024 * 1024);
});
