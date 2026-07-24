// netlify/functions/config-get.js
// Carrega as configurações do site salvas no JSONBin.io
const https = require('https');

exports.handler = async () => {
  const apiKey = process.env.JSONBIN_API_KEY || '';
  const binId  = process.env.JSONBIN_BIN_ID  || '';

  if (!apiKey || !binId) {
    return {
      statusCode: 200,
      body: JSON.stringify({ ok: false, error: 'JSONBIN não configurado' }),
    };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${binId}/latest`,
      method: 'GET',
      headers: {
        'X-Master-Key': apiKey,
        'X-Bin-Meta':   'false',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ok: true, config: parsed }),
          });
        } catch {
          resolve({ statusCode: 200, body: JSON.stringify({ ok: false, error: 'Resposta inválida' }) });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ statusCode: 200, body: JSON.stringify({ ok: false, error: err.message }) });
    });

    req.end();
  });
};
