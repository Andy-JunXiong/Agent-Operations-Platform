import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { inspectFile, checkPublic } from './check-public.mjs';

test('approves only the exact reviewed social cover, rejecting substitution and renamed media', () => {
  const path = 'docs/assets/agent-operations-social.png';
  const image = readFileSync(new URL('../' + path, import.meta.url));
  assert.deepEqual(inspectFile(path, image), []);
  assert.ok(inspectFile('docs/assets/another-cover.png', image).length);
  assert.ok(inspectFile(path, Buffer.concat([image, Buffer.from('extra')])).length);
  const modified = Buffer.from(image); modified[modified.length - 1] ^= 1;
  assert.ok(inspectFile(path, modified).length);
});

test('rejects private artifacts and personal text without echoing their values', () => {
  for (const path of ['.env', '.env.production', 'data/private.sqlite', 'runtime/export.json', 'capture.png', 'backup.zip']) {
    assert.ok(inspectFile(path, Buffer.from('example')).length, path);
  }
  const personal = ['someone', 'gmail.com'].join('@');
  const issues = inspectFile('docs/example.md', Buffer.from(personal));
  assert.ok(issues.some(x => x.rule === 'non-example email'));
  assert.ok(!JSON.stringify(issues).includes(personal));
  assert.equal(inspectFile('fixtures/synthetic/demo.json', Buffer.from('candidate@example.com')).length, 0);
  assert.equal(inspectFile('.env.example', Buffer.from('TOKEN=<placeholder>')).length, 0);
});

test('scans tracked ignored files and new publishable files; missing scanner fails closed', t => {
  const directory = mkdtempSync(join(tmpdir(), 'paw-privacy-test-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  execFileSync('git', ['init', directory], { stdio: 'pipe' });
  writeFileSync(join(directory, '.env'), 'VALUE=placeholder');
  execFileSync('git', ['-C', directory, 'add', '.env']);
  writeFileSync(join(directory, '.gitignore'), '.env\n');
  assert.throws(() => checkPublic(directory, { secrets: false }), /private configuration/);
  execFileSync('git', ['-C', directory, 'rm', '--cached', '.env']);
  writeFileSync(join(directory, 'notes.txt'), ['someone', 'gmail.com'].join('@'));
  assert.throws(() => checkPublic(directory, { secrets: false }), /non-example email/);
  rmSync(join(directory, 'notes.txt'));
  assert.equal(checkPublic(directory, { secrets: false }).secretScan, 'NOT_RUN');
  const previous = process.env.GITLEAKS_BIN;
  process.env.GITLEAKS_BIN = join(directory, 'missing-scanner');
  try { assert.throws(() => checkPublic(directory), /required/); }
  finally { if (previous === undefined) delete process.env.GITLEAKS_BIN; else process.env.GITLEAKS_BIN = previous; }
});
