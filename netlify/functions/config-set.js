// netlify/functions/config-set.js
// Salva as configurações do site no JSONBin.io
const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.JSONBIN_API_KEY || '';
  const binId  = process.env.JSONBIN_BIN_ID  || '';

  if (!apiKey || !binId) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: false, error: 'JSONBIN não configurado nas variáveis de ambiente da Netlify' }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }

  const payload = JSON.stringify(body);

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${binId}`,
      method: 'PUT',
      headers: {
        'Content-Type':  'application/json',
        'X-Master-Key':  apiKey,
        'X-Bin-Versioning': 'false',
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ok: res.statusCode === 200 }),
        });
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 200, body: JSON.stringify({ ok: false, error: err.message }) });
    });

    req.write(payload);
    req.end();
  });
};
