# 🍔 Lusky Food

Plataforma web de pedidos e operação de restaurante. Reúne cardápio, acompanhamento de pedidos, gestão da cozinha e entregas em uma interface com identidade amarelo e carvão.

> Projeto em evolução. A aplicação está publicada no Netlify e conectada ao Supabase. Pedidos reais e pedidos fictícios de apresentação são identificados separadamente na administração.

## ✨ Funcionalidades

- Pedidos de entrega e retirada, cardápio e gestão de produtos.
- Central de pedidos com filtros, etapas operacionais, atribuição de motoboys e detalhes.
- Perfis de clientes e equipe de entrega com dados disponíveis nos pedidos.
- Acompanhamento de entregas, confirmação da retirada pela equipe, código de entrega do cliente e mapas com indicação clara de limitações.
- Relatórios operacionais e configurações do restaurante.
- Demonstração local identificada e separada da sessão conectada ao Supabase.

## 🛠️ Tecnologias

React 19 · Vite · JavaScript · CSS · Supabase Auth/Postgres/Realtime/Edge Functions · Leaflet · Lucide React.

## 👥 Perfis

- **Administração e equipe:** pedidos, cardápio, clientes, motoboys, relatórios e configurações conforme a permissão da conta.
- **Cliente:** cardápio, carrinho, pedidos, endereços e conta.
- **Motoboy:** entregas atribuídas, confirmação por código e compartilhamento de localização durante a rota.
- **Demonstração local:** exemplos fictícios, sem sincronização com o banco.

## 📚 Documentação

- [Índice e estado do projeto](Doc/README.md)
- [Etapa 2: fluxo de entregas e rotas](Doc/etapa-2-entregas.md)
- [Etapa 3: segurança e preparação do Netlify](Doc/etapa-3-publicacao.md)
- [Desenvolvimento local e solução de problemas](Doc/desenvolvimento-local.md)
- [Frontend e estrutura de pastas](Doc/frontend.md)
- [Arquitetura](Doc/arquitetura.md) · [UX e fluxos](Doc/ux-e-fluxos.md) · [Operação](Doc/operacao.md)
- [Banco de dados](Doc/banco-de-dados.md) · [Segurança e privacidade](Doc/seguranca-e-privacidade.md)
- [APIs e custos](Doc/apis-e-custos.md) · [Integrações e publicação](Doc/integracoes.md)
- [Testes e aceite](Doc/testes-e-aceite.md)
- [Dados fictícios em produção](Doc/demonstracao-producao.md)

## 🚀 Início rápido

Requisitos: Git e Node.js compatível com Vite 7 (Node.js 20.19+ ou 22.12+).

```bash
git clone https://github.com/LuskFood/LuskyFood.git
cd LuskyFood
npm install
cp .env.example .env.local
npm run dev
```

No PowerShell, use `Copy-Item .env.example .env.local` no lugar de `cp`. Edite `.env.local` com as variáveis locais necessárias; detalhes em [Desenvolvimento local](Doc/desenvolvimento-local.md). O Vite informa o endereço local, normalmente `http://localhost:5173`.

```bash
npm test
npm run build
```

## 🔐 Autenticação e segurança

Com Supabase configurado, o login e os dados dependem das permissões e políticas do projeto conectado. A demonstração fica disponível em desenvolvimento e não grava alterações no Supabase; um build de produção sem configuração de autenticação não abre o painel. `.env.local` e demais `.env.*` são arquivos privados: não os compartilhe nem os versione. O `.env.example` contém apenas nomes de variáveis e placeholders. Chaves privadas, como `HEIGIT_API_KEY` e `SUPABASE_SERVICE_ROLE_KEY`, pertencem somente a serviços de backend; nunca use o prefixo `VITE_` para elas.

## 🗺️ Mapas e entregas

O mapa mostra os pinos confirmados e desenha a geometria de rota pelas vias quando disponível. Sem geometria válida, informa a indisponibilidade e mantém os pinos. O backend usa o provedor configurado ou o fallback público FOSSGIS/OSRM. GPS do navegador requer permissão e HTTPS; posições da demonstração são simuladas. Endereço da origem, pino e provedor devem ser validados antes de operar entregas reais.

## 🌐 Publicação

O `netlify.toml` prepara build e roteamento SPA. A aplicação está publicada em [luskyfood.netlify.app](https://luskyfood.netlify.app). As variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` precisam estar configuradas no Netlify para autenticação. Veja [preparação da publicação](Doc/etapa-3-publicacao.md); este repositório não deve ser publicado como público.

## 🔀 Versionamento

O trabalho é mantido na branch `main` do repositório privado. Faça alterações em commits pequenos e descritivos, revise `git status` e o diff, e confirme que nenhum arquivo `.env` ou credencial foi incluído antes de compartilhar mudanças. Não use `git push --force`.
