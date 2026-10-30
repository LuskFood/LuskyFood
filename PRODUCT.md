# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Administrador:** administra a operação completa da Lusky Food.
- **Cliente:** cria uma conta para consultar o cardápio, fazer pedidos e acompanhar o próprio pedido, incluindo o trajeto da entrega.
- **Motoboy:** consulta as entregas atribuídas e a sequência de rota; a equipe confirma a retirada e o motoboy confirma a entrega com o código do cliente.

## Product Purpose

A Lusky Food é um sistema web para operar um restaurante, receber pedidos online e coordenar entregas. O objetivo é dar à administração uma visão unificada da operação, facilitar compras e acompanhamento para clientes e orientar motoboys nas entregas. O usuário definiu sucesso como organizar pedidos e reduzir erros, melhorar o acompanhamento de vendas e estoque e aumentar as vendas online. Não foram definidos indicadores numéricos.

## Operating Context

- O administrador gerencia as informações e a operação do restaurante.
- O cliente precisa se cadastrar. Seu acesso se limita ao cardápio e aos próprios pedidos.
- O pedido passa pelas fases de recebimento, produção, entrega com acompanhamento no mapa e finalização.
- Quando o pedido está pronto, a equipe confere o número e o motoboy atribuído e confirma a retirada. Na entrega, o cliente fornece seu código ao motoboy.
- O motoboy vê os dados do cliente necessários para a entrega e a ordem de rota que lhe foi atribuída.

## Capabilities and Constraints

- Os três papéis são Administrador, Cliente e Motoboy, com acessos diferentes conforme suas responsabilidades.
- O administrador tem acesso à gestão completa; clientes consultam o próprio pedido; motoboys consultam as entregas atribuídas.
- O projeto existente usa React e Vite, com Supabase configurado por variáveis de ambiente. Os valores das credenciais não fazem parte deste documento.
- O projeto tem um modo de demonstração local. Ele não substitui contas reais do Supabase e não sincroniza os dados demonstrativos com o banco.
- A interface administrativa atual já contém visões de vendas, pedidos, cardápio, clientes e relatórios com dados de demonstração. Cadastro de cliente, acompanhamento do mapa e fluxo do motoboy ainda precisam ser implementados.
- O provedor do mapa, a fonte e o método de atualização da localização do motoboy e quem define ou otimiza a ordem das rotas estão em aberto.
- O meio de pagamento online, eventuais taxas de entrega e o método de cálculo do estoque também estão em aberto.

## Brand Commitments

- Nome: **Lusky Food**.
- O usuário pediu uma interface tecnológica e escolheu as peças de divulgação como referência: base escura, amarelo forte e vermelho para sinalizar etapas, com fotografia natural dos pratos.
- Os quatro pratos principais atuais são Frango Xadrez (R$ 50), Sobá (R$ 45), Yakisoba (R$ 50) e Kibe Cru (R$ 50). Novos pratos devem aceitar foto enviada ou ícone da plataforma.

## Evidence on Hand

- As definições de público e fluxo acima foram fornecidas pelo usuário nesta conversa.
- O código em `src/App.jsx` demonstra as três experiências de usuário com pedidos locais de exemplo. Os pedidos, clientes, vendas e rotas demonstrativos não são prova de operação real.
- Os documentos anexados originalmente descrevem o Portal de Férias, não um restaurante. Eles não estabelecem requisitos de pedidos, entregas, mapas ou pagamento para a Lusky Food.
- Não há dados reais de clientes, localização, entregas ou vendas confirmados neste projeto.

## Product Principles

- Cada papel acessa as informações e ações necessárias ao seu trabalho.
- Clientes acompanham o andamento do próprio pedido do recebimento à entrega.
- A equipe confirma a retirada; o cliente fornece ao motoboy o código individual de entrega.
- A operação precisa ajudar a administração a reduzir erros e melhorar o controle de pedidos, vendas e estoque.
