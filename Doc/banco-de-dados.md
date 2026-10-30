# Banco de dados

Projeto Supabase conectado: `mhmfqldibtcsuyqsqiqp`. As migrações de 30/10/2026 foram aplicadas, sem excluir pedidos existentes. Arquivos locais em `supabase/migrations/` de `20261029235959` a `20261030018000`. A aplicação pelo conector dividiu a migração de rotas em quatro partes; os nomes remotos correspondentes estão no histórico do Supabase.

## Modelo

- `lusky_restaurant_settings`: origem, coordenadas, raio em linha reta, taxa e meios de pagamento.
- `lusky_profiles`: nome, celular e preferência de contato; e-mail verificado permanece no Auth.
- `lusky_customer_addresses`: endereço estruturado, pino confirmado e padrão único por cliente. RLS restringe ao dono.
- `lusky_orders`: `request_id` único por autor, telefone, itens e preço calculados no servidor, snapshot do endereço, coordenadas, taxa e pagamento. Pedidos antigos são preservados.
- `lusky_order_events`: auditoria de transição e atribuição.
- `lusky_order_routes`: geometria, distância, duração, perfil e horário do cálculo.
- `lusky_driver_locations`: apenas última posição, precisão, horário observado e recebido; linha removida quando não resta entrega ativa.
- `lusky_delivery_incidents`: ocorrência, autor, resolução.
- `internal.lusky_pickup_secrets`, `internal.lusky_delivery_attempts`: código de cozinha e limite de erros, sem acesso direto de cliente.
- `lusky_order_handoffs`: código de entrega legado protegido por revogação de SELECT; somente RPC autorizada apresenta o código ao cliente em rota.

Índices cobrem `(created_by,request_id)`, endereço por cliente, pedidos por estado e data, eventos/ocorrências por pedido e localização por recebimento. A rota A→B tem uma linha por pedido. Sequência de múltiplas entregas usa `route_order` na tabela de pedidos, não uma tabela de paradas independente.

## RPCs e estados

`lusky_place_order` valida 1–30 itens, disponibilidade e preço do catálogo, tipo, pagamento, endereço/pino, cobertura e ID idempotente. `lusky_team_transition` permite Novo pedido→Preparando→Pronto, retirada/salão Pronto→Entregue e cancelamento inicial com motivo. `lusky_assign_driver` exige entrega pronta e motoboy ativo com documento válido. `lusky_confirm_handoff` faz Pronto→Saiu para entrega com código da cozinha e Saiu para entrega→Entregue com código do cliente, bloqueando após cinco erros por 15 minutos. `lusky_kitchen_pickup_code` é só da equipe; `lusky_customer_delivery_code` é só do titular e só na etapa de entrega. `lusky_set_route_sequence`, `lusky_set_driver_availability`, `lusky_report_location`, `lusky_report_incident`, `lusky_resolve_incident` e `lusky_set_default_address` completam a operação.

Os nomes de estado preservam compatibilidade com pedidos antigos: Novo pedido, Preparando, Pronto, Saiu para entrega, Entregue, Cancelado. Não há estado separado para aceito, atribuído, retirado ou ocorrência; atribuição e ocorrência ficam em colunas/eventos/tabela específica.

## Permissões

RLS habilitada em todas as tabelas novas. Cliente lê próprios pedidos, endereços, eventos e posição de entrega ativa; motoboy lê tarefas atribuídas e reporta posição pela RPC; equipe gerencia pedidos. Escritas diretas em pedidos e códigos foram revogadas. Segurança ainda requer ensaio com JWT de cliente A/B, motoboy A/B e equipe; testes de introspecção não substituem esse ensaio.
