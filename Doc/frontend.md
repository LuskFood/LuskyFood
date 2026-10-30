# Frontend e estrutura de pastas

## Aplicação

O frontend usa React 19 e Vite. `src/main.jsx` inicializa a interface e `src/App.jsx` compõe navegação, sessão, visão de operação e áreas por perfil. Os componentes usam estado React e CSS existente; dados de demonstração ficam no navegador, separados da sessão conectada.

## Áreas principais

| Arquivo | Responsabilidade |
|---|---|
| `src/App.jsx` | Casca autenticada, navegação administrativa, resumo do restaurante e gestão de motoboys/usuários. |
| `src/OperationsPages.jsx` | Central de pedidos, perfil e lista de clientes, relatórios e agregações visuais. |
| `src/CustomerPortal.jsx` | Cardápio, carrinho, endereços, pedidos e conta do cliente. |
| `src/RiderPortal.jsx` | Disponibilidade, entregas atribuídas, códigos, mapa e localização do motoboy. |
| `src/RestaurantSettings.jsx` | Configurações do restaurante e origem de retirada. |
| `src/DeliveryAddress.jsx` | Formulário e confirmação do endereço de entrega. |
| `src/DeliveryMap.jsx` | Apresentação Leaflet de pontos e rotas disponíveis. |
| `src/AdminOrderModal.jsx` | Detalhes ampliados do pedido para a operação. |
| `src/ProductEditor.jsx` | Edição de prato do cardápio. |
| `src/styles.css` | Tokens visuais e estilos compartilhados e responsivos. |
| `src/demoData.js` | Registros fictícios exclusivos da demonstração local. |
| `src/analytics.js` | Agregações de períodos e categorias dos relatórios. |

## Padrão visual

A identidade usa amarelo `#FFC21A`, carvão `#15120F`, vermelho `#F0472B` e superfícies quentes. Em listas operacionais, prefira colunas alinhadas em desktop e cartões completos em telas estreitas. Preserve foco visível, estados de carregamento/erro/vazio e a semântica dos botões. Valores demonstrativos devem continuar identificados como fictícios.

## Dados e limites

Os componentes recebem pedidos, clientes derivados dos pedidos e motoboys pelas propriedades e callbacks existentes. Esta camada visual não deve alterar consultas, políticas RLS, autenticação ou regras de transição. A Central de pedidos acessa páginas remotas quando conectada; os dados disponíveis para listagem de clientes e históricos ainda dependem do carregamento que existe no serviço. O histórico completo paginado e novas integrações estão reservados à etapa seguinte.

A atribuição de um entregador de demonstração é somente local. Documentos fictícios servem apenas para visualizar a interface e jamais significam validação de identidade. Consulte [Arquitetura](arquitetura.md), [UX e fluxos](ux-e-fluxos.md) e [Segurança](seguranca-e-privacidade.md).
