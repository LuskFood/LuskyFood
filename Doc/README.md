# Documentação Lusky Food

Documentação técnica do repositório. Revisada em 30/10/2026 durante a finalização da Etapa 3.

## Estado desta etapa

A Etapa 2 implementa o fluxo de entrega e mapas; as migrações de entrega e histórico e a função `lusky-maps` versão 4 estão aplicadas no Supabase conectado. O frontend está publicado no Netlify pela branch `main`. A demonstração local foi conferida com rotas viárias FOSSGIS/OSRM nas visões de admin, motoboy e cliente. Em 30/10/2026, o site Netlify ainda não tinha as variáveis públicas do Supabase; após configurá-las, é necessário um novo build e a validação do login em HTTPS. Veja [Entregas e rotas](etapa-2-entregas.md) e [Etapa 3](etapa-3-publicacao.md).

A demonstração local contém registros fictícios e não sincroniza com o Supabase. Perfis de motoboy da demonstração são identificados como fictícios e seus documentos não estão verificados.

## Índice

### Produto e interface
- [Etapa 2: entregas e rotas](etapa-2-entregas.md)
- [Etapa 3: segurança e preparação da publicação](etapa-3-publicacao.md)
- [Desenvolvimento local e problemas comuns](desenvolvimento-local.md)
- [Frontend e estrutura de pastas](frontend.md)
- [UX e fluxos](ux-e-fluxos.md)
- [Arquitetura](arquitetura.md)

### Dados e operação
- [Banco de dados e permissões](banco-de-dados.md)
- [Segurança e privacidade](seguranca-e-privacidade.md)
- [Operação diária](operacao.md)
- [APIs e custos](apis-e-custos.md)

### Entrega e validação
- [Integrações e publicação](integracoes.md)
- [Testes e aceite](testes-e-aceite.md)
- [Prompt original](PROMPT-CODEX.md)

## Manutenção

Atualize o documento ligado à área modificada e confira seus links relativos. Alterações de banco ou Edge Function exigem revisão própria e registro de migrações; não reaplique arquivos já aplicados. Antes de compartilhar alterações, confira `git status`, o diff e os arquivos ignorados. Nunca inclua `.env` real, tokens, senhas, documentos pessoais ou dados de clientes nesta pasta.
