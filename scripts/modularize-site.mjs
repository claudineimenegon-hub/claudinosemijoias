import { mkdir, readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../index.html', import.meta.url);
let html = await readFile(indexPath, 'utf8');

const styleMatch = html.match(/<style>\s*([\s\S]*?)\s*<\/style>/i);
if (!styleMatch) {
  throw new Error('Bloco principal de estilos não encontrado.');
}

const css = styleMatch[1].trim();
html = html.replace(styleMatch[0], '<link rel="stylesheet" href="/assets/css/styles.css">');

const scriptPattern = /^<script>\s*\r?\n([\s\S]*?)^<\/script>\s*$/gmi;
const scriptMatches = [...html.matchAll(scriptPattern)];

if (scriptMatches.length < 2) {
  throw new Error(`Esperados ao menos 2 blocos principais de JavaScript; encontrados ${scriptMatches.length}.`);
}

const selectedScripts = scriptMatches.slice(0, 2);
const extractedScripts = selectedScripts.map((match) => match[1].trim());
let replacementIndex = 0;

html = html.replace(scriptPattern, (fullMatch) => {
  if (replacementIndex >= 2) return fullMatch;
  const fileName = replacementIndex === 0 ? 'app.js' : 'ui.js';
  replacementIndex += 1;
  return `<script src="/assets/js/${fileName}" defer></script>`;
});

await mkdir(new URL('../assets/css/', import.meta.url), { recursive: true });
await mkdir(new URL('../assets/js/', import.meta.url), { recursive: true });
await writeFile(new URL('../assets/css/styles.css', import.meta.url), `${css}\n`, 'utf8');
await writeFile(new URL('../assets/js/app.js', import.meta.url), `${extractedScripts[0]}\n`, 'utf8');
await writeFile(new URL('../assets/js/ui.js', import.meta.url), `${extractedScripts[1]}\n`, 'utf8');
await writeFile(indexPath, html, 'utf8');

for (const asset of [
  'href="/assets/css/styles.css"',
  'src="/assets/js/app.js"',
  'src="/assets/js/ui.js"'
]) {
  if (!html.includes(asset)) {
    throw new Error(`Referência de ativo ausente após modularização: ${asset}`);
  }
}

console.log('Site modularizado: CSS e JavaScript principais foram extraídos para /assets.');
