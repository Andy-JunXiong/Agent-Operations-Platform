import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

await build({
  entryPoints: ['src/worker.ts'], outfile: 'dist/worker.js', bundle: true,
  format: 'esm', target: 'es2023', minify: true, external: ['cloudflare:workers'],
  define: {
    ARCHITECTURE_HTML: JSON.stringify(await readFile('web/architecture.html', 'utf8')),
    ARCHITECTURE_CSS: JSON.stringify(await readFile('web/architecture.css', 'utf8')),
    ARCHITECTURE_JS: JSON.stringify(await readFile('web/architecture.js', 'utf8')),
    DEMO_HTML: JSON.stringify(await readFile('web/index.html', 'utf8')),
    DEMO_CSS: JSON.stringify(await readFile('web/style.css', 'utf8')),
    DEMO_JS: JSON.stringify(await readFile('web/app.js', 'utf8')),
  },
});
