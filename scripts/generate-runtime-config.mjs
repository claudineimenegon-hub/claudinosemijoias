import { mkdir, writeFile } from 'node:fs/promises';

const supabaseUrl = process.env.SUPABASE_URL;
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error('Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY nas variáveis de ambiente da Netlify.');
}

const config = {
  supabaseUrl,
  supabasePublishableKey,
};

await mkdir(new URL('../assets/js/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../assets/js/runtime-config.js', import.meta.url),
  `window.__CLAUDINO_CONFIG__ = ${JSON.stringify(config)};\n`,
  'utf8'
);

console.log('Configuração pública do Supabase gerada para o frontend.');
