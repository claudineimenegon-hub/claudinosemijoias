// netlify/functions/mercadopago-pay.js
const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const accessToken = body.accessToken || process.env.MP_ACCESS_TOKEN || '';
  if (!accessToken) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Access Token não configurado.' }) };
  }

  const payload = JSON.stringify({
    transaction_amount: body.transaction_amount,
    token:              body.token,
    description:        body.description || 'Claudino Joias',
    installments:       body.installments || 1,
    payment_method_id:  body.payment_method_id,
    issuer_id:          body.issuer_id,
    external_reference: body.external_reference || String(Date.now()), // ← ID do pedido
    payer:              body.payer || {},
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.mercadopago.com',
      path: '/v1/payments',
      method: 'POST',
      headers: {
        'Content-Type':      'application/json',
        'Authorization':     'Bearer ' + accessToken,
        'X-Idempotency-Key': (body.external_reference || '') + '-' + Date.now(),
        'Content-Length':    Buffer.byteLength(payload),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: { 'Content-Type': 'application/json' },
          body: data,
        });
      });
    });
    req.on('error', err => {
      resolve({ statusCode: 500, body: JSON.stringify({ error: err.message }) });
    });
    req.write(payload);
    req.end();
  });
};
