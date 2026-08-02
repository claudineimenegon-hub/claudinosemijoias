import { mkdir, readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../index.html', import.meta.url);
let html = await readFile(indexPath, 'utf8');

const firstStyleStart = html.indexOf('<style>');
const firstStyleEnd = html.indexOf('</style>', firstStyleStart);

if (firstStyleStart === -1 || firstStyleEnd === -1) {
  throw new Error('Bloco principal de estilos não encontrado.');
}

const css = html.slice(firstStyleStart + '<style>'.length, firstStyleEnd).trim();
html = `${html.slice(0, firstStyleStart)}<link rel="stylesheet" href="/assets/css/styles.css">${html.slice(firstStyleEnd + '</style>'.length)}`;

const scriptMarker = '\n<script>\n';
const closeMarker = '\n</script>';
const extractedScripts = [];

for (let i = 0; i < 2; i += 1) {
  const start = html.indexOf(scriptMarker);
  if (start === -1) throw new Error(`Bloco principal de JavaScript ${i + 1} não encontrado.`);

  const end = html.indexOf(closeMarker, start);
  if (end === -1) throw new Error(`Fechamento do JavaScript ${i + 1} não encontrado.`);

  extractedScripts.push(html.slice(start + scriptMarker.length, end).trim());
  const fileName = i === 0 ? 'app.js' : 'ui.js';
  html = `${html.slice(0, start)}\n<script src="/assets/js/${fileName}" defer></script>${html.slice(end + closeMarker.length)}`;
}

await mkdir(new URL('../assets/css/', import.meta.url), { recursive: true });
await mkdir(new URL('../assets/js/', import.meta.url), { recursive: true });
await writeFile(new URL('../assets/css/styles.css', import.meta.url), `${css}\n`, 'utf8');
await writeFile(new URL('../assets/js/app.js', import.meta.url), `${extractedScripts[0]}\n`, 'utf8');
await writeFile(new URL('../assets/js/ui.js', import.meta.url), `${extractedScripts[1]}\n`, 'utf8');
await writeFile(indexPath, html, 'utf8');

if (html.includes('<style>') && !html.includes('window.print')) {
  console.warn('Ainda existem estilos internos fora dos templates de impressão.');
}

console.log('Site modularizado: CSS e JavaScript principais foram extraídos para /assets.');
