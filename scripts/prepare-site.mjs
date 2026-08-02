import { readFile, writeFile } from 'node:fs/promises';

const indexPath = new URL('../index.html', import.meta.url);
let html = await readFile(indexPath, 'utf8');

const currentHead = `<head>f
<meta charset="UTF-8">
<meta name="description" content="Claudino SemiJoias — Semijoias banhadas a ouro 18k. Colares, anéis, pulseiras e brincos com qualidade e elegância. Compre online com entrega para todo o Brasil.">
<meta name="keywords" content="semijoias, joias banhadas a ouro, colares, anéis, pulseiras, brincos, semijoias online, Claudino Joias">
<meta name="robots" content="index, follow">
<meta property="og:title" content="Claudino SemiJoias — Semijoias Banhadas a Ouro">
<meta property="og:description" content="Semijoias banhadas a ouro 18k com qualidade e elegância. Entrega para todo o Brasil.">
<meta property="og:url" content="https://www.claudinosemijoias.com.br">
<meta property="og:type" content="website">
<link rel="canonical" href="https://www.claudinosemijoias.com.br">
<meta name=google-site-verification=A-_ZUNGRlOR12QyqGAC7iZ4Q_mb6NAU3qR2bLYJrPXg
<title>Claudino Semi Joias – Semi Joias de Luxo</title>`;

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

if (html.includes(currentHead)) {
  html = html.replace(currentHead, correctedHead);
} else if (!html.includes('name="viewport"') || html.includes('<head>f')) {
  throw new Error('O cabeçalho esperado não foi encontrado; build interrompido para evitar publicação incorreta.');
}

for (const required of ['name="viewport"', 'name="google-site-verification"', 'rel="canonical"', 'rel="manifest"']) {
  if (!html.includes(required)) throw new Error(`Metadado obrigatório ausente: ${required}`);
}

await writeFile(indexPath, html, 'utf8');
console.log('index.html preparado com SEO e metadados válidos.');
