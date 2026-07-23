const { MercadoPagoConfig, Preference } = require('mercadopago');

// O SDK lê automaticamente a variável de ambiente segura
const client = new MercadoPagoConfig({ accessToken: process.env.ACCESS_TOKEN });

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const data = JSON.parse(event.body);
    const preference = new Preference(client);
    
    const response = await preference.create({
      body: {
        items: data.items,
        back_urls: {
          success: "https://seusite.com",
          failure: "https://seusite.com",
          pending: "https://seusite.com"
        },
        auto_return: "approved",
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: response.id, init_point: response.init_point }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
