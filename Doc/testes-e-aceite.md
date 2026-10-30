# Testes e aceite

## Executado em 30/10/2026

- `npm test`: 7 testes passaram (máscaras, placa do veículo, completude do endereço, invalidação de pino após alteração, cobertura, ViaCEP encontrado/indisponível, erro da função de mapa).
- `npm run build`: passou sem aviso de chunk acima de 500 kB. Bundle principal ~340 kB, Supabase ~224 kB e mapa ~156 kB, em chunks separados.
- Migrações aplicadas no Supabase conectado e tabelas novas/RLS/publicação Realtime inspecionadas. `lusky_orders` e `lusky_driver_locations` estão na publicação. Escrita direta em pedido e leitura direta de códigos foram revogadas; RPC antiga de checkout não é executável por `authenticated`.
- Edge Function `lusky-maps` implantada, versão 2, JWT obrigatório. Falta chave HeiGIT, portanto chamadas reais a Pelias, Directions e VROOM não foram executadas.
- Em 30/10/2026, a aba local `localhost:5173` permitiu inspeção do painel em viewport móvel e desktop. Foram abertas Central de pedidos, detalhes de pedido legado, Clientes, Relatórios, Configurações, editor de prato, formulário de entrega do ADM e prévia do cliente, sem gravar dados. A inspeção revelou e corrigiu texto ilegível sobre fundos escuros e erro de runtime no mapa causado por JSX sem import do React. O pedido legado sem coordenadas passou a mostrar fallback honesto. A rota real, o GPS e a criação de pedido ainda exigem ensaio ponta a ponta com chave/configuração e contas QA.
- Na Central conectada, filtros de status e busca por `LF-1` retornaram respectivamente zero e um pedido, com contagem do servidor. A consulta usa `range` de 20 linhas; navegação para página 2 ainda não pôde ser observada porque o projeto tem um pedido.
- Em transações SQL revertidas, JWTs simulados para cliente dono/sem vínculo, motoboy atribuído/sem vínculo e equipe retornaram, respectivamente, 1/0/1/0/1 pedido visível. Eventos seguiram o mesmo vínculo.
- Em outra transação revertida, uma rota e uma posição GPS temporárias foram ligadas ao pedido ativo. Cliente A e motoboy A viram 1 rota e 1 posição cada; cliente B e motoboy B viram 0/0. Após `ROLLBACK`, o banco manteve 0 rotas, 0 posições e o pedido real em `Pronto`. Isso valida as leituras SQL com JWT simulado, ainda sem comprovar entrega de eventos Realtime entre sessões reais.
- Uma retirada de QA dentro de transação revertida confirmou ID idempotente, total do catálogo apesar de preço adulterado no corpo, e ausência de rota. Código de cozinha errado retornou `false`, conclusão antecipada foi recusada, cliente não obteve código da cozinha e motoboy não obteve código do cliente. Após `ROLLBACK`, permaneceram um pedido, três eventos e zero falhas de código persistidas.
- Pix manual foi testado em transação revertida: pedido começou `pending`, Novo pedido→Preparando falhou, equipe confirmou via RPC, a transição passou e o estado final temporário foi `confirmed`/`Preparando`. Após `ROLLBACK`, continuou um pedido, Pix desativado e nenhuma instrução de teste salva.
- Prévia do cliente foi aberta no navegador: prato entrou no carrinho, campo de observações apareceu e o item de teste foi removido sem enviar pedido. Histórico expansível ainda precisa de ensaio com conta cliente real.
- A resposta atrasada de geocodificação agora é ignorada quando o endereço muda durante a busca. O preenchimento automático de campos por CEP invalida um pino previamente confirmado; esse comportamento ainda precisa de ensaio visual com chave HeiGIT configurada.
- Foi incluída marcação manual do destino no mapa, iniciada no pino do restaurante com clique obrigatório no destino, e localização da origem por GPS ou coordenadas digitadas. Validação de limites de latitude/longitude entrou nos testes; a marcação manual ainda precisa de ensaio com endereço real.
- A equipe abriu “Minha conta” no navegador móvel; cabeçalho, dados pessoais, alteração de senha e botão de saída renderizaram com contraste. A prévia do cliente mostrou atalhos “Minha conta”/“Sair da prévia” e bloqueou edição de dados pessoais e senha. Salvamento de perfil, troca de senha e veículo não foram acionados na conta real durante a inspeção. Teste automatizado verifica normalização/validação de placa; persistência do veículo precisa de sessão QA de motoboy.
- Em transação SQL revertida, um JWT simulado do motoboy atualizou 1 linha do próprio veículo (mesmo valor); outro usuário, simulando papel motoboy, atualizou 0 linhas. O teste confirma a política de escrita por proprietário da linha, sem alterar o veículo persistido.
- Nova regra de telefone: o formulário de cadastro pede celular com DDD para cliente e motoboy; a criação/edição pelo proprietário e a Edge Function também validam 11 dígitos. A migração `20261030022000` foi aplicada. Em transação SQL revertida, a criação de usuário sem telefone foi recusada e uma criação com telefone mascarado gravou `11987654321` no perfil. `lusky-admin-users` versão 4 está ativa com JWT obrigatório. As 3 contas anteriores ainda não tinham celular cadastrado; cada titular deve preenchê-lo em “Minha conta”.

## Pendente para aceite operacional

Use contas e aparelhos de QA, sem alterar pedidos reais:

1. Cliente A pede Entrega com pino confirmado. Simule erro de rede: carrinho fica; repita com mesmo ID e confirme um único pedido. Confira total no servidor.
2. ViaCEP válido, inexistente e indisponível; número obrigatório ou sem número; origem configurada e destino dentro/fora do raio.
3. Equipe prepara e atribui motoboy A; motoboy B e cliente B não conseguem ler pedido, rota ou GPS por UI/API/Realtime.
4. Cozinha apresenta código; código errado e etapa antecipada falham; A confirma retirada.
5. Em Android/iOS HTTPS, A autoriza GPS. Cliente A e equipe veem horário e precisão; depois de 2 min sem dados a interface mostra posição desatualizada.
6. Duas entregas prontas para A recebem sugestão VROOM, ajuste manual e sequência persistida.
7. Desligue internet, negue GPS, bloqueie tela e retorne. Confira aviso honesto e recuperação de leitura.
8. Cliente informa código; A conclui e o compartilhamento para. Verifique evento e remoção da última posição.
9. Retirada no balcão não cria rota nem exige endereço.
10. Configuração persiste; filtros, relatórios e clientes usam dados de pedidos.

Esses cenários ponta a ponta ainda não passaram. Os JWTs simulados verificam regras SQL, mas não substituem sessões reais ou entrega Realtime entre aparelhos. Aceite de produção depende de chave HeiGIT, origem real, HTTPS, contas QA, validação de RLS e Realtime por API, teste de pagamentos e revisão de retenção/consentimento.
