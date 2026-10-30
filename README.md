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

Para entregas reais, o ADM pode alterar endereço, coordenadas e pino de retirada em **Configurações**. O endereço Rua Otusco, 196, Capão Redondo, São Paulo/SP já está registrado no banco; falta confirmar o pino exato do número 196. A equipe também precisa configurar `HEIGIT_API_KEY` como segredo da Edge Function `lusky-maps` para geocodificação e rota pelas vias. Com pinos de origem e destino confirmados, o mapa mostra os dois pontos e uma linha tracejada de referência mesmo quando o provedor de rotas estiver indisponível. Essa linha é reta e não representa o percurso pelas ruas. Pedidos antigos sem coordenadas de entrega continuarão sem trajeto até terem um destino confirmado. O navegador de motoboy requer HTTPS e permissão GPS. A chave de mapas e a service role jamais entram em variáveis `VITE_*` ou no repositório. A opção de Retirada não depende do serviço de mapas.

A demonstração local inclui pedidos, clientes, motoboys, indicadores e pinos de exemplo. A tela **Usuários** nessa demonstração é somente visual; contas reais são gerenciadas pelo ADM conectado. As coordenadas da origem de demonstração representam aproximadamente o CEP, não o número 196.

O projeto mantém as migrações versionadas em `supabase/migrations/`. Não reaplique uma migração já aplicada sem verificar o histórico. Testes ponta a ponta com usuários separados ainda estão pendentes e o GitHub privado ainda não recebeu esta versão.
