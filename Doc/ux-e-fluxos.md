# UX e fluxos operacionais

## Cliente

Cadastro com nome, e-mail e celular; confirmação de e-mail segue configuração do Auth. Login e recuperação por e-mail. Perfil editável. Cardápio do banco com preço/disponibilidade, carrinho em sessão e pedido de Entrega ou Retirada. Falha na RPC mantém carrinho e identificador idempotente; sucesso confirmado limpa carrinho. Endereço: ViaCEP após 8 dígitos, campos editáveis, geocodificação do endereço completo, ajuste e confirmação de pino, cobertura e taxa antes de enviar. Endereços salvos podem ser editados, escolhidos, excluídos e definidos como padrão. Histórico e pedido ativo exibem etapa, valor, rota planejada e GPS observado com horário/precisão quando existe. Código de entrega só aparece na etapa Saiu para entrega.

## Motoboy

Disponibilidade on/off, lista de entregas atribuídas, mapa com origem/destino/rota, navegação externa e sequência, endereço e contato operacional. Código de retirada é informado pela cozinha; o motoboy o digita. Cliente informa o segundo código na chegada. GPS requer permissão e HTTPS; a tela indica erro ou posição antiga e para ao fim da rota. Ocorrências são registradas para equipe resolver.

## Equipe

Central filtra e pesquisa pedidos, atribui motoboy ativo, altera etapas permitidas, apresenta código da cozinha e acompanha posição observada. A sugestão VROOM para 2–8 pedidos do mesmo motoboy pode ser revisada e salva em `route_order`. Relatórios, resumo e clientes usam pedidos reais. Configurações persistem origem, raio, taxa e formas de pagamento. Paginação na interface opera sobre pedidos carregados em blocos de 500; não é paginação de servidor.

## Limites de interface

Rota e ETA são estimativas com horário do cálculo; GPS mostra horário observado e fica desatualizado após 2 min. Sem chave HeiGIT e origem configurada, entrega com pino novo não pode ser concluída; retirada continua disponível. Pix manual só aparece quando ativado pela equipe e exige conferência fora do aplicativo. A experiência de pagamento manual ainda não tem estado próprio de confirmação.
