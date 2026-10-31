# Integrações e publicação

> **Etapa 2:** o fluxo e as migrações de entrega e histórico estão aplicados no Supabase. A função de mapas mantém JWT obrigatório e usa fallback de rota pública quando a chave HeiGIT não está configurada. Consulte [Entregas e rotas](etapa-2-entregas.md) para limites e fontes.

## Supabase

O projeto conectado usa Supabase Auth, Postgres, RLS, Realtime e Edge Functions. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local` ou no host estático. A chave publishable vai ao navegador e depende de RLS. As migrações locais de `supabase/migrations/20261029235959...` até `20261030040000...` foram aplicadas no projeto conectado; consulte o histórico remoto antes de qualquer reaplicação. A Edge Function `lusky-maps` versão 4 está implantada com JWT obrigatório. `lusky-admin-users` versão 8 também está ativa e valida telefone antes de criar ou editar contas.

## Roteamento e geocodificação

1. Se disponível, configure `HEIGIT_API_KEY` como segredo da Edge Function `lusky-maps`; nunca em `.env.local` com prefixo `VITE_` ou no Git. HeiGIT oferece geocodificação, rotas de carro com preferência de menor distância e otimização.
2. Sem a chave, `route` e `sequence` usam o serviço público FOSSGIS/OSRM para desenhar rotas de carro pelo trajeto mais rápido estimado. O serviço limita a uma solicitação por segundo, proíbe uso pesado e registra solicitações; a interface inclui atribuição e link para correção do OSM. Para escala comercial, configure um provedor próprio com SLA/cota adequada.
   No modo de demonstração, o navegador consulta esse mesmo serviço para obter a geometria pelas ruas dos pontos fictícios. As coordenadas enviadas ao FOSSGIS podem constar nos logs do operador; a chamada usa fila por aba e cache local.
3. Geocodificação e otimização continuam exigindo HeiGIT. Em Configurações, informe o endereço real do restaurante e confirme o pino, raio, taxa e meios de pagamento. `VITE_MAP_TILE_URL` pode trocar o provedor de tiles; confira atribuição, privacidade, política de cache e uso.
4. Com contas de QA, valide geocodificação, rota A→B, sequência de pedidos, cota e comportamento quando o provedor falhar. Em indisponibilidade, opere manualmente conforme [Operação](operacao.md).

O fallback FOSSGIS/OSRM calcula rota pelas vias com perfil de carro e não considera trânsito ao vivo. A coordenada encaminhada ao serviço pode ser armazenada nos logs operacionais dele. Pinos baseados apenas no CEP são aproximados e devem ser conferidos no mapa antes da entrega real.

## Escopo da etapa visual

As duas migrações de entrega e histórico foram aplicadas ao projeto Supabase de produção confirmado pelo usuário. `lusky-maps` versão 4 está ativa; para os pedidos LF-1 e LF-2839, falta acionar a tentativa autenticada no popup para calcular e salvar a geometria. A hospedagem HTTPS, os redirecionamentos de autenticação e o projeto Netlify ainda precisam de confirmação.

## GitHub e frontend

Destino configurado: repositório privado `https://github.com/LuskFood/LuskyFood.git`. O histórico local está na branch `main`. As alterações de fallback e documentação estão sendo publicadas sem `force`; confirme o commit remoto após a publicação.

A hospedagem estática requer `dist/`, fallback SPA, domínio HTTPS e redirecionamentos Auth para o domínio publicado. Configure no host somente variáveis públicas do Vite. A publicação do frontend é separada das migrações e Edge Functions do Supabase. GPS web requer HTTPS e permissão do aparelho.

## Checagem pré-produção

`npm test`, `npm run build`, chaves e origem, RLS com papéis distintos, Realtime entre sessões, fluxo de códigos, aparelho real, cota da API, pagamento manual, backup e rollback.

[← Índice da documentação](README.md) · [Desenvolvimento local](desenvolvimento-local.md) · [Frontend](frontend.md)

