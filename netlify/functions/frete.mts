// Proxy para a API do Melhor Envio (cálculo de frete).
//
// O front-end (index.html) envia o token do lojista e os dados do pacote para
// este endpoint, que repassa a requisição ao Melhor Envio. A chamada precisa
// passar por aqui porque a API do Melhor Envio não libera CORS para o browser
// e o cabeçalho Authorization não pode ser enviado diretamente de páginas
// hospedadas em outro domínio.
//
// Disponível em: /.netlify/functions/frete

const ENDPOINTS = {
  sandbox:  'https://sandbox.melhorenvio.com.br/api/v2/me/shipment/calculate',
  producao: 'https://www.melhorenvio.com.br/api/v2/me/shipment/calculate',
};

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });

export default async (req: Request) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  if (req.method !== 'POST') {
    return json({ message: 'Método não permitido. Use POST.' }, 405);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ message: 'Corpo da requisição inválido (JSON esperado).' }, 400);
  }

  const { token, ambiente, from, to, package: pacote, services, options } = payload || {};

  if (!token) {
    return json({ message: 'Token do Melhor Envio ausente.' }, 401);
  }
  if (!from?.postal_code || !to?.postal_code) {
    return json({ message: 'CEP de origem e destino são obrigatórios.' }, 422);
  }

  const endpoint = ENDPOINTS[ambiente === 'producao' ? 'producao' : 'sandbox'];

  // Monta o corpo esperado pelo Melhor Envio, ignorando campos de controle
  // (token/ambiente) que não fazem parte da API.
  const meBody = {
    from:     { postal_code: String(from.postal_code).replace(/\D/g, '') },
    to:       { postal_code: String(to.postal_code).replace(/\D/g, '') },
    package:  pacote,
    services,
    options,
  };

  try {
    const meResp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Accept':        'application/json',
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
        // O Melhor Envio exige um User-Agent identificável com contato técnico.
        'User-Agent':    'Claudino Semijoias (contato@claudinosemijoias.com.br)',
      },
      body: JSON.stringify(meBody),
    });

    // Repassa a resposta do Melhor Envio preservando o status (o front-end
    // trata 401/422 e o corpo com { message, errors } especificamente).
    let data: unknown;
    const raw = await meResp.text();
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { message: raw || 'Resposta inesperada do Melhor Envio.' };
    }

    return json(data, meResp.status);
  } catch (err: any) {
    return json(
      { message: `Falha ao contatar o Melhor Envio: ${err?.message || 'erro desconhecido'}` },
      502,
    );
  }
};
