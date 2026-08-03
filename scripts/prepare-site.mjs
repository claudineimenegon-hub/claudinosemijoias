import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../index.html', import.meta.url);
let html = await readFile(indexPath, 'utf8');

const correctedHead = `<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="Claudino Semijoias — semijoias banhadas a ouro 18k. Colares, anéis, pulseiras e brincos com qualidade, elegância e entrega para todo o Brasil.">
<meta name="keywords" content="semijoias, joias banhadas a ouro, colares, anéis, pulseiras, brincos, semijoias online, Claudino Semijoias">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta name="theme-color" content="#1A1610">
<meta name="google-site-verification" content="A-_ZUNGRlOR12QyqGAC7iZ4Q_mb6NAU3qR2bLYJrPXg">
<link rel="canonical" href="https://www.claudinosemijoias.com.br/">
<link rel="manifest" href="/manifest.webmanifest">
<link rel="stylesheet" href="/assets/css/mobile.css">
<link rel="stylesheet" href="/assets/css/category-cards-mobile.css">
<link rel="stylesheet" href="/assets/css/social-footer-mobile.css">
<script src="/assets/js/runtime-config.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="/assets/js/supabase-data.js"></script>
<script src="/assets/js/disable-legacy-admin.js"></script>
<script src="/assets/js/supabase-admin-entry.js"></script>
<script defer src="/assets/js/category-cards-mobile.js"></script>
<script defer src="/assets/js/social-footer-mobile.js"></script>
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Claudino Semijoias">
<meta property="og:title" content="Claudino Semijoias — Semijoias Banhadas a Ouro 18k">
<meta property="og:description" content="Semijoias banhadas a ouro 18k com qualidade e elegância. Entrega para todo o Brasil.">
<meta property="og:url" content="https://www.claudinosemijoias.com.br/">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Claudino Semijoias — Semijoias Banhadas a Ouro 18k">
<meta name="twitter:description" content="Semijoias banhadas a ouro 18k com qualidade e elegância. Entrega para todo o Brasil.">
<title>Claudino Semijoias | Semijoias Banhadas a Ouro 18k</title>`;

const headPattern = /<head>f?\s*[\s\S]*?<title>[\s\S]*?<\/title>/i;
if (!headPattern.test(html)) throw new Error('Cabeçalho HTML não encontrado.');
html = html.replace(headPattern, correctedHead);

for (const required of [
  'name="viewport"',
  'href="/assets/css/mobile.css"',
  'href="/assets/css/category-cards-mobile.css"',
  'href="/assets/css/social-footer-mobile.css"',
  'src="/assets/js/runtime-config.js"',
  'src="/assets/js/supabase-data.js"',
  'src="/assets/js/disable-legacy-admin.js"',
  'src="/assets/js/supabase-admin-entry.js"',
  'src="/assets/js/category-cards-mobile.js"',
  'src="/assets/js/social-footer-mobile.js"'
]) {
  if (!html.includes(required)) throw new Error(`Recurso obrigatório ausente: ${required}`);
}

await writeFile(indexPath, html, 'utf8');
console.log('index.html preparado com vitrine, painel original, cards de categorias e rodapé social no mobile.');
