# Lusky Food

Aplicativo React/Vite com Supabase para pedidos, cozinha, motoboys e acompanhamento de entregas. Veja o [estado real e pendências](Doc/README.md) antes de usar em produção.

## Desenvolvimento

```bash
npm install
npm run dev
npm test
npm run build
```

Copie `.env.example` para `.env.local` e configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`. Sem sessão Supabase, a interface local oferece demonstração, identificada como tal e sem sincronização com o banco. As alterações no banco e a Edge Function estão descritas em [integrações](Doc/integracoes.md).

Para entregas reais, a equipe precisa configurar a origem no painel e `HEIGIT_API_KEY` como segredo da Edge Function `lusky-maps`. O navegador de motoboy requer HTTPS e permissão GPS. A chave de mapas e a service role jamais entram em variáveis `VITE_*` ou no repositório. A opção de Retirada não depende do serviço de mapas.

O projeto mantém as migrações versionadas em `supabase/migrations/`. Não reaplique uma migração já aplicada sem verificar o histórico. Testes ponta a ponta com usuários separados ainda estão pendentes e o GitHub privado ainda não recebeu esta versão.
