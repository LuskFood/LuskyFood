# Dados fictícios em produção

O ambiente publicado pode conter 10 clientes fictícios e 30 pedidos históricos concluídos para apresentar os painéis, o cardápio, o faturamento e as rotas. Eles ficam identificados pelo campo `demo_seed_key` e vinculados a `lusky_demo_customers`, sem criar contas de autenticação ou entrar na fila de entregas dos motoboys. Os contatos usam `example.invalid`; os endereços são descritos como fictícios e os pinos são aproximados para visualizar o mapa.

## Aplicação

1. Aplicar `supabase/migrations/20261031010000_lusky_demo_customers.sql` no projeto Supabase conectado.
2. Executar `supabase/seeds/lusky_showcase_30_orders.sql` com acesso administrativo ao banco. O script é idempotente: cada pedido tem uma chave única de demonstração.
3. Abrir o admin em **Clientes** para ver os 10 perfis e seus pedidos. Em cada perfil, **Ver rota** consulta o mesmo backend de roteamento usado pela Central de pedidos.

O painel de administração exibe um aviso quando há pedidos fictícios carregados. Os gráficos e totais de faturamento incluem esses pedidos: use os filtros de período para explorá-los. Esses valores são **ilustrativos**, não vendas reais. O sistema não possui custo de mercadorias suficiente para calcular lucro líquido; o indicador atual é faturamento.

O fallback de rota FOSSGIS/OSRM pode ficar temporariamente indisponível ou limitado. O mapa conserva os pinos e permite tentar novamente. Não use os endereços ou horários fictícios para operação real.
