---
name: Lusky Food
description: Cozinha e entregas organizadas em uma rota clara, com a comida no centro.
colors:
  charcoal: "#15120f"
  charcoal-deep: "#0c0b09"
  charcoal-panel: "#211e19"
  paper: "#f4f0e8"
  warm-white: "#f6f2e9"
  ink: "#201b14"
  muted: "#aaa297"
  divider: "#38322b"
  yellow: "#ffc21a"
  red: "#f0472b"
  amber: "#b57411"
  white-card: "#fffdf8"
typography:
  display:
    fontFamily: "Barlow Condensed, Manrope, sans-serif"
    fontSize: "52px"
    fontWeight: 700
    lineHeight: 0.91
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Manrope, sans-serif"
    fontSize: "23px"
    fontWeight: 750
    lineHeight: 1.25
    letterSpacing: "-0.8px"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 400
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "9px"
    fontWeight: 700
    letterSpacing: "0.11em"
rounded:
  sm: "5px"
  md: "8px"
  lg: "13px"
  hero: "18px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "39px"
components:
  button-primary:
    backgroundColor: "{colors.yellow}"
    textColor: "{colors.charcoal}"
    rounded: "{rounded.md}"
    padding: "13px 17px"
    typography: "body"
  button-admin:
    backgroundColor: "{colors.charcoal-panel}"
    textColor: "{colors.warm-white}"
    rounded: "7px"
    padding: "0 13px"
    height: "36px"
  card-menu:
    backgroundColor: "{colors.white-card}"
    rounded: "{rounded.lg}"
    padding: "0"
  card-route-active:
    backgroundColor: "#fffaf0"
    rounded: "10px"
    padding: "19px 12px"
---

# Design System: Lusky Food

## Overview

**Creative North Star: “Rota da cozinha”**

A cozinha e a entrega compartilham uma sequência visível: o pedido avança por etapas nomeadas, e cada papel entende onde está e qual ação vem a seguir. A identidade reúne superfícies carvão, amarelo elétrico e vermelho pontual com uma camada de papel quente nos espaços de cardápio e acompanhamento.

A operação administrativa usa rótulos compactos e agrupamentos densos; a experiência do cliente dá mais espaço às fotografias naturais dos pratos; a do entregador destaca a próxima parada, a rota ordenada e o código correspondente à etapa. Os três modos mantêm a mesma linguagem de estados e comida, adaptada a cada contexto.

**Key Characteristics:**
- Carvão, amarelo vivo e vermelho para identificar marca e estado.
- Papel quente e texto escuro nas superfícies de cliente e rota.
- Fotografia natural de comida como principal elemento emocional.
- Etapas operacionais nomeadas e fáceis de localizar.

## Colors

O carvão cria foco, o papel quente abre espaço para leitura, e amarelo e vermelho distinguem ação e urgência.

### Primary
- **Amarelo elétrico** (#ffc21a): ação primária, item ativo da navegação, códigos e destaques da marca.
- **Vermelho de entrega** (#f0472b): pinos de parada e sinalização de entrega/urgência.

### Secondary
- **Âmbar de cozinha** (#b57411): ênfases de títulos e detalhes sobre superfícies claras.

### Neutral
- **Carvão** (#15120f): fundo de áreas de trabalho e blocos de marca.
- **Carvão profundo** (#0c0b09): navegação escura.
- **Carvão de painel** (#211e19): superfícies elevadas no modo operacional.
- **Papel quente** (#f4f0e8): base dos portais de cliente e entregador.
- **Marfim** (#f6f2e9): texto principal em fundos escuros.
- **Tinta** (#201b14): texto principal em fundos claros.
- **Papel branco** (#fffdf8): cartões de prato, rota e mapa.
- **Cinza quente** (#aaa297): informação secundária sobre fundos escuros.
- **Divisor carvão** (#38322b): linhas e bordas sobre carvão.

**Regra da rota ativa.** Amarelo marca a ação ou etapa ativa; vermelho fica reservado para sinalização de entrega e urgência.

## Typography

**Display Font:** Barlow Condensed (com Manrope e sans-serif como fallback)
**Body Font:** DM Sans (com sans-serif como fallback)
**Label/Mono Font:** DM Sans; números de código usam Barlow Condensed.

**Character:** Barlow Condensed dá presença a títulos de rota e códigos. DM Sans mantém leitura rápida em formulários, etapas e informação operacional.

### Hierarchy
- **Display** (700, 52px, line-height .91): chamada principal do entregador; reduz para 45px e 38px em telas menores.
- **Headline** (750, 23px, line-height 1.25): títulos administrativos; cabeçalhos de cliente e entregador usam escalas maiores próprias.
- **Title** (700, 26px): título da lista de rota.
- **Body** (400, 12px): descrições e texto de leitura nos portais.
- **Label** (700, 9px, tracking .11em, caixa alta): rótulos de rota e turno.

**Regra de leitura.** Use rótulos pequenos para metadados; nomes de prato, títulos e próxima ação devem manter destaque maior.

## Layout

O painel administrativo reserva 248px para a navegação lateral em telas largas, com conteúdo limitado a 1440px. Em até 1100px, a lateral encolhe para 220px; em até 760px, vira gaveta e o conteúdo ocupa a largura disponível. O grid do painel usa quatro indicadores, painéis em duas colunas e cartões de produto; abaixo de 760px os blocos se reorganizam em uma coluna ou duas conforme a tarefa.

Os portais de cliente e entregador usam largura máxima de 1260px e margens fluidas (`clamp(20px, 5vw, 70px)`). O menu usa cartões de prato em grade; o acompanhamento apresenta quatro etapas em linha; o entregador vê lista e mapa lado a lado, com o mapa fixo durante a rolagem em telas largas. Em até 780px, os portais passam a uma coluna e o mapa segue acima da lista. Em até 480px, cartões e etapas reduzem densidade e os campos de código empilham.

## Elevation & Depth

A profundidade combina contraste tonal e sombra suave. Cartões operacionais usam uma sombra ambiente discreta; o hero do cliente e o mapa recebem sombra mais ampla; diálogos e notificações usam sombra forte para separação. Bordas continuam visíveis para definir cartões em fundos de papel.

### Shadow Vocabulary
- **Painel administrativo** (`0 2px 12px rgba(28,40,33,.035)`): separação quase imperceptível dos cartões claros do painel.
- **Hero do cliente** (`0 16px 40px #291d1230`): destaca o bloco de abertura escuro.
- **Diálogo** (`0 20px 70px #0003`): separa modal do conteúdo atrás dele.
- **Mapa e pinos** (`0 4px 9px #30230f55`): mantém os marcadores legíveis sobre o mapa ilustrado.

## Shapes

A linguagem usa retângulos arredondados para controles e cartões, com cartões de prato e mapa mais amplos (13px) e hero com 18px. Linhas finas delimitam grupos; campos e botões preservam contornos simples. O símbolo da marca inclina levemente e o mapa usa linhas e marcadores circulares para representar a sequência.

## Components

### Buttons

Ação direta e de alto contraste.
- **Shape:** cantos de 8px nos botões amarelos e 7px nos controles administrativos.
- **Primary:** amarelo (#ffc21a), texto carvão, padding 13px 17px e peso 750.
- **Admin primary:** carvão de painel com texto marfim, altura 36px e padding horizontal 13px.
- **Hover / Focus:** hover escurece o botão administrativo ou move o amarelo conforme a transição existente; foco visível usa contorno amarelo de 2px com afastamento de 3px.
- **Secondary:** fundo branco, texto cinza escuro e borda clara.

### Chips

Rótulos compactos para estado e contagem.
- **Style:** fundos de tom claro com texto colorido por etapa; pílula com raio de 5px e padding compacto.
- **State:** amarelo identifica seleção ou etapa ativa; vermelho é reservado a entrega/urgência.

### Cards / Containers

Cartões de operação e comida têm presença distinta.
- **Corner Style:** painel administrativo 9px; prato e mapa 13px; hero 18px.
- **Background:** cartão de prato em branco quente; painel operacional em carvão; área de trabalho em papel quente.
- **Shadow Strategy:** sombra leve no painel e mais ampla no hero, mapa e modal.
- **Border:** borda fina taupe em papel e carvão em superfícies escuras.
- **Internal Padding:** cartões administrativos em torno de 13–17px; painel de rota ativa com 12px lateral.

### Inputs / Fields

Campos discretos, com foco visível.
- **Style:** fundo branco quente em portais, fundo carvão em modais escuros, borda taupe, raio de 6px.
- **Focus:** contorno amarelo de 2px com afastamento de 3px.
- **Error / Disabled:** erro usa fundo rosa claro e texto vermelho queimado; controles desativados reduzem opacidade.

### Navigation

A navegação administrativa é fixa em telas largas, com fundo carvão profundo e item ativo amarelo. Em celular abre como gaveta com camada de fundo. Navegação dos portais fica no cabeçalho escuro; links mudam para amarelo no hover.

### Rota de entrega

A rota mostra paradas em ordem com conexão vertical. A próxima parada recebe fundo marfim, borda âmbar e destaque lateral; os códigos aparecem em faixa amarela ou creme conforme a etapa. O mapa é ilustrado e informa que não representa GPS ao vivo.

## Do's and Don'ts

### Do:
- **Do** mantenha carvão, amarelo, vermelho e papel quente nas superfícies principais.
- **Do** use fotos naturais dos pratos como foco visual do cardápio.
- **Do** mantenha a ordem das paradas e a etapa atual visíveis.
- **Do** destaque a próxima ação com amarelo e rótulo direto.
- **Do** use Barlow Condensed para títulos expressivos de rota e números de código.

### Don't:
- **Don't** apresente o mapa ilustrado como rastreamento GPS ao vivo.
- **Don't** misture a linguagem verde clara do estilo administrativo anterior com a paleta atual carvão/amarelo/vermelho.
- **Don't** use cópia promocional ou números de telefone dos folhetos de referência.
- **Don't** transforme metadados operacionais em títulos com o mesmo peso visual dos pratos ou da próxima etapa.
