# Testes e aceite

## Executado em 30/10/2026

- `npm test`: 5 testes passaram (máscaras, completude do endereço, cobertura, ViaCEP encontrado/indisponível, erro da função de mapa).
- `npm run build`: passou. O bundle principal ainda emite aviso acima de 500 kB (~560 kB); mapa é carregado separadamente.
- Migrações aplicadas no Supabase conectado e tabelas novas/RLS/publicação Realtime inspecionadas. `lusky_orders` e `lusky_driver_locations` estão na publicação. Escrita direta em pedido e leitura direta de códigos foram revogadas; RPC antiga de checkout não é executável por `authenticated`.
- Edge Function `lusky-maps` implantada, versão 2, JWT obrigatório. Falta chave HeiGIT, portanto chamadas reais a Pelias, Directions e VROOM não foram executadas.
- A tentativa de abrir o Vite no navegador local falhou por isolamento de loopback deste ambiente; a revisão visual e interação das telas não foram validadas.

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

Esses cenários ponta a ponta ainda não passaram. Aceite de produção depende de chave HeiGIT, origem real, HTTPS, contas QA, validação de RLS e Realtime, teste de pagamentos e revisão de retenção/consentimento.
