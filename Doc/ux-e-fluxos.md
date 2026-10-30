# UX e fluxos operacionais

## Cliente

Cadastro com nome, e-mail e celular; confirmação de e-mail segue configuração do Auth. Login e recuperação por e-mail. Perfil editável. Cardápio do banco com preço/disponibilidade, carrinho e observações por prato preservados na sessão, e pedido de Entrega ou Retirada. Falha na RPC mantém carrinho, observações e identificador idempotente; sucesso confirmado os limpa. Endereço: ViaCEP após 8 dígitos, campos editáveis, geocodificação do endereço completo ou escolha manual no mapa a partir da origem configurada, ajuste e confirmação de pino, cobertura e taxa antes de enviar. Na escolha manual, é obrigatório tocar no destino antes de confirmar. Endereços salvos podem ser editados, escolhidos, excluídos e definidos como padrão. Histórico expansível mostra itens, endereço usado, pagamento e eventos com horário; pedido ativo exibe rota planejada e GPS observado com horário/precisão quando existe. Código de entrega só aparece na etapa Saiu para entrega.

## Motoboy

Disponibilidade on/off, lista de entregas atribuídas, mapa com origem/destino/rota, navegação externa e sequência, endereço e contato operacional. Código de retirada é informado pela cozinha; o motoboy o digita. Cliente informa o segundo código na chegada. GPS requer permissão e HTTPS; a tela indica erro ou posição antiga e para ao fim da rota. Ocorrências são registradas para equipe resolver.

## Equipe

Central consulta filtros, busca e páginas de 20 pedidos no servidor; inclui período e pedidos há mais de 45 minutos sem conclusão. Atribui motoboy ativo, altera etapas permitidas, apresenta código da cozinha e acompanha posição observada. A sugestão VROOM para 2–8 pedidos do mesmo motoboy pode ser revisada e salva em `route_order`. Relatórios, resumo e clientes usam pedidos reais, ainda agregados no navegador. Configurações persistem origem com pino confirmado no formulário, raio, taxa e formas de pagamento. O pino pode vir da geocodificação, do GPS do aparelho no restaurante ou de latitude/longitude informadas manualmente.

## Limites de interface

Rota e ETA são estimativas com horário do cálculo; GPS mostra horário observado e fica desatualizado após 2 min. Sem chave HeiGIT, é possível confirmar pinos manualmente e registrar pedidos, mas a rota automática, a distância pelas vias e o ETA não são calculados; retirada continua disponível. Pix manual só aparece com instruções configuradas pela equipe, começa pendente e deve ser conferido no canal financeiro antes do botão “Confirmar Pix conferido”. O preparo fica bloqueado até essa confirmação; não há gateway ou verificação automática.
