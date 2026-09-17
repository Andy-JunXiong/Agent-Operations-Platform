import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, symlinkSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { prepare, verify, root } from './pilot.mjs';

function fixture(t) {
  const parent = mkdtempSync(join(tmpdir(), 'paw-watch-test-'));
  t.after(() => rmSync(parent, { recursive: true, force: true }));
  const out = join(parent, 'bundle');
  prepare(out);
  return out;
}

test('reproducible material, six pending runs, answers excluded from workload paths', t => {
  const a = fixture(t), b = fixture(t);
  assert.deepEqual(verify(a), { status: 'INTEGRITY_CHECKED', experiment: 'NOT_RUN', files: 21 });
  assert.deepEqual(readFileSync(join(a, 'operator/manifest.json')), readFileSync(join(b, 'operator/manifest.json')));
  const { runs } = JSON.parse(readFileSync(join(a, 'operator/runs.json')));
  assert.equal(runs.length, 6);
  for (const id of ['Q2', 'Q3', 'A1']) {
    const pair = runs.filter(r => r.caseId === id);
    assert.deepEqual(new Set(pair.map(r => r.arm)), new Set(['current', 'sandbox']));
    for (const run of pair) {
      assert.equal(run.status, 'NOT_RUN');
      assert.equal(run.metrics, null);
      assert.ok(run.inputPaths.every(p => !p.startsWith('operator')));
      assert.deepEqual(run.inputPaths, pair[0].inputPaths);
    }
  }
});

test('refuses overwrite and repository output', t => {
  const out = fixture(t);
  assert.throws(() => prepare(out), /EEXIST/);
  assert.throws(() => prepare(join(root, 'pilot-output')), /outside/);
});

test('detects source tampering even when manifest is also changed', t => {
  const out = fixture(t);
  writeFileSync(join(out, 'cases/Q3/evidence/source.txt'), 'Feature R is generally available.');
  writeFileSync(join(out, 'operator/manifest.json'), '{}');
  assert.throws(() => verify(out), /altered/);
});

test('detects missing evidence', t => {
  const out = fixture(t);
  rmSync(join(out, 'cases/Q2/evidence/source.txt'));
  assert.throws(() => verify(out), /Missing/);
});

test('rejects extra material and symlinks', t => {
  const out = fixture(t);
  const extra = join(out, 'extra');
  writeFileSync(extra, 'not an input');
  assert.throws(() => verify(out), /Unexpected/);
  rmSync(extra);
  mkdirSync(extra);
  assert.throws(() => verify(out), /Unexpected directory/);
  rmSync(extra, { recursive: true });
  const source = join(out, 'cases/Q2/evidence/source.txt');
  rmSync(source);
  // Windows file symlinks require an OS privilege; junctions exercise the same
  // no-links boundary without weakening the check or skipping the assertion.
  if (process.platform === 'win32') symlinkSync(join(out, 'cases/Q3/evidence'), source, 'junction');
  else symlinkSync(join(out, 'cases/Q3/evidence/source.txt'), source);
  assert.throws(() => verify(out), /Symlink/);
});
