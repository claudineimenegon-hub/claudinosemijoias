// netlify/functions/frete.js
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

  const token = body.token || process.env.MELHOR_ENVIO_TOKEN || '';
  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Unauthenticated. Token nao configurado na funcao nem na variavel de ambiente MELHOR_ENVIO_TOKEN.' }),
    };
  }

  // Aceita tanto 'production'/'producao' para produção, qualquer outro = sandbox
  const ambiente = body.ambiente || 'sandbox';
  const ehProducao = ambiente === 'production' || ambiente === 'producao';
  const host = ehProducao
    ? 'melhorenvio.com.br'
    : 'sandbox.melhorenvio.com.br';

  const payload = JSON.stringify({
    from:     body.from    || {},
    to:       body.to      || {},
    package:  body.package || {},
    services: body.services || '1,2',
    options:  body.options  || {},
  });

  return new Promise((resolve) => {
    const options = {
      hostname: host,
      path: '/api/v2/me/shipment/calculate',
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Authorization': 'Bearer ' + token,
        'User-Agent':    'ClaudinoJoias/1.0 (contato@claudinojoias.com.br)',
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
