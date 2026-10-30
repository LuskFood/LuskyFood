# Operação diária

1. Configure restaurante, raio, taxa e pagamento antes de habilitar Entrega. Sem coordenadas confirmadas para a origem, aceite apenas Retirada. Sem chave HeiGIT, use GPS no restaurante ou latitude/longitude, confirme o pino e peça ao cliente que marque o destino manualmente no mapa. Nesse caso, não há rota/ETA automáticos; confira endereço e use navegação externa para a viagem.
2. Na Central, acompanhe pedidos Novos, Preparando, Prontos e em rota. Atribua motoboy ativo com documento válido. Se a sugestão de sequência falhar, ajuste a ordem manualmente.
3. Com o frontend novo, a equipe confere o pedido e o motoboy atribuído e confirma a retirada. O cliente informa seu código de entrega ao motoboy apenas quando recebe a sacola. Cinco erros bloqueiam novas tentativas por 15 minutos. A migração correspondente está aplicada no Supabase; publique/ative o frontend compatível antes de operar o fluxo. Consulte [Etapa 2](etapa-2-entregas.md).
4. Se GPS for negado, antigo ou indisponível, a equipe contata o motoboy pelo canal operacional e registra ocorrência. A rota desenhada é planejamento; não representa a posição do motoboy.
5. Se o mapa ou a internet falhar, o pedido continua no banco. Não marque Entregue sem código do cliente. Na recuperação, recarregue a tela e confira estado e horário.
6. Para ativar Pix manual, cadastre instruções comerciais na Configuração. O pedido fica pendente; confira o recebimento no canal financeiro e use “Confirmar Pix conferido” na Central. O sistema só libera o preparo depois disso. Não informe pagamento como confirmado automaticamente.

[← Índice da documentação](README.md) · [Desenvolvimento local](desenvolvimento-local.md) · [Frontend](frontend.md)
