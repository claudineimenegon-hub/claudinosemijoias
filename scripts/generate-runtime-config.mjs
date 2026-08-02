import { mkdir, writeFile } from 'node:fs/promises';

const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';

const missing = [];
if (!supabaseUrl) missing.push('SUPABASE_URL');
if (!supabasePublishableKey) missing.push('SUPABASE_PUBLISHABLE_KEY');

const config = {
  supabaseUrl,
  supabasePublishableKey,
  configured: missing.length === 0,
  missing,
};

await mkdir(new URL('../assets/js/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../assets/js/runtime-config.js', import.meta.url),
  `window.__CLAUDINO_CONFIG__ = ${JSON.stringify(config)};\n`,
  'utf8'
);

if (missing.length > 0) {
  console.warn(`Supabase ainda não configurado no contexto deste deploy. Variáveis ausentes: ${missing.join(', ')}`);
} else {
  console.log('Configuração pública do Supabase gerada para o frontend.');
}
