# Etapa 2 — entregas e rotas

## Estado atual

As alterações do fluxo estão no código local e a migração `20261030230158_lusky_delivery_handoff_v2.sql` foi aplicada ao Supabase conectado. A versão local de `lusky-maps` **ainda não foi implantada**. O frontend novo depende dessas mudanças para o fluxo real: não publique uma parte isoladamente. A função remota `lusky-maps` estava ativa com JWT obrigatório, versão 3, na inspeção de 30/10/2026. A presença e a validade da chave HeiGIT não foram confirmadas nesta etapa.

## Retirada e entrega propostas

1. A equipe atribui um motoboy habilitado. A atribuição pode ocorrer durante o preparo e não altera o status.
2. O motoboy informa o número do pedido no restaurante. A equipe confere o pedido pronto e a identidade atribuída e confirma a retirada.
3. A RPC confere papel da equipe, pedido, estado e motoboy ainda atribuído antes de passar para `Saiu para entrega`.
4. O cliente autenticado titular consulta o código de seis dígitos de seu pedido em rota. O motoboy solicita esse código ao chegar e o envia à RPC de entrega.
5. O banco confere o motoboy atribuído, estado, código e tentativas; em sucesso marca código como consumido, registra horário e evento e conclui o pedido na mesma transação. Repetições são recusadas. Cinco erros bloqueiam novas tentativas por 15 minutos.
6. Pedidos de retirada no balcão continuam usando a transição existente da equipe, sem motoboy e sem código domiciliar.

As funções públicas novas ou atualizadas usam invocador; funções privilegiadas ficam no schema interno e conferem o usuário. A migração retira o acesso aos caminhos antigos de confirmação que não tinham o mesmo limite de tentativas. Realtime e RLS existentes continuam responsáveis por atualizar os portais; a política do motoboy passa a incluir seus pedidos em preparo e concluídos.

## Diagnóstico do código

No modo demonstração, o portal do cliente limpava o código em vez de mostrá-lo, embora a entrega demo o exigisse. A nova interface mostra o código fictício apenas no próprio pedido demo. Na operação conectada, o código é retornado somente ao titular autenticado (`created_by`) durante a entrega. Pedidos criados pela equipe não vinculam automaticamente um cliente cadastrado: ainda não há um meio seguro para clientes sem conta obterem o código. A interface avisa a equipe para orientar o cliente a pedir pela própria conta. Não foi criada uma consulta baseada apenas no número do pedido.

O Supabase conectado ainda possui a confirmação antiga da equipe, que não aplica o mesmo limite de tentativas ao código final. A migração local revoga esse caminho, mas a correção só valerá depois de aplicada e validada.

## Rotas

O desenho anterior usava uma linha reta de referência quando não havia geometria. O mapa local mostra apenas marcadores nesse caso e informa que a rota pelas vias está indisponível. Geometrias GeoJSON `LineString` válidas são convertidas de longitude/latitude para latitude/longitude, enquadradas e desenhadas em amarelo tracejado com contorno escuro. Não são inventados distância ou tempo.

A Edge Function local valida o participante, solicita `driving-car` com preferência de menor distância ao HeiGIT e valida a resposta. A rota restaurante → cliente é persistida por pedido e reutilizada quando seus extremos correspondem aos pinos. Para deslocamento até o restaurante, o motoboy pode iniciar o GPS e a função calcula um trecho temporário da posição informada até a origem; esse trecho não é salvo como histórico de posição. O GPS só é enviado ao banco durante entregas em rota. Novas consultas são controladas por etapa, cache e ação de tentar novamente, sem recalcular a cada posição de GPS.

As paradas atribuídas são exibidas por `route_order`, e o mapa usa a próxima entrega da lista. Para duas ou mais entregas em rota, a função local agora envia a origem e os destinos em sequência a uma única solicitação de direções pelas vias, validando que todas pertencem ao motoboy autenticado. A rota de sequência é transitória e não altera a geometria persistida por pedido. A navegação externa pode usar a posição atual do aparelho. A geometria real do provedor, as cotas e o funcionamento entre sessões ainda precisam ser verificados com uma chave válida e pinos reais confirmados.

## Verificações e limitações

- `npm test` inclui testes em Postgres isolado via PGlite, com tabelas e identidades fictícias, além de testes das RPCs chamadas pelo cliente, falha de rede e validação de geometria. Não houve alteração de dados reais.
- O teste SQL cobre atribuição, retirada, dono e outro cliente, motoboy errado, código errado ou de outro pedido, bloqueio de tentativas, consumo, reutilização, histórico e retirada no balcão. Ele não substitui teste de concorrência em sessões separadas do Postgres real nem teste ponta a ponta de Realtime.
- No navegador local, em uma origem isolada de demonstração, a equipe atribuiu o motoboy e confirmou a retirada; o cliente consultou seu código; e o motoboy testou um código incorreto e concluiu a entrega com o código correto. Também foram inspecionados desktop e viewport móvel. GPS real, integração do provedor, Realtime entre sessões e contas de produção não foram usados.
- Antes da aplicação autorizada em um ambiente isolado, verifique histórico de migrações e execute testes de cliente A/B, motoboy A/B e equipe, duas confirmações simultâneas, falha de rede, Realtime e GPS em HTTPS. Depois valide com uma rota viária real e confirme origem/destino.
- Publicação Netlify e histórico administrativo completo pertencem à Etapa 3.

[← Índice](README.md) · [Segurança](seguranca-e-privacidade.md) · [Integrações](integracoes.md) · [Testes](testes-e-aceite.md)
