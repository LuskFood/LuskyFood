# Prompt detalhado para o Codex

Copie a seção abaixo para uma tarefa de implementação no Codex. Este arquivo também deve acompanhar o projeto no GitHub.

**Configuração recomendada na interface do Codex:** selecione **GPT-6.1 Sol** e **raciocínio Alto** antes de enviar o prompt. Esta configuração é feita no seletor do aplicativo; o texto abaixo não altera o modelo automaticamente.

---

Você é o responsável técnico por transformar o projeto **Lusky Food**, no workspace atual, em um aplicativo operacional de pedidos e entregas. A experiência deve ter a clareza de um app como o iFood, com identidade própria da Lusky. **A maior prioridade é calcular rotas úteis e acompanhar entregas reais entre restaurante, motoboy e cliente.** Implemente código, migrações, configuração, documentação e testes; não responda apenas com plano ou mockup.

## 1. Contexto e regras de execução

- O projeto atual usa React/Vite, Supabase, três papéis (cliente, motoboy, administração) e modo de demonstração local. Leia `README.md`, `PRODUCT.md`, `DESIGN.md`, `src/App.jsx`, `src/supabase.js`, `supabase/migrations/`, `supabase/functions/` e toda a pasta `Doc/` antes de alterar.
- O repositório de destino é **`https://github.com/LuskFood/LuskyFood.git`**. O responsável mostrou uma captura em que ele **existe, é privado e está vazio**. A pasta local ainda não tem `.git`. Use uma sessão GitHub autorizada para inicializar/vincular este diretório, configurar `origin` e subir o projeto na branch padrão com commits revisáveis, sem `force push`. Antes do primeiro commit, confira `.gitignore` e exclua `.env.local`, segredos, dados de clientes, documentos, senhas QA e artefatos locais. **Depois do push, confirme que a branch e o commit estão visíveis no remoto e que `Doc/` foi publicada.** Se a autenticação da sua sessão não permitir push, finalize e teste tudo localmente, informe exatamente o impedimento e mostre o comando/etapa restante; não diga que a publicação foi concluída. Um 404 de conexão sem acesso **não significa que o repositório esteja errado**.
- Trabalhe sem pedir aprovação para escolhas técnicas rotineiras. Use a melhor opção gratuita compatível e explique as decisões no relatório. Não assine plano pago, não forneça cartão e não integre serviço que cobre automaticamente. Se faltar uma chave que somente o responsável pode criar, implemente a integração até o ponto possível, documente a configuração e teste o fallback; não finja que a funcionalidade externa foi validada.
- Preserve funcionalidades existentes e dados do banco. Use migrações versionadas; não edite migrações já aplicadas. Em qualquer implementação com Supabase, confira documentação e esquema atuais, RLS, políticas, grants, publicação Realtime e limites antes de alterar.
- Distinga sempre **dado real**, **dado demonstrativo**, **rota planejada**, **posição GPS observada** e **ETA estimado**. Não use texto “ao vivo” se a atualização não funcionar.

## 2. Problemas já observados, a confirmar na execução

1. Os mapas de cliente e motoboy são SVG/HTML ilustrativos; não há coordenadas, cálculo de trajeto, GPS enviado ou otimização de paradas.
2. A consulta ao Supabase conectado encontrou as tabelas Lusky, mas nenhuma delas na publicação `supabase_realtime`; o frontend já assina `lusky_orders`, portanto atualizações podem não chegar.
3. Ao falhar a criação de um pedido, a tela do cliente ainda limpa o carrinho e mostra sucesso. Corrigir retorno de erro, confirmação e idempotência.
4. O pedido de entrega criado pelo ADM não pede endereço. O cliente usa um único campo livre sem validar destino ou cobertura.
5. `route_order` existe, mas não é calculado nem ajustado pela interface. Atribuição de motoboy é manual e não considera disponibilidade, distância ou capacidade.
6. O código de retirada é exibido ao motoboy no pedido; revisar para que a confirmação prove a entrega da sacola pela cozinha.
7. Indicadores, gráficos, página de clientes, relatórios e configurações contêm dados fixos ou ações sem persistência. Os últimos 40 pedidos são carregados e a paginação exibida é fictícia.
8. CPF tem verificador, mas falta máscara automática; RG aceita um formato genérico, sem explicar que não existe verificador nacional único.
9. `src/App.jsx` concentra grande parte do app; o build passa, mas emitiu aviso de bundle principal acima de 500 kB.

Revalide cada ponto no código e no ambiente conectado. Atualize a lista se o estado tiver mudado.

## 3. Arquitetura gratuita recomendada

Use **Leaflet** para o mapa, com tiles de um provedor compatível e atribuição visível. Para piloto de baixo tráfego, `tile.openstreetmap.org` pode servir somente se a política oficial for seguida: referer/identificação, cache HTTP, sem pré-carregamento/offline e sem uso pesado. Deixe URL do provedor configurável. Não trate tiles públicos como infraestrutura garantida.

Use a **API gratuita da HeiGIT/openrouteservice** para:

- Pelias: transformar endereço em coordenadas e oferecer confirmação/ajuste manual do pino;
- Directions: calcular geometria da rota, distância e duração entre restaurante e destino;
- VROOM/Optimization: sugerir ordem de múltiplas paradas e, quando couber, distribuição entre motoboys;
- Matrix, se necessária e coberta pelo plano, para comparar tempos entre várias origens/destinos.

Para **CEP → endereço textual**, use [ViaCEP](https://viacep.com.br/) como opção gratuita inicial: consulte somente após 8 dígitos, preencha logradouro, bairro, cidade e UF, trate CEP inexistente/erro/indisponibilidade e permita correção manual. ViaCEP **não confirma número da casa nem gera uma coordenada exata**. Depois de unir CEP, logradouro, número e cidade/UF, geocodifique o endereço completo com HeiGIT Pelias e peça confirmação do pino no mapa. Use cache e evite consultas em massa. Se ViaCEP estiver fora do ar, mantenha preenchimento manual; uma alternativa como BrasilAPI só deve ser adotada após verificar regras e estabilidade atuais.

Confirme documentação, endpoints e cotas atuais. Os caminhos anunciados pelo provedor são `api.heigit.org/pelias/v1`, `api.heigit.org/openrouteservice/v2/directions` e `api.heigit.org/vroom/v0`. **Não usar `api.openrouteservice.org` como endpoint novo.** A FAQ oficial usa 2.000 requisições Directions/dia e 40/min como exemplo padrão, mas a quota efetiva da chave no painel deve prevalecer. Chave HeiGIT é segredo de servidor, nunca variável `VITE_*`; faça proxy via Supabase Edge Function ou backend equivalente, com autenticação, validação, cache, controle de taxa e tratamento explícito de 403/429/timeout. Não usar o Nominatim público para autocomplete de endereço.

Para motoboy de moto, documente que o perfil `driving-car` é uma aproximação de vias permitidas; confira se há perfil apropriado no serviço atual. O openrouteservice não oferece trânsito ao vivo. A frase correta para o usuário é “melhor rota estimada pelas vias e parâmetros disponíveis”, com ETA estimado e horário do cálculo.

Use `navigator.geolocation.watchPosition` no dispositivo do motoboy, mediante permissão e HTTPS. Persistir posição somente enquanto uma rota estiver ativa. Supabase Realtime pode avisar cliente e ADM sobre alterações autorizadas; preferir Broadcast privado quando fizer sentido para segurança/escala, ou publicar as tabelas necessárias para Postgres Changes com RLS. Em qualquer opção, testar entrega de eventos e fazer nova leitura do banco após reconexão. Mostrar horário e precisão da última posição; nunca animar posição fictícia.

O plano gratuito do Supabase tem cotas de banco, tráfego, Edge Functions e Realtime. Estime consumo por motoboy e por assinante, limite frequência de GPS, não recalcule rota a cada ponto e não guarde histórico de localização sem necessidade. Documente o ponto em que a operação deixa de caber no plano gratuito. Não prometa gratuidade ilimitada.

## 4. Modelo de dados e regras do servidor

Planeje e implemente migrações para:

- restaurante/origem configurável, endereço e coordenadas;
- perfil de cliente com nome completo, e-mail verificado pelo fluxo de Auth, telefone celular com DDD e preferências de contato. CPF do cliente somente se alguma função concreta exigir; se existir, normalizar, mascarar na interface e proteger no banco;
- endereços salvos de clientes com apelido (ex.: Casa/Trabalho), CEP, tipo e nome do logradouro, número obrigatório ou opção explícita "sem número", complemento opcional, bairro, cidade, UF, ponto de referência opcional, instruções de entrega opcionais, `lat`, `lng`, precisão/confirmação do pino e indicação de endereço padrão;
- snapshot do endereço e coordenadas no pedido, para que edições futuras não alterem entrega em andamento;
- eventos de pedido com estado, autor, horário e motivo;
- rota de entrega com motoboy, versão, geometria, distância, duração e status;
- paradas com tipo (retirada/entrega), pedido, sequência e ETA;
- última posição do motoboy com precisão, horário observado/recebido e vínculo com rota ativa;
- ocorrências de entrega e resolução;
- taxas, formas de pagamento e configurações necessárias ao checkout real.

Os nomes exatos podem ser ajustados, mas explique a escolha. Preservar e migrar pedidos existentes. Criar índices para consultas por pedido, motoboy, estado e rota. O servidor deve calcular total e validar itens/preços/disponibilidade; nunca aceitar total calculado somente no navegador.

Defina máquina de estados: recebido, aceito, preparando, pronto, atribuído, retirado, em rota, entregue; cancelado e ocorrência com regras próprias. Se algum estado atual tiver nome diferente, crie migração compatível. Toda transição deve ser transacional, idempotente quando necessário, registrada e permitida apenas ao papel correspondente. Bloqueie saltos indevidos, dupla atribuição e conclusão sem código.

Proteja o fluxo de códigos: o código de retirada deve ser apresentado por quem entrega o pedido na cozinha e verificado sem ser antecipado ao motoboy; o código de entrega deve ser apresentado pelo cliente e não lido antecipadamente pelo motoboy. Limite tentativas e não exponha código completo em logs.

Crie RLS de leitura/escrita para cada tabela e teste com JWT de cliente A, cliente B, motoboy A, motoboy B e ADM. Cliente vê somente pedido próprio e posição do motoboy ligada a esse pedido ativo. Motoboy escreve apenas a própria posição em rota ativa e lê apenas tarefas atribuídas. ADM/equipe vê apenas o necessário para operar. CPF/RG completo fica em schema privado.

## 5. Fluxos e telas a entregar

### Cliente

- Cadastro/login confiável, recuperação de acesso e edição do perfil. Solicitar nome completo, e-mail e telefone celular com DDD; validar formato e manter a informação atualizada. CPF: aceitar digitação/colagem de números e formatar `000.000.000-00`, verificando dígitos, quando for necessário no produto; armazenar versão normalizada e proteger. RG: aceitar o formato realmente definido para o cadastro de motoboys, considerando que certos documentos podem terminar em `X` e não há padrão nacional único. Não confundir formato com autenticidade. Aplicar validação consistente no cadastro pelo ADM.
- Permitir cadastrar, editar, escolher e excluir endereços próprios, com endereço padrão. Formulário de entrega separado em CEP `00000-000`, logradouro, número (ou "sem número"), complemento, bairro, cidade, UF, referência e instruções para localizar a entrega. Buscar CEP via ViaCEP após 8 dígitos, preencher campos disponíveis sem sobrescrever correções do cliente, permitir edição manual e explicar que número/complemento precisam ser informados pela pessoa. Geocodificar endereço completo, pedir confirmação/ajuste do pino e mostrar cobertura antes de fechar o pedido. Não considerar apenas o centro do CEP como porta do cliente.
- Cardápio real com disponibilidade, preço, descrição, quantidade, observações e carrinho preservado após falha. Checkout com entrega ou retirada, endereço estruturado, confirmação do ponto, cobertura, taxa e total antes de enviar. Evitar duplo clique e usar ID/idempotência. Salvar no pedido uma cópia do nome, telefone e endereço usados naquele momento, sem depender de futuras edições do perfil.
- Histórico de pedidos, detalhes, etapas com horários, entregador atribuído, rota real, posição com horário/precisão, ETA estimado, aviso de GPS desatualizado e código de confirmação apenas no momento apropriado. Pedido para retirada deve mostrar balcão, horário e código específico sem exigir endereço de entrega.

### Motoboy

- Perfil e veículo, disponibilidade online/offline, tarefas atribuídas e, se o modelo operacional permitir, aceitar/recusar ofertas. Mostrar primeiro o que deve ser retirado, depois o que está em transporte.
- Para cada tarefa: restaurante e endereço do cliente, complemento/referência, itens necessários, contato permitido, status, distância/ETA estimados e próxima ação clara.
- Mapa real com posição atual, origem, destino e rota; lista ordenada de paradas, possibilidade de abrir navegação externa e orientação quando GPS/internet falhar.
- Confirmar chegada/retirada com código da cozinha, registrar ocorrência, inserir código informado pelo cliente para concluir e encerrar compartilhamento de localização.

### ADM/equipe

- Central de pedidos com filtros reais por estado, tipo, motoboy, período, atraso e busca; paginação real. Destacar pedidos novos, prontos sem motoboy, aguardando retirada, em rota e com ocorrência.
- Atribuir motoboy disponível/elegível, ver sugestão de agrupamento e ordem de paradas por distância/tempo, aceitar ou ajustar sequência. Recalcular ao inserir/remover parada; indicar quando a rota estiver indisponível e permitir operação manual segura.
- Mapa operacional das entregas ativas, última posição com horário, destino, ETA, atrasos e contato operacional. Nunca exibir uma posição antiga como atual.
- Configurações persistidas para restaurante, horário, cobertura, taxas, formas de pagamento e notificações. Relatórios e clientes devem usar dados reais; remover indicadores fictícios em produção.

### UX geral

Manter o sistema visual do `DESIGN.md`, melhorando responsividade e acessibilidade. Campos de CPF, RG, telefone, CEP e placa devem aceitar entrada simples, aplicar máscara/normalização adequada, validar sem apagar o que a pessoa digitou e apontar erro junto ao campo. Criar estados de vazio, carregamento, sucesso confirmado, falha de rede, permissão GPS negada, endereço não encontrado, fora de cobertura, cota da API atingida, rota indisponível e reconexão. Botões visíveis precisam funcionar ou ser removidos. Datas em `pt-BR`, timestamps UTC no banco, e indicação de fuso na apresentação.

## 6. Pagamento e comunicação dentro do custo zero

Para primeira versão, ofereça pagamento na entrega e/ou Pix manual com conferência operacional, somente após definir regra de confirmação e status. Não descreva Pix manual como pagamento online automaticamente confirmado. Não integre gateway, SMS, WhatsApp Business API ou push pago sem verificar custo e autorização. Notificações dentro do aplicativo e e-mail/Push web devem usar apenas recursos gratuitos disponíveis e respeitar permissão do usuário. Documente qualquer dependência externa.

## 7. Ordem de implementação

**Fase 1 — Confiabilidade do pedido e banco:** corrigir falso sucesso, endereço, total, idempotência, estados, códigos, RLS e Realtime. Entregar fluxo cliente→ADM→motoboy sem mapa fictício.

**Fase 2 — Mapa e rota A→B:** restaurante e destino com coordenadas confirmadas; Leaflet; função proxy HeiGIT; linha real, distância e ETA; tratamento de cota/falha.

**Fase 3 — Rastreamento:** permissão GPS, posição do motoboy, acesso por papel, atualização privada, horário/precisão, reconexão, parada do compartilhamento e retenção.

**Fase 4 — Múltiplas paradas:** cálculo de sequência, atribuição/ajuste manual, recalcular, ocorrências e painel ADM.

**Fase 5 — Produto completo:** retirada pelo cliente, histórico, relatórios, configurações, filtros/paginação, UX e performance.

Se uma fase depender de chave ou configuração externa indisponível, complete código, testes com mocks e documentação da configuração; continue nas partes independentes. No fim, separe “testado com provedor real” de “preparado, aguardando chave/configuração”.

## 8. Testes obrigatórios e definição de pronto

Crie testes relevantes para regras de pedido, total, estados, códigos, autorização, máscaras e fallback da API. Execute `npm run build`. Valide em banco de QA ou no projeto correto, evitando alterar dados reais sem necessidade. Teste em dispositivos/sessões separados:

1. Cliente A cria pedido; erro mantém carrinho; sucesso gera um único ID e aparece para ADM.
2. CEP com 8 dígitos preenche somente os campos disponíveis; número continua exigido ou marcado "sem número"; CEP inexistente, ViaCEP fora do ar e endereço fora da área atendida têm mensagens e entrada manual. Pino confirmado corresponde ao endereço completo, não apenas ao centro do CEP.
3. ADM aceita, prepara, atribui Motoboy A e calcula restaurante→cliente. Motoboy B não vê o pedido.
4. Motoboy A confirma retirada com código da cozinha; código errado e etapa antecipada falham.
5. Cliente A e ADM veem GPS real e horário; Cliente B não vê via UI, API nem Realtime.
6. Duas entregas geram sequência revisável; mudança recalcula rota sem perder pedidos.
7. Perda de internet, GPS negado, tela bloqueada e retorno ao app exibem estado honesto e recuperam dados quando possível.
8. Código do cliente conclui entrega; GPS para e histórico registra horário/autor.
9. Pedido de retirada pelo cliente não entra em rota de motoboy.
10. Relatórios e configurações mostram dados persistidos, filtros/paginação funcionam e nenhum botão simula sucesso.

## 9. Documentação obrigatória em `Doc/`

Esta pasta já contém arquivos iniciais. **Atualize-os conforme o código entregue**, em vez de criar uma documentação única e genérica:

- `Doc/README.md`: índice, estado atual e orientação de manutenção;
- `Doc/arquitetura.md`: diagrama, decisões, componentes e fluxo de dados;
- `Doc/banco-de-dados.md`: tabelas, colunas, índices, migrações, RPCs, estados e RLS;
- `Doc/apis-e-custos.md`: provedor, endpoint, chave, cotas verificadas, atribuição, cache, custos e alternativas;
- `Doc/integracoes.md`: Supabase, HeiGIT, GitHub, deploy, variáveis e configuração passo a passo;
- `Doc/ux-e-fluxos.md`: jornadas e regras de tela por papel;
- `Doc/seguranca-e-privacidade.md`: documentos, códigos, localização, acesso e retenção;
- `Doc/testes-e-aceite.md`: cenários reproduzíveis e resultados obtidos.

Acrescente documentação específica quando necessário, por exemplo `Doc/operacao.md` (como resolver entrega sem GPS) e `Doc/deploy.md` (publicação/rollback). Nunca inclua segredo ou dado pessoal nos exemplos. Documente o que realmente está implementado e marque claramente o que ainda é proposta.

## 10. Entrega final

Conclua o máximo possível autonomamente e **suba o resultado para o repositório privado indicado** usando a sessão autorizada. Verifique remotamente a branch, o commit e os arquivos publicados, inclusive `Doc/`. Se o único bloqueio for a autenticação privada, reporte-o como pendência concreta de publicação e não declare a tarefa publicada. No relatório final, liste: funcionalidades implementadas; arquivos e migrações; testes e evidências; URL/branch/commit publicados; configuração externa que o responsável ainda precisa realizar; cotas e limitações gratuitas; itens realmente pendentes. Não chame de funcional algo que só aparece no modo de demonstração ou em um mapa ilustrativo.

## Referências para conferir no momento da execução

- Leaflet: https://leafletjs.com/
- Política de tiles OSM: https://operations.osmfoundation.org/policies/tiles/
- Política Nominatim: https://operations.osmfoundation.org/policies/nominatim/
- FAQ e cotas openrouteservice: https://giscience.github.io/openrouteservice/v9.10.0/frequently-asked-questions
- Endpoints HeiGIT: https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912
- Supabase Realtime: https://supabase.com/docs/guides/realtime/subscribing-to-database-changes
- Supabase Free: https://supabase.com/pricing
- GPS web: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/watchPosition
- ViaCEP: https://viacep.com.br/
