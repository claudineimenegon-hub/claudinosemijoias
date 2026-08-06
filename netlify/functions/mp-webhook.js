// netlify/functions/mp-webhook.js
// Recebe notificações do Mercado Pago (cartão e Pix)
// e atualiza o pedido + reserva etiqueta automaticamente
const https = require('https');
const { getStore } = require('@netlify/blobs');

function mpGet(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.mercadopago.com',
      path,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

function meRequest(path, method, body, token) {
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'melhorenvio.com.br',
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
      res.on('data', c => { data += c; });
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

exports.handler = async (event, context) => {
  // Aceita GET (validação do MP) e POST (notificação)
  if(event.httpMethod === 'GET') {
    return { statusCode: 200, body: 'OK' };
  }

  if(event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let notification;
  try { notification = JSON.parse(event.body || '{}'); }
  catch { return { statusCode: 400, body: 'JSON inválido' }; }

  // MP envia: { type: 'payment', data: { id: '12345' } }
  // ou query param: ?topic=payment&id=12345
  const topic   = notification.type || event.queryStringParameters?.topic;
  const payId   = notification.data?.id || event.queryStringParameters?.id;

  if(topic !== 'payment' || !payId) {
    return { statusCode: 200, body: 'Ignorado' };
  }

  const mpToken = process.env.MP_ACCESS_TOKEN || '';
  const meToken = process.env.MELHOR_ENVIO_TOKEN || '';

  if(!mpToken) {
    console.error('MP_ACCESS_TOKEN não configurado');
    return { statusCode: 200, body: 'Token não configurado' };
  }

  // 1. Buscar detalhes do pagamento no MP
  const pagResp = await mpGet(`/v1/payments/${payId}`, mpToken);
  if(pagResp.status !== 200) {
    console.error('Erro ao buscar pagamento:', pagResp.body);
    return { statusCode: 200, body: 'Erro ao buscar pagamento' };
  }

  const pag = pagResp.body;
  const status          = pag.status;           // 'approved', 'pending', etc.
  const externalRef     = pag.external_reference; // ID do pedido salvo no site
  const metodoPagamento = pag.payment_type_id;  // 'credit_card', 'account_money', 'bank_transfer' (pix)

  console.log(`Pagamento ${payId}: status=${status} ref=${externalRef} metodo=${metodoPagamento}`);

  if(status !== 'approved') {
    return { statusCode: 200, body: `Status ${status} ignorado` };
  }

  if(!externalRef) {
    console.warn('external_reference não encontrado no pagamento');
    return { statusCode: 200, body: 'Sem external_reference' };
  }

  // 2. Buscar pedido no Netlify Blobs
  const siteID = process.env.NETLIFY_SITE_ID || process.env.SITE_ID || '';
  const blobToken = process.env.NETLIFY_ACCESS_TOKEN || '';

  if(!siteID || !blobToken) {
    console.error('Credenciais Netlify Blobs não configuradas');
    return { statusCode: 200, body: 'Blobs não configurados' };
  }

  const store = getStore({ name: 'site-config', siteID, token: blobToken });
  const storeData = await store.get('store', { type: 'json' }) || {};
  const pedidos = storeData.pedidos || [];

  const pedidoId = parseInt(externalRef);
  const idx = pedidos.findIndex(p => p.id === pedidoId);

  if(idx === -1) {
    console.warn(`Pedido ${pedidoId} não encontrado`);
    return { statusCode: 200, body: 'Pedido não encontrado' };
  }

  // 3. Atualizar status do pedido
  pedidos[idx].status       = 'aprovado';
  pedidos[idx].pagamentoId  = String(payId);
  pedidos[idx].metodoPag    = metodoPagamento === 'bank_transfer' ? 'Pix' : 'Cartão';

  // 4. Reservar etiqueta no Melhor Envio (se tiver serviço ME e token ME)
  if(meToken && pedidos[idx].servicoME && !pedidos[idx].meOrderId) {
    try {
      const p   = pedidos[idx];
      const end = p.endereco || {};
      const mePayload = {
        service: p.servicoME,
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
        products: (p.itens || []).map(i => ({
          name: i.nome, quantity: i.qty, unitary_value: i.preco,
        })),
        volumes: [{ height: 5, width: 11, length: 16, weight: 0.3 }],
        options: {
          insurance_value: p.subtotal || 0,
          receipt: false, own_hand: false,
          tags: [{ tag: `PEDIDO-${p.id}`, url: null }],
        },
      };
      const meResp = await meRequest('/api/v2/me/cart', 'POST', mePayload, meToken);
      if(meResp.status === 200 || meResp.status === 201) {
        pedidos[idx].meOrderId = meResp.body.id;
        console.log(`Etiqueta reservada no ME: ${meResp.body.id}`);
      } else {
        console.warn('Erro ao reservar ME:', meResp.body);
      }
    } catch(e) {
      console.warn('Erro ME:', e.message);
    }
  }

  // 5. Salvar pedidos atualizados no Blobs
  await store.setJSON('store', { ...storeData, pedidos });
  console.log(`Pedido ${pedidoId} atualizado: aprovado via ${metodoPagamento}`);

  return { statusCode: 200, body: 'OK' };
};
