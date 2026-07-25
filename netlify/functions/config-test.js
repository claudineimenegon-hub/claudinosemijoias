// netlify/functions/config-test.js
// Diagnóstico da conexão com JSONBin — remova após confirmar que funciona
const https = require('https');

exports.handler = async () => {
  const apiKey = process.env.JSONBIN_API_KEY || '';
  const binId  = process.env.JSONBIN_BIN_ID  || '';

  const resultado = {
    variaveis: {
      JSONBIN_API_KEY: apiKey ? '✅ Configurada (' + apiKey.substring(0,8) + '...)' : '❌ AUSENTE — não definida na Netlify',
      JSONBIN_BIN_ID:  binId  ? '✅ Configurada (' + binId  + ')' : '❌ AUSENTE — não definida na Netlify',
    },
    conexao: null,
    resposta_jsonbin: null,
  };

  if (!apiKey || !binId) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultado, null, 2),
    };
  }

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.jsonbin.io',
      path: `/v3/b/${binId}/latest`,
      method: 'GET',
      headers: { 'X-Master-Key': apiKey, 'X-Bin-Meta': 'false' },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resultado.conexao = res.statusCode === 200
          ? '✅ JSONBin respondeu OK'
          : '❌ JSONBin retornou status ' + res.statusCode;
        try {
          resultado.resposta_jsonbin = JSON.parse(data);
        } catch {
          resultado.resposta_jsonbin = data;
        }
        resolve({
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(resultado, null, 2),
        });
      });
    });

    req.on('error', (err) => {
      resultado.conexao = '❌ Erro de rede: ' + err.message;
      resolve({
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultado, null, 2),
      });
    });

    req.end();
  });
};
