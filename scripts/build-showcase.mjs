import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Publish only the architecture frontend and its reviewed social cover.
// The reference application's API remains on the separate Worker origin.
export async function buildShowcase(output = resolve(root, 'dist/showcase')) {
  await mkdir(output, { recursive: true });
  for (const [source, name] of [
    ['demo/web/architecture.html', 'index.html'],
    ['demo/web/architecture.css', 'architecture.css'],
    ['demo/web/architecture.js', 'architecture.js'],
    ['docs/assets/agent-operations-social.png', 'agent-operations-social.png'],
  ]) await copyFile(resolve(root, source), resolve(output, name));
  await writeFile(resolve(output, '.nojekyll'), '');
  return output;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildShowcase();
  console.log('Architecture showcase built in dist/showcase');
}
