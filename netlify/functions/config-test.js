// netlify/functions/config-test.js
// Diagnóstico — remova após confirmar que funciona
const { getStore } = require('@netlify/blobs');

exports.handler = async (event, context) => {
  try {
    const store = getStore({ name: 'site-config', context });

    // Tenta salvar um valor de teste
    await store.setJSON('config-test', { teste: true, data: new Date().toISOString() });

    // Tenta ler de volta
    const lido = await store.get('config-test', { type: 'json' });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: '✅ Netlify Blobs funcionando!',
        gravou: true,
        leu: lido,
      }, null, 2),
    };
  } catch (err) {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: '❌ Erro',
        erro: err.message,
      }, null, 2),
    };
  }
};
