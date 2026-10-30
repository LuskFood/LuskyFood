# Etapa 3 — segurança e preparação da publicação

## Estado do trabalho

O arquivo `netlify.toml` prepara o build Vite (`npm run build`, diretório `dist`, Node 22) e o redirecionamento das rotas da aplicação para `index.html`. Não confirma a existência de um projeto Netlify nem executa um deploy. A equipe prevista é `luskfood`, a branch prevista é `main` e o repositório deve permanecer privado.

A interface deixa de usar `user_metadata` como papel de autorização e não concede administração por falta de papel. A aplicação conectada usa o papel de `app_metadata`; quando esse papel está ausente, segue o padrão de cliente usado pelo banco. Um papel desconhecido não abre os portais. O acesso por senha da demonstração local está limitado ao Vite em desenvolvimento. As permissões efetivas dependem das políticas do Supabase, não apenas da interface.

O diretório remoto de clientes usa novas RPCs administrativas para listar contas com paginação e abrir o histórico da conta com métricas completas e pedidos paginados. A associação é pelo `created_by` de contas atualmente com papel cliente; pedidos lançados pela equipe aparecem em uma fila paginada de identificação pendente e não são atribuídos pelo nome ou telefone. Mudanças antigas de papel não têm trilha temporal para provar o papel do autor na data da compra. No portal de motoboys, o detalhe do perfil consulta indicadores e histórico paginado no servidor. A lista geral do aplicativo ainda carrega pedidos para visão geral e relatórios, então a redução global de consultas continua pendente.

O usuário confirmou o projeto Supabase `mhmfqldibtcsuyqsqiqp` na branch `main`, marcada como produção. As migrações `20261030230158_lusky_delivery_handoff_v2.sql` e `20261030230235_lusky_admin_customer_history.sql` foram aplicadas via MCP e aparecem no histórico remoto. Os nomes locais foram alinhados às versões registradas. Ainda há dois arquivos locais antigos com prefixo duplicado `20261030020000` e divergências no restante do histórico; não use `db push`, reset ou `migration repair` até reconciliar esses registros. O painel mostrado pelo usuário indicava ausência de backups listados.

## Antes de publicar

1. Validar as RPCs aplicadas em ambiente isolado com contas QA; confirmar autorização, filtros, paginação e não associação de pedidos criados pela equipe.
2. Continuar a reconciliação do histórico antigo local/remoto antes de qualquer outra aplicação. Não usar reset ou `migration repair` para reconciliar versões.
3. Publicar a versão compatível da função de mapas e testar códigos, GPS, Realtime e rotas viárias reais. O RPC antigo de confirmação pela equipe foi revogado pelo banco; o frontend novo precisa estar ativo para usar `lusky_team_confirm_pickup`.
4. Verificar permissões e configuração de Auth (Site URL e Redirect URLs), preservando as URLs de desenvolvimento; testar cadastro, confirmação de e-mail e recuperação em HTTPS.
5. Confirmar o acesso à equipe Netlify `luskfood`, a conexão com o repositório privado e os contextos de preview. Nenhuma conexão ou URL de produção foi confirmada aqui.
6. Configurar no painel somente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` públicos, quando necessários. Nunca colocar credenciais privadas em `VITE_*`; a chave HeiGIT e demais segredos de backend pertencem ao Supabase.
7. Revisar arquivos rastreados, staged, histórico e detecção de segredos. A inspeção limitada realizada nesta etapa não substitui uma varredura completa nem prova ausência de credenciais no histórico.
8. Executar testes funcionais com os perfis, responsividade e verificação do build; solicitar autorização explícita antes do deploy de produção.

O roteiro do motoboy agora solicita uma geometria viária só para entregas em rota atribuídas àquela conta, passando as paradas na ordem salva. Esse recurso local ainda depende do segredo HeiGIT, da publicação da Edge Function e de coordenadas reais; não está validado em produção.

## Conexão e reversão no Netlify

No painel, selecione a equipe `luskfood`, crie ou abra o site e conecte o repositório privado `LuskFood/LuskyFood` pela branch `main`. Antes de ativar deploy contínuo em `main`, confira quem pode enviar para essa branch e o contexto de produção configurado. Use Deploy Preview para revisar uma alteração sem promovê-la; a integração com GitHub e os previews ainda precisam ser confirmados no painel. Defina as variáveis públicas no painel, com escopo de build, e mantenha chaves privadas no backend Supabase.

Para reverter um frontend, selecione no Netlify um deploy de produção conhecido como bom e use a ação de publicar esse deploy, depois confira login, rotas e variáveis. Reversão do frontend não desfaz migrações SQL: mudanças no banco exigem migração de correção compatível revisada, nunca reset ou reaplicação cega.

[← Índice](README.md) · [Entregas e rotas](etapa-2-entregas.md) · [Segurança](seguranca-e-privacidade.md) · [Integrações](integracoes.md)
