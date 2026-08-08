// netlify/functions/produtos-admin.js
// Executa escrita (insert/update/delete) e upload de fotos no Supabase.
// Só roda no servidor — nunca expõe a service_role key para o navegador.

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Hash SHA-256 da senha padrão do admin (mesmo valor usado no site).
// Pode ser sobrescrito criando a env var ADMIN_HASH no Netlify, se você trocar a senha.
const ADMIN_HASH_PADRAO = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9';
const ADMIN_HASH = process.env.ADMIN_HASH || ADMIN_HASH_PADRAO;

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return { statusCode: 500, body: JSON.stringify({ error: 'SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no Netlify.' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido.' }) };
  }

  const { senha, action, payload } = body;
  if (!senha || sha256(senha) !== ADMIN_HASH) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Senha inválida.' }) };
  }

  const headers = {
    apikey: SERVICE_ROLE,
    Authorization: `Bearer ${SERVICE_ROLE}`,
    'Content-Type': 'application/json',
  };

  try {
    if (action === 'upsertProduto') {
      const tabela = (payload && payload.tabela) === 'atacado' ? 'produtos_atacado' : 'produtos';
      const row = { ...payload.row };
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify(row),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(JSON.stringify(data));
      return { statusCode: 200, body: JSON.stringify({ ok: true, data }) };
    }

    if (action === 'deleteProduto') {
      const tabela = (payload && payload.tabela) === 'atacado' ? 'produtos_atacado' : 'produtos';
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/${tabela}?id=eq.${payload.id}`, {
        method: 'DELETE',
        headers,
      });
      if (!resp.ok) { const t = await resp.text(); throw new Error(t); }
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }

    if (action === 'uploadFoto') {
      // payload: { path, base64, mime }
      const buffer = Buffer.from(payload.base64, 'base64');
      const resp = await fetch(`${SUPABASE_URL}/storage/v1/object/produtos-fotos/${payload.path}`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_ROLE,
          Authorization: `Bearer ${SERVICE_ROLE}`,
          'Content-Type': payload.mime || 'image/jpeg',
          'x-upsert': 'true',
        },
        body: buffer,
      });
      if (!resp.ok) { const t = await resp.text(); throw new Error(t); }
      const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/produtos-fotos/${payload.path}`;
      return { statusCode: 200, body: JSON.stringify({ ok: true, publicUrl }) };
    }

    if (action === 'upsertConfig') {
      // payload: { config: {...} }
      const resp = await fetch(`${SUPABASE_URL}/rest/v1/store_settings`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ key: 'main', config: payload.config, updated_at: new Date().toISOString() }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(JSON.stringify(data));
      return { statusCode: 200, body: JSON.stringify({ ok: true, data }) };
    }

    return { statusCode: 400, body: JSON.stringify({ error: 'Ação desconhecida: ' + action }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
