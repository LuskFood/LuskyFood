# Banco de dados

> **Etapa 2:** a migração de entrega foi aplicada ao Supabase conectado. Alterações na Edge Function `lusky-maps` ainda não foram implantadas. O fluxo e as limitações atuais estão em [Entregas e rotas](etapa-2-entregas.md).

> **Etapa 3:** `20261030230235_lusky_admin_customer_history.sql` adiciona RPCs administrativas paginadas para diretório/histórico de contas clientes e histórico de motoboys. Foi aplicada ao Supabase conectado. As funções privilegiadas ficam em `internal`; wrappers em `public` usam `SECURITY INVOKER` e verificam o papel administrativo no servidor.

Projeto Supabase conectado: `mhmfqldibtcsuyqsqiqp` (branch `main`, produção, confirmado pelo usuário). As migrações de entrega e histórico foram aplicadas e registradas como `20261030230158` e `20261030230235`, e os arquivos locais correspondentes usam esses mesmos identificadores. As migrações antigas ainda têm divergências de nomes/versões e dois arquivos locais começam com `20261030020000`; não use `db push`, reset ou `migration repair` sem reconciliação específica. Consulte [Etapa 3](etapa-3-publicacao.md).

## Modelo

- `lusky_restaurant_settings`: origem, coordenadas, raio em linha reta, taxa, meios de pagamento e instruções públicas de Pix manual. Pix manual só pode ser ativado com instruções de 5–500 caracteres.
- `lusky_profiles`: nome, celular e preferência de contato; e-mail verificado permanece no Auth.
- `auth.users`: gatilho `lusky_require_signup_phone` exige celular brasileiro de 11 dígitos com DDD em toda nova conta, normaliza o número em `raw_user_meta_data.phone`; `lusky_handle_new_user` copia nome e telefone para `lusky_profiles`. Contas existentes não recebem número fictício.
- `lusky_customer_addresses`: endereço estruturado, pino confirmado e padrão único por cliente. RLS restringe ao dono.
- `lusky_orders`: `request_id` único por autor, telefone, itens e preço calculados no servidor, snapshot do endereço, coordenadas, taxa, pagamento, `payment_status`, horário e autor de confirmação. Pedidos antigos são preservados.
- `lusky_order_events`: auditoria de transição e atribuição.
- `lusky_order_routes`: geometria, distância, duração, perfil e horário do cálculo.
- `lusky_driver_locations`: apenas última posição, precisão, horário observado e recebido; linha removida quando não resta entrega ativa.
- `lusky_delivery_incidents`: ocorrência, autor, resolução.
- `internal.lusky_pickup_secrets`, `internal.lusky_delivery_attempts`: código de cozinha e limite de erros, sem acesso direto de cliente.
- `lusky_order_handoffs`: código de entrega legado protegido por revogação de SELECT; somente RPC autorizada apresenta o código ao cliente em rota.

Índices cobrem `(created_by,request_id)`, endereço por cliente, pedidos por estado e data, eventos/ocorrências por pedido e localização por recebimento. A rota A→B tem uma linha por pedido. Sequência de múltiplas entregas usa `route_order` na tabela de pedidos, não uma tabela de paradas independente.

O histórico administrativo de cliente usa o criador autenticado do pedido apenas quando a conta atualmente tem papel `customer`. Pedidos criados por equipe não são associados por nome/telefone. A função retorna contas e pedidos em páginas e calcula indicadores no banco; alterações anteriores de papel não possuem auditoria temporal suficiente para provar o papel na data de criação.

## RPCs e estados

`lusky_place_order` valida 1–30 itens, disponibilidade e preço do catálogo, tipo, pagamento, endereço/pino, cobertura e ID idempotente. Um gatilho inicia Pix manual em `pending`; outro bloqueia Novo pedido→Preparando até `confirmed`. A equipe confirma pela RPC `lusky_confirm_manual_pix`, que registra horário, autor e evento. `lusky_team_transition` permite avançar preparo e pedidos de balcão. O banco conectado ainda tem caminhos antigos de confirmação de entrega; não os use para concluir entregas até a revisão e aplicação coordenada da Etapa 2. A migração local da Etapa 2 atribui motoboys válidos durante o preparo, confirma retirada com a equipe e reserva a conclusão ao motoboy com código do cliente, limite de tentativas e consumo único. As RPCs administrativas novas da Etapa 3 consultam históricos no servidor, mas dependem da migração local não aplicada.

Os nomes de estado preservam compatibilidade com pedidos antigos: Novo pedido, Preparando, Pronto, Saiu para entrega, Entregue, Cancelado. Não há estado separado para aceito, atribuído, retirado ou ocorrência; atribuição e ocorrência ficam em colunas/eventos/tabela específica.

## Permissões

RLS habilitada em todas as tabelas novas. Cliente lê próprios pedidos, endereços, eventos e posição de entrega ativa; motoboy lê tarefas atribuídas e reporta posição pela RPC; equipe gerencia pedidos. Escritas diretas em pedidos e códigos foram revogadas. Segurança ainda requer ensaio com JWT de cliente A/B, motoboy A/B e equipe; testes de introspecção não substituem esse ensaio.

[← Índice da documentação](README.md) · [Desenvolvimento local](desenvolvimento-local.md) · [Frontend](frontend.md)
