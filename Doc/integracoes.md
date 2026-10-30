# Integrações e publicação

## Supabase

Projeto conectado: `mhmfqldibtcsuyqsqiqp`. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local` ou no host estático. A chave publishable vai ao navegador e depende de RLS. Migrações locais `supabase/migrations/20261029235959...` até `20261030018000...` já foram aplicadas neste projeto; não as reaplique manualmente sem consultar o histórico remoto. A Edge Function `lusky-maps` está implantada com JWT obrigatório.

## HeiGIT

1. Crie chave gratuita HeiGIT e confira cota no painel.
2. Configure `HEIGIT_API_KEY` como segredo da Edge Function `lusky-maps` no Supabase; nunca em `.env.local` com prefixo `VITE_` nem no Git.
3. Na tela de Configurações, informe endereço real do restaurante, localize e confirme coordenadas, raio, taxa e meios de pagamento.
4. Com conta QA, teste geocódigo, rota A→B e sequência de 2 pedidos. Se houver 403/429 ou timeout, a interface informa indisponibilidade; opere manualmente conforme [operação](operacao.md).
5. Para tiles, `VITE_MAP_TILE_URL` opcional troca o provedor. Garanta atribuição e regras de cache/referer.

## GitHub e frontend

Destino fornecido: `https://github.com/LuskFood/LuskyFood.git`, privado. A conexão GitHub desta sessão não tem acesso (404), e `gh` não está instalado. Publicação remota não foi confirmada. O diretório local pode ser inicializado e vinculado; uma sessão autorizada deve fazer push sem `force`, verificar branch/commit e a pasta `Doc/`.

Publique `dist/` em host estático HTTPS com fallback SPA. Configure somente variáveis públicas do Vite no host, redirecionamentos Auth para domínio HTTPS, cache de assets e rollback pelo commit anterior. Migrações/Edge Function no Supabase são publicação separada. GPS web requer HTTPS e permissão do aparelho.

## Checagem pré-produção

`npm test`, `npm run build`, chaves e origem, RLS com cinco papéis, Realtime entre sessões, fluxo de códigos, aparelho real, limite da API, pagamento manual, backup e rollback.
