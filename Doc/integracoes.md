# Integrações e publicação

## Supabase

Projeto conectado: `mhmfqldibtcsuyqsqiqp`. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local` ou no host estático. A chave publishable vai ao navegador e depende de RLS. Migrações locais `supabase/migrations/20261029235959...` até `20261030022000...` já foram aplicadas neste projeto; não as reaplique manualmente sem consultar o histórico remoto. A Edge Function `lusky-maps` está implantada com JWT obrigatório. `lusky-admin-users` versão 4 também está ativa e valida telefone antes de criar ou editar contas.

## HeiGIT

1. Crie chave gratuita HeiGIT e confira cota no painel.
2. Configure `HEIGIT_API_KEY` como segredo da Edge Function `lusky-maps` no Supabase; nunca em `.env.local` com prefixo `VITE_` nem no Git.
3. Na tela de Configurações, informe endereço real do restaurante, localize e confirme coordenadas, raio, taxa e meios de pagamento. Sem chave HeiGIT, a equipe pode usar o GPS do aparelho estando no restaurante ou informar latitude/longitude, ajustar no mapa e confirmar o pino. O cliente pode marcar o destino no mapa a partir da origem configurada; a escolha manual exige tocar no ponto de entrega antes da confirmação. O cálculo automático de rota continua dependente da chave.
4. Com conta QA, teste geocódigo, rota A→B e sequência de 2 pedidos. Se houver 403/429 ou timeout, a interface informa indisponibilidade; opere manualmente conforme [operação](operacao.md).
5. Para tiles, `VITE_MAP_TILE_URL` opcional troca o provedor. Garanta atribuição e regras de cache/referer.

## GitHub e frontend

Destino fornecido: `https://github.com/LuskFood/LuskyFood.git`, privado. O Git local foi inicializado na branch `main`, com `origin` configurado e commit inicial `0876208`. A conexão GitHub desta sessão não tem acesso (404), e `gh` não está instalado. `git ls-remote --heads origin` e `git push -u origin main` retornaram “Repository not found”; a publicação remota não foi concluída. Uma sessão autorizada deve executar `git push -u origin main` sem `force`, verificar branch/commit e a pasta `Doc/`.

Publique `dist/` em host estático HTTPS com fallback SPA. Configure somente variáveis públicas do Vite no host, redirecionamentos Auth para domínio HTTPS, cache de assets e rollback pelo commit anterior. Migrações/Edge Function no Supabase são publicação separada. GPS web requer HTTPS e permissão do aparelho.

## Checagem pré-produção

`npm test`, `npm run build`, chaves e origem, RLS com cinco papéis, Realtime entre sessões, fluxo de códigos, aparelho real, limite da API, pagamento manual, backup e rollback.
