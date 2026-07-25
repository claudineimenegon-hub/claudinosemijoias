// netlify/functions/config-test.js — remova após confirmar que funciona
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || '';
  const token  = process.env.NETLIFY_ACCESS_TOKEN || '';

  if (!siteID || !token) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: '❌ Variáveis ausentes',
        NETLIFY_SITE_ID:      siteID ? '✅ OK' : '❌ AUSENTE',
        NETLIFY_ACCESS_TOKEN: token  ? '✅ OK' : '❌ AUSENTE',
      }, null, 2),
    };
  }

  try {
    const store = getStore({ name: 'site-config', siteID, token });
    await store.setJSON('config-test', { ok: true, data: new Date().toISOString() });
    const lido = await store.get('config-test', { type: 'json' });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: '✅ Netlify Blobs funcionando!', lido }, null, 2),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: '❌ Erro no Blobs', erro: err.message }, null, 2),
    };
  }
};
