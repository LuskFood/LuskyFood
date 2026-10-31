# Etapa 3 — segurança e preparação da publicação

## Estado do trabalho

O arquivo `netlify.toml` prepara o build Vite (`npm run build`, diretório `dist`, Node 22) e o redirecionamento das rotas da aplicação para `index.html`. O projeto Netlify `luskyfood` está conectado ao repositório privado `LuskFood/LuskyFood` e publica a branch `main` em `https://luskyfood.netlify.app`. O deploy do commit `a7d4d7f` foi publicado sem erro em 30/10/2026. O login publicado ainda dependia das variáveis públicas do Supabase, ausentes no Netlify nessa verificação.

A interface deixa de usar `user_metadata` como papel de autorização e não concede administração por falta de papel. A aplicação conectada usa o papel de `app_metadata`; quando esse papel está ausente, segue o padrão de cliente usado pelo banco. Um papel desconhecido não abre os portais. O acesso por senha da demonstração local está limitado ao Vite em desenvolvimento. As permissões efetivas dependem das políticas do Supabase, não apenas da interface.

O diretório remoto de clientes usa novas RPCs administrativas para listar contas com paginação e abrir o histórico da conta com métricas completas e pedidos paginados. A associação é pelo `created_by` de contas atualmente com papel cliente; pedidos lançados pela equipe aparecem em uma fila paginada de identificação pendente e não são atribuídos pelo nome ou telefone. Mudanças antigas de papel não têm trilha temporal para provar o papel do autor na data da compra. No portal de motoboys, o detalhe do perfil consulta indicadores e histórico paginado no servidor. A lista geral do aplicativo ainda carrega pedidos para visão geral e relatórios, então a redução global de consultas continua pendente.

O usuário confirmou o projeto Supabase `mhmfqldibtcsuyqsqiqp` na branch `main`, marcada como produção. As migrações `20261030230158_lusky_delivery_handoff_v2.sql` e `20261030230235_lusky_admin_customer_history.sql` foram aplicadas via MCP e aparecem no histórico remoto. Os nomes locais foram alinhados às versões registradas. Ainda há dois arquivos locais antigos com prefixo duplicado `20261030020000` e divergências no restante do histórico; não use `db push`, reset ou `migration repair` até reconciliar esses registros. O painel mostrado pelo usuário indicava ausência de backups listados.

## Antes de publicar

1. Validar as RPCs aplicadas em ambiente isolado com contas QA; confirmar autorização, filtros, paginação e não associação de pedidos criados pela equipe.
2. Continuar a reconciliação do histórico antigo local/remoto antes de qualquer outra aplicação. Não usar reset ou `migration repair` para reconciliar versões.
3. A função `lusky-maps` versão 4 e o frontend compatível estão publicados. Confirmar com contas reais os códigos, GPS, Realtime e rotas viárias dos pedidos reais. O RPC antigo de confirmação pela equipe foi revogado pelo banco; o frontend usa `lusky_team_confirm_pickup`.
4. Verificar permissões e configuração de Auth (Site URL e Redirect URLs), preservando as URLs de desenvolvimento; testar cadastro, confirmação de e-mail e recuperação em HTTPS.
5. A conexão Git e a URL de produção do Netlify estão confirmadas. Conferir os contextos de Deploy Preview no painel se forem utilizados.
6. Configurar no painel `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` com escopo de build e iniciar novo deploy. Nunca colocar credenciais privadas em `VITE_*`; a chave HeiGIT e demais segredos de backend pertencem ao Supabase.
7. Revisar arquivos rastreados, staged, histórico e detecção de segredos. A inspeção limitada realizada nesta etapa não substitui uma varredura completa nem prova ausência de credenciais no histórico.
8. Repetir testes funcionais com contas reais dos três perfis e responsividade após o novo build. O build local e os 20 testes automatizados passaram; a demonstração local exibiu rotas pelas vias nas três visões.

O roteiro do motoboy solicita a geometria viária para o pedido selecionado e para a sequência de entregas atribuídas àquela conta. A Edge Function já está publicada; sem o segredo HeiGIT, usa o fallback público FOSSGIS/OSRM. O teste autenticado em produção continua pendente.

## Conexão e reversão no Netlify

No painel da equipe `luskfood`, abra o site `luskyfood`. O deploy contínuo está ligado à branch `main` do repositório privado `LuskFood/LuskyFood`. Use Deploy Preview para revisar alterações antes da produção. Defina as duas variáveis públicas no painel com escopo de build e mantenha chaves privadas no backend Supabase. Como Vite incorpora `VITE_*` no build, salvar as variáveis exige um novo deploy; confirme então o login em `https://luskyfood.netlify.app`.

Para reverter um frontend, selecione no Netlify um deploy de produção conhecido como bom e use a ação de publicar esse deploy, depois confira login, rotas e variáveis. Reversão do frontend não desfaz migrações SQL: mudanças no banco exigem migração de correção compatível revisada, nunca reset ou reaplicação cega.

[← Índice](README.md) · [Entregas e rotas](etapa-2-entregas.md) · [Segurança](seguranca-e-privacidade.md) · [Integrações](integracoes.md)
