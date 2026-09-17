import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, lstatSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ignoredEmailExamples = new Set(['example.com', 'example.test', 'example.invalid']);
// These exact files deliberately exercise trusted sender / URL credential rejection.
const providerEmailTests = new Set(['tests/integration/job-library.test.ts', 'tests/integration/skill-library.test.ts']);

export function inspectFile(path, bytes) {
  // Only this visually reviewed raster of our original public SVG is approved.
  // A renamed, modified or replacement image must undergo a new review.
  if (path === 'docs/assets/agent-operations-social.png'
    && createHash('sha256').update(bytes).digest('hex') === 'dbdbd44a5bbc333c44a27f4dee00a073d9b646fa2f299cc87111bfc8c89a7b5e') return [];
  const issues = [];
  const add = rule => issues.push({ path, rule }); // Never print matched secrets or personal text.
  if (/(^|\/)(?:\.env(?:\..*)?|credentials[^/]*|id_rsa|id_ed25519)$/i.test(path) && !path.endsWith('.example')) add('private configuration');
  if (/\.(?:db|sqlite\d?|db-wal|db-shm|sqlite-wal|sqlite-shm|log|pem|key|p12|pfx|zip|pdf|docx|png|jpe?g|webp|gif|bak|backup)(?:$|\.)/i.test(path)) add('private or unreviewed binary artifact');
  if (/(^|\/)(?:private|runtime|backups?|exports?|screenshots?|local-evidence|production-copy)(\/|$)/i.test(path)) add('private artifact directory');
  if (bytes.includes(0)) add('unreviewed binary content');
  const text = bytes.toString('utf8');
  for (const match of text.matchAll(/[\w.+-]+@([\w.-]+\.[A-Za-z]{2,})/g)) {
    const domain = match[1].toLowerCase();
    if (ignoredEmailExamples.has(domain) || domain.endsWith('.example.test')) continue;
    if (providerEmailTests.has(path) && ['www.seek.com.au', 'seek.com.au', 'github.com'].includes(domain)) continue;
    add('non-example email'); break;
  }
  if (/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:ghp_|github_pat_|sk-proj-|GOCSPX-)[A-Za-z0-9_-]{15,}/.test(text)) add('credential signature');
  if (/\b(?:C:|D:)[\\/]Users[\\/](?!<|%|\$)[^\s\\/]+/i.test(text)) add('personal home path');
  if (path.endsWith('.md') || path.endsWith('.txt')) {
    if (/\b(?:RSM|Nuix|One51|Coates|Accenture)\b/.test(text)) add('real dogfood entity');
    if (/\b(?:Google candidate|Google screening)\b/i.test(text)) add('personal candidate evidence');
    if (/https?:\/\/(?:drive\.google\.com\/file\/d|docs\.google\.com\/document\/d)\/(?!FILE_ID|EXAMPLE|synthetic)[A-Za-z0-9_-]{15,}/.test(text)) add('private document identifier');
  }
  return issues;
}

export function repositoryFiles(directory) {
  const git = args => execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8' });
  if (resolve(git(['rev-parse', '--show-toplevel']).trim()) !== resolve(directory)) throw new Error('Expected a Git repository at the project root');
  return [...new Set(git(['ls-files', '--cached', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean))].sort();
}

export function checkPublic(directory = root, { secrets = true } = {}) {
  const files = repositoryFiles(directory);
  const issues = [];
  const inspected = [];
  for (const path of files) {
    const full = resolve(directory, path);
    let stat;
    try { stat = lstatSync(full); } catch { issues.push({ path, rule: 'tracked path missing; stage its removal' }); continue; }
    if (!stat.isFile() || stat.isSymbolicLink()) { issues.push({ path, rule: 'non-regular file' }); continue; }
    const bytes = readFileSync(full);
    issues.push(...inspectFile(path, bytes));
    inspected.push([path, bytes]);
  }
  if (issues.length) throw new Error(JSON.stringify(issues, null, 2));
  if (secrets) {
    const scanner = process.env.GITLEAKS_BIN || 'gitleaks';
    let version;
    try { version = execFileSync(scanner, ['version'], { encoding: 'utf8' }).trim(); }
    catch { throw new Error('Gitleaks 8.30.1 is required. Install it or set GITLEAKS_BIN; scan was not passed.'); }
    if (version !== '8.30.1') throw new Error('Expected Gitleaks 8.30.1 for reproducible checks');
    const temporary = mkdtempSync(join(tmpdir(), 'paw-public-scan-'));
    try {
      for (const [path, bytes] of inspected) {
        const target = join(temporary, path); mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, bytes);
      }
      execFileSync(scanner, ['dir', temporary, '--config', join(directory, '.gitleaks.toml'), '--redact', '--no-banner'], { stdio: 'pipe' });
    } catch { throw new Error('Secret scan failed. Run Gitleaks locally with --redact to review findings. No public-safety pass.'); }
    finally { rmSync(temporary, { recursive: true, force: true }); }
  }
  return { status: 'PASS', files: files.length, secretScan: secrets ? 'PASS' : 'NOT_RUN' };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(checkPublic())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
