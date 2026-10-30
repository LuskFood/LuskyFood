# Documentação Lusky Food

Estado em 30/10/2026. O código e as migrações estão implementados localmente; as migrações e a Edge Function foram aplicadas no projeto Supabase conectado. O build e cinco testes de utilidades passaram. A chave HeiGIT, a origem real do restaurante, testes com contas separadas em aparelhos reais, hospedagem HTTPS e publicação GitHub ainda dependem de configuração/acesso. Portanto o rastreamento com provedor real ainda não foi validado.

## Índice

- [Arquitetura](arquitetura.md)
- [Banco de dados](banco-de-dados.md)
- [APIs e custos](apis-e-custos.md)
- [Integrações e publicação](integracoes.md)
- [UX e fluxos](ux-e-fluxos.md)
- [Segurança e privacidade](seguranca-e-privacidade.md)
- [Testes e aceite](testes-e-aceite.md)
- [Operação](operacao.md)
- [Prompt original](PROMPT-CODEX.md)

## Manutenção

Toda alteração de esquema deve gerar nova migração em `supabase/migrations/`; as já aplicadas são imutáveis. Revise o documento correspondente e execute `npm test` e `npm run build`. Nunca grave chaves, senhas, documentos ou dados de clientes nesta pasta.
