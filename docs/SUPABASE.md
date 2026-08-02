# Supabase — banco central da Claudino Semijoias

## Objetivo

Produtos, preços, estoque, categorias, banners, configurações e pedidos devem ser armazenados em uma única fonte de dados. Desktop e celular acessam o mesmo banco, evitando informações diferentes entre dispositivos.

## Criação do projeto

1. Criar um projeto no Supabase.
2. Abrir o SQL Editor.
3. Executar integralmente o arquivo `supabase/schema.sql`.
4. Em Authentication, criar o usuário administrador.
5. No SQL Editor, cadastrar esse usuário em `admin_users`:

```sql
insert into public.admin_users (user_id, role)
values ('UUID_DO_USUARIO', 'admin');
```

## Variáveis da Netlify

Cadastrar em **Site configuration → Environment variables**:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `MERCADO_PAGO_PUBLIC_KEY`
- `MERCADO_PAGO_ACCESS_TOKEN`

Nunca salvar `SUPABASE_SERVICE_ROLE_KEY` ou `MERCADO_PAGO_ACCESS_TOKEN` no GitHub, no painel do navegador ou em arquivos públicos.

## Segurança

- O catálogo ativo pode ser lido publicamente.
- Somente usuários presentes em `admin_users` podem alterar produtos e configurações.
- Pedidos não são inseridos diretamente pelo navegador; devem passar por Netlify Function autenticada.
- Configurações cujo nome comece com `secret_` não são expostas ao catálogo público.

## Sincronização

Depois da integração do frontend:

- uma alteração feita no painel desktop será gravada no Supabase;
- o painel mobile lerá o mesmo registro;
- a loja pública em qualquer dispositivo receberá os mesmos dados;
- o campo `updated_at` permitirá detectar e atualizar alterações recentes.

## Próxima implementação

1. Cliente público para leitura de catálogo e configurações.
2. Login administrativo com Supabase Auth.
3. CRUD de produtos e categorias.
4. Upload de imagens no Supabase Storage.
5. Funções seguras para pedidos e pagamentos.
6. Migração dos dados atuais do `index.html` para o banco.
