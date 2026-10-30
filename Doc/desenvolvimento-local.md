# Desenvolvimento local

## Requisitos

- Git com acesso ao repositório privado.
- Node.js 20.19+ ou 22.12+ (compatível com Vite 7) e npm.
- Navegador atualizado. Para testar GPS de verdade, use HTTPS e permita localização no aparelho.

## Clonar e instalar

```bash
git clone https://github.com/LuskFood/LuskyFood.git
cd LuskyFood
npm install
```

No PowerShell, os comandos de diretório e instalação são iguais. É necessário que a conta GitHub tenha acesso ao repositório privado.

## Ambiente local

Crie um arquivo de ambiente local a partir do exemplo:

```bash
cp .env.example .env.local
```

PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Configure `.env.local` no computador de desenvolvimento. Variáveis reconhecidas pelo frontend:

| Variável | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL pública do projeto Supabase conectado. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Chave publicável do Supabase; o acesso continua sujeito a Auth e RLS. |
| `VITE_LOCAL_DEMO_EMAIL` | E-mail opcional usado para acesso à demonstração local. |
| `VITE_LOCAL_DEMO_PASSWORD_SHA256` | Hash SHA-256 opcional da senha da demonstração local; não é a senha em texto claro. |
| `VITE_MAP_TILE_URL` | URL opcional de tiles compatíveis com Leaflet; confira atribuição e termos do provedor. |

`HEIGIT_API_KEY` não é uma variável do frontend. Ela deve existir somente como segredo do serviço backend que a utiliza. Nunca coloque chaves privadas em variáveis `VITE_*`. Não copie valores de produção para documentação ou para um commit. O `.gitignore` exclui `.env` e `.env.*`, preservando `.env.example`.

Sem uma sessão conectada, use o modo de demonstração oferecido pela tela de login. Os dados deste modo ficam no navegador e não são enviados ao Supabase.

## Executar, testar e compilar

```bash
npm run dev
npm test
npm run build
```

No PowerShell, os três comandos são os mesmos. O servidor de desenvolvimento imprime a URL local; Vite usa normalmente `http://localhost:5173`. Para conferir o build localmente, rode `npm run preview` após compilar.

## Conectar ao Supabase

Obtenha a URL e a chave publicável pelo responsável pelo projeto e preencha somente o `.env.local`. Reinicie o servidor Vite após alterar variáveis. Use uma conta de QA com o papel necessário e confira o ambiente antes de fazer alterações; a tela demo não equivale a uma sessão autenticada. Consulte [Integrações](integracoes.md), [Banco de dados](banco-de-dados.md) e [Segurança](seguranca-e-privacidade.md) para detalhes de Auth, RLS, Realtime e serviços.

## Problemas comuns

- **`npm` ou `node` não encontrado:** instale uma versão compatível de Node.js e abra um terminal novo.
- **Erro de versão do Vite:** confira `node --version`; use Node 20.19+ ou 22.12+.
- **Porta 5173 ocupada:** encerre o processo antigo ou aceite a porta alternativa indicada pelo Vite.
- **Variável alterada sem efeito:** pare e inicie `npm run dev` novamente; confirme que o nome começa por `VITE_` somente quando destinado ao frontend.
- **Tela demo em vez dos dados conectados:** confira URL/chave, conexão Auth e sessão; modo demo é local.
- **Mapa sem rota pelas ruas:** confirme pinos de origem e destino e configuração do provedor no backend. A linha reta é apenas uma referência visual.
- **GPS indisponível:** permita localização no navegador e use um endereço HTTPS; navegadores podem suspender GPS em segundo plano.
- **Repositório retorna 404:** confirme acesso ao repositório privado com o proprietário; não altere a visibilidade pública para contornar a permissão.

## Relacionados

[README principal](../README.md) · [Frontend](frontend.md) · [Arquitetura](arquitetura.md) · [Testes e aceite](testes-e-aceite.md) · [Integrações e publicação](integracoes.md).
