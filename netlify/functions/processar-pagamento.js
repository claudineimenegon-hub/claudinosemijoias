<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Minha Loja - Mercado Pago</title>
</head>
<body>

  <h1>Produto Exemplo</h1>
  <p>Preço: R$ 50,00</p>
  
  <!-- Botão que dispara a criação do checkout -->
  <button id="checkout-btn">Pagar com Mercado Pago</button>

  <script>
    document.getElementById('checkout-btn').addEventListener('click', async () => {
      // Itens simulados que o usuário está comprando
      const carrinho = {
        items: [
          {
            title: "Produto Exemplo",
            quantity: 1,
            unit_price: 50.00,
            currency_id: "BRL"
          }
        ]
      };

      try {
        // Altera o texto do botão para dar feedback ao usuário
        document.getElementById('checkout-btn').innerText = "Carregando...";

        // Envia os dados para a sua Netlify Function (criada no passo anterior)
        const response = await fetch('/.netlify/functions/processar-pagamento', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(carrinho)
        });

        const data = await response.json();

        if (data.init_point) {
          // Redireciona o usuário para a página de pagamento seguro do Mercado Pago
          window.location.href = data.init_point;
        } else {
          alert('Erro ao gerar o link de pagamento.');
          document.getElementById('checkout-btn').innerText = "Pagar com Mercado Pago";
        }

      } catch (error) {
        console.error('Erro na requisição:', error);
        alert('Ocorreu um erro na comunicação com o servidor.');
        document.getElementById('checkout-btn').innerText = "Pagar com Mercado Pago";
      }
    });
  </script>
</body>
</html>
