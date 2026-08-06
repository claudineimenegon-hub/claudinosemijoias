// netlify/functions/etiqueta.js
// Integração com Melhor Envio para geração de etiquetas
const https = require('https');

function meRequest(path, method, body, token, ambiente) {
  const host = ambiente === 'producao'
    ? 'melhorenvio.com.br'
    : 'sandbox.melhorenvio.com.br';
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      path,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Authorization': `Bearer ${token}`,
        'User-Agent':    'ClaudinoJoias/1.0 (contato@claudinojoias.com.br)',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if(payload) req.write(payload);
    req.end();
  });
}

exports.handler = async (event) => {
  if(event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) }; }

  const token    = body.token    || process.env.MELHOR_ENVIO_TOKEN || '';
  const ambiente = body.ambiente || 'producao';
  const acao     = body.acao;

  if(!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Token Melhor Envio não configurado.' }) };
  }

  // ── RESERVAR: adiciona ao carrinho ME sem debitar saldo ───────────────────
  if(acao === 'reservar') {
    const { pedido } = body;
    if(!pedido) return { statusCode: 400, body: JSON.stringify({ error: 'Pedido não informado.' }) };
    const end = pedido.endereco || {};
    const payload = {
      service: pedido.servicoME,
      agency:  null,
      from:    null,
      to: {
        name:        end.nomeCliente  || 'Cliente',
        phone:       (end.telCliente  || '').replace(/\D/g,''),
        email:       end.emailCliente || '',
        document:    (end.cpfCliente  || '').replace(/\D/g,''),
        address:     end.rua          || '',
        complement:  end.complemento  || '',
        number:      end.numero       || 's/n',
        district:    end.bairro       || '',
        city:        end.cidade       || '',
        state_abbr:  end.estado       || '',
        postal_code: (end.cep         || '').replace(/\D/g,''),
        country_id:  'BR',
      },
      products: (pedido.itens || []).map(i => ({
        name:          i.nome,
        quantity:      i.qty,
        unitary_value: i.preco,
      })),
      volumes: [{
        height: body.altura      || 5,
        width:  body.largura     || 11,
        length: body.comprimento || 16,
        weight: body.peso        || 0.3,
      }],
      options: {
        insurance_value: pedido.subtotal || 0,
        receipt:         false,
        own_hand:        false,
        reverse:         false,
        non_commercial:  false,
        invoice:         { key: '' },
        tags: [{ tag: `PEDIDO-${pedido.id}`, url: null }],
      },
    };
    const resp = await meRequest('/api/v2/me/cart', 'POST', payload, token, ambiente);
    if(resp.status === 201 || resp.status === 200) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, orderId: resp.body.id }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: resp.body?.message || 'Erro ao reservar', detalhe: resp.body }) };
  }

  // ── COMPRAR: faz checkout e debita saldo ──────────────────────────────────
  if(acao === 'comprar') {
    const { orderIds } = body;
    if(!orderIds?.length) return { statusCode: 400, body: JSON.stringify({ error: 'orderIds não informado.' }) };
    const resp = await meRequest('/api/v2/me/shipment/checkout', 'POST', { orders: orderIds }, token, ambiente);
    if(resp.status === 200 || resp.status === 201) {
      // Buscar código de rastreio
      const rastreio = resp.body?.purchases
        ? Object.values(resp.body.purchases)[0]?.orders?.[orderIds[0]]?.tracking || ''
        : '';
      return { statusCode: 200, body: JSON.stringify({ ok: true, rastreio, data: resp.body }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: resp.body?.message || 'Erro ao comprar etiqueta', detalhe: resp.body }) };
  }

  // ── IMPRIMIR: retorna link da etiqueta ────────────────────────────────────
  if(acao === 'imprimir') {
    const { orderIds } = body;
    if(!orderIds?.length) return { statusCode: 400, body: JSON.stringify({ error: 'orderIds não informado.' }) };
    const resp = await meRequest('/api/v2/me/shipment/print', 'POST', { mode: 'public', orders: orderIds }, token, ambiente);
    if(resp.status === 200) {
      return { statusCode: 200, body: JSON.stringify({ ok: true, url: resp.body.url || resp.body }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: false, error: resp.body?.message || 'Erro ao obter link', detalhe: resp.body }) };
  }

  return { statusCode: 400, body: JSON.stringify({ error: `Ação desconhecida: ${acao}` }) };
};
