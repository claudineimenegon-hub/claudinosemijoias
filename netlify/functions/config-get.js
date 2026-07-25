// netlify/functions/config-get.js
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || '';
  const token  = process.env.NETLIFY_ACCESS_TOKEN || '';

  if (!siteID || !token) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: 'Credenciais não configuradas' }),
    };
  }

  try {
    const store = getStore({ name: 'site-config', siteID, token });
    const data  = await store.get('store', { type: 'json' });
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, data: data || {} }),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
