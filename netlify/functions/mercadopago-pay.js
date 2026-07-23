// netlify/functions/mercadopago-pay.js
// Processa pagamento com cartão via Mercado Pago Payments API
const https = require('https');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON invalido' }) };
  }

  // Access Token: vem do cliente OU da variável de ambiente na Netlify (mais seguro)
  const accessToken = body.accessToken || process.env.MP_ACCESS_TOKEN || '';
  if (!accessToken) {
    return {
      statusCode: 401,
      body: JSON.stringify({ error: 'Access Token do Mercado Pago não configurado.' }),
    };
  }

  // Monta o payload para a API de pagamentos do Mercado Pago
  // O Brick já envia: token, payment_method_id, transaction_amount, installments, payer
  const payload = JSON.stringify({
    transaction_amount: body.transaction_amount,
    token:              body.token,
    description:        body.description || 'Claudino Joias',
    installments:       body.installments || 1,
    payment_method_id:  body.payment_method_id,
    issuer_id:          body.issuer_id,
    payer:              body.payer || {},
    // Gera chave de idempotência para evitar cobranças duplicadas
    external_reference: body.external_reference || Date.now().toString(),
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.mercadopago.com',
      path: '/v1/payments',
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + accessToken,
        'X-Idempotency-Key': body.token + '-' + Date.now(),
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: { 'Content-Type': 'application/json' },
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      resolve({
        statusCode: 500,
        body: JSON.stringify({ error: err.message }),
      });
    });

    req.write(payload);
    req.end();
  });
};
