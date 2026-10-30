# Integrações e publicação

> **Etapa 2:** a migração de entrega foi aplicada; as alterações locais da função de mapas ainda não foram implantadas. O fluxo e as limitações atuais estão em [Entregas e rotas](etapa-2-entregas.md).

## Supabase

O projeto conectado usa Supabase Auth, Postgres, RLS, Realtime e Edge Functions. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em `.env.local` ou no host estático. A chave publishable vai ao navegador e depende de RLS. As migrações locais de `supabase/migrations/20261029235959...` até `20261030040000...` foram aplicadas no projeto conectado; consulte o histórico remoto antes de qualquer reaplicação. A Edge Function `lusky-maps` está implantada com JWT obrigatório. `lusky-admin-users` versão 4 também está ativa e valida telefone antes de criar ou editar contas.

## HeiGIT

1. Crie uma chave HeiGIT e confira a cota atual no painel do provedor.
2. Configure `HEIGIT_API_KEY` como segredo da Edge Function `lusky-maps`; nunca em `.env.local` com prefixo `VITE_` ou no Git.
3. Em Configurações, informe o endereço real do restaurante e confirme o pino, raio, taxa e meios de pagamento. Sem a chave, a equipe ainda pode localizar a origem por GPS ou coordenadas manuais. O cliente pode marcar o destino a partir da origem confirmada.
4. Com conta de QA, teste geocodificação, rota A→B e sequência de dois pedidos. Em indisponibilidade, opere manualmente conforme [Operação](operacao.md).
5. `VITE_MAP_TILE_URL` pode trocar o provedor de tiles. Confira atribuição, política de cache e regras de uso.

Sem uma rota calculada, o traço entre pinos é apenas uma referência direta; não representa ruas nem distância de percurso.

## Escopo da etapa visual

As duas migrações de entrega e histórico foram aplicadas ao projeto Supabase de produção confirmado pelo usuário. A hospedagem HTTPS, os redirecionamentos de autenticação, a publicação da versão atualizada de `lusky-maps` e a validação ponta a ponta continuam pendentes. O projeto Netlify ainda não foi confirmado.

## GitHub e frontend

Destino configurado: repositório privado `https://github.com/LuskFood/LuskyFood.git`. O histórico local está na branch `main`. A conexão GitHub desta sessão não tinha acesso (404) e `gh` não estava instalado; a publicação remota não foi concluída. Uma sessão autorizada deverá confirmar acesso e publicar sem `force`, verificando branch, commit e pasta `Doc/`.

A hospedagem estática requer `dist/`, fallback SPA, domínio HTTPS e redirecionamentos Auth para o domínio publicado. Configure no host somente variáveis públicas do Vite. A publicação do frontend é separada das migrações e Edge Functions do Supabase. GPS web requer HTTPS e permissão do aparelho.

## Checagem pré-produção

`npm test`, `npm run build`, chaves e origem, RLS com papéis distintos, Realtime entre sessões, fluxo de códigos, aparelho real, cota da API, pagamento manual, backup e rollback.

[← Índice da documentação](README.md) · [Desenvolvimento local](desenvolvimento-local.md) · [Frontend](frontend.md)
