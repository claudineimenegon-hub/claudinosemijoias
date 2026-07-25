// netlify/functions/config-set.js
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || '';
  const token  = process.env.NETLIFY_ACCESS_TOKEN || '';

  if (!siteID || !token) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Credenciais não configuradas' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  try {
    const store = getStore({ name: 'site-config', siteID, token });

    // Carrega dados existentes e mescla (só atualiza o que foi enviado)
    const atual = await store.get('store', { type: 'json' }) || {};
    const novo  = { ...atual, ...body };
    await store.setJSON('store', novo);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
