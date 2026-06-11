# Handoff: Visual "Almanaque do Mundial" — Bolão da Copa 2026

## Para quem vai implementar (leia primeiro)

Os arquivos `.html` deste pacote são **referências de design** — protótipos feitos em HTML/CSS que mostram a aparência e o comportamento pretendidos. **Não copie o HTML para dentro do app.** A tarefa é **recriar esse visual no projeto Next.js existente**, usando os componentes React/rotas que já existem e o Tailwind v4 que já está configurado.

O projeto-alvo é um **Next.js App Router + Tailwind v4 + Prisma**. As funcionalidades já estão prontas e **não devem ser alteradas** — este handoff é puramente de **camada visual** (cores, tipografia, layout, componentes de UI). Mantenha toda a lógica de dados, sessão e server components como está; troque apenas a marcação/estilo.

## Fidelidade

**Alta fidelidade (hifi).** Cores, tipografia, espaçamentos e estados são definitivos. Recrie pixel a pixel usando as classes/utilitários do Tailwind e/ou as classes utilitárias fornecidas em `bolao.css`. Os valores exatos estão na seção **Design Tokens**.

---

## Sistema visual (resumo)

Tema "almanaque esportivo retrô" — clima de álbum de figurinhas / revista de Copa antiga.

- **Papel creme** (claro) e **verde-meia-noite** (escuro), com textura de grão e pontilhado de fundo.
- **Títulos em serifa editorial** (Libre Caslon Display), **rótulos** em Archivo caixa-alta com tracking, **números/placares/dados** em Space Mono ou Libre Caslon.
- Paleta **verde-gramado + dourado de troféu**, com vermelho-tijolo de acento.
- Elementos gráficos recorrentes: **selos/medalhões** (rosetas douradas), **estrelas ★**, **cards com sombra sólida deslocada** (sem blur), **perfurações de ingresso**, **escudos-figurinha** (bandeiras em CSS dentro de um círculo com borda + anel de papel).
- **Tema claro/escuro** alternável, persistido em `localStorage` sob a chave `bolao-theme`, aplicado via atributo `data-theme="light|dark"` no `<html>`.

---

## Mapa: mockup → rota no seu app

| Arquivo de referência | Rota / arquivo do app a estilizar |
|---|---|
| `Bolão 2026 - Jogos.html` | `app/(app)/page.tsx` (home / lista de jogos) |
| `Bolão 2026 - Classificação.html` | `app/(app)/classificacao/page.tsx` (grupos) + `app/(app)/torneio/` (chaveamento) |
| `Bolão 2026 - Palpites.html` | `app/(app)/palpites/PredictionsEditor.tsx` |
| `Bolão 2026 - Copa.html` | `app/(app)/torneio/TournamentEditor.tsx` (palpites de bônus: campeão, vice, artilheiro, craque, zebra) |
| `Bolão 2026 - Ranking.html` | `app/(app)/ranking/page.tsx` |
| `Bolão 2026 - Estatísticas.html` | `app/(app)/estatisticas/page.tsx` |
| `Bolão 2026 - Gráficos.html` | `app/(app)/graficos/page.tsx` + `app/(app)/graficos/LineChart.tsx` |
| (cabeçalho/nav em todos) | `app/(app)/layout.tsx` |

---

## Passo a passo do port

### 1. Fontes (next/font)
No `app/layout.tsx` (ou o root layout), carregue as três famílias com `next/font/google` e exponha como CSS variables:

```ts
import { Libre_Caslon_Display, Archivo, Space_Mono } from "next/font/google";

const caslon = Libre_Caslon_Display({ subsets: ["latin"], weight: ["400"], style: ["normal","italic"], variable: "--font-caslon" });
const archivo = Archivo({ subsets: ["latin"], weight: ["400","500","600","700","800","900"], variable: "--font-archivo" });
const mono = Space_Mono({ subsets: ["latin"], weight: ["400","700"], variable: "--font-mono" });

// no <html>: className={`${caslon.variable} ${archivo.variable} ${mono.variable}`}
```

### 2. Tokens + base no `globals.css`
Substitua o conteúdo do `app/globals.css` pelo que está em **`globals.css`** deste pacote (mantém `@import "tailwindcss"` e adiciona as variáveis de tema claro/escuro, a textura de papel e o mapeamento `@theme` para o Tailwind v4). Os utilitários de componente (cards, selos, escudos, tabelas) estão em **`bolao.css`** — importe-o no `globals.css` (`@import "./bolao.css";`) ou converta para `@layer components`.

### 3. Toggle de tema
Adicione um botão no header (`layout.tsx`) que alterna `data-theme` no `<html>` e grava em `localStorage` (`bolao-theme`). Para evitar flash no SSR, injete um pequeno script inline no `<head>` que lê o `localStorage` antes da hidratação. **Importante:** NÃO coloque `transition` em `color`/`background-color` no `body` — anima a partir de variáveis CSS e o navegador trava no valor antigo durante o toggle. Troca de tema deve ser instantânea.

### 4. Recriar cada tela
Para cada rota, troque as classes Tailwind genéricas atuais (`rounded-xl border bg-white …`) pelos componentes do sistema. Veja a seção **Componentes** abaixo e o HTML de referência correspondente.

### 5. Escudos / bandeiras
Os mockups desenham bandeiras em CSS (`.f-bra`, `.f-arg`, …) só para a referência. **No app, use os escudos reais que você já carrega por imagem** — coloque-os dentro do wrapper `.crest` (círculo com borda + anel de papel via box-shadow). Mantenha as classes de tamanho `.crest`, `.crest.sm`, `.crest.xs`.

---

## Design Tokens

### Cores — tema claro
```
--paper:      #efe7d6   /* fundo da página */
--paper-2:    #faf5ea   /* fundo de cards */
--paper-3:    #f3ecdd   /* inputs / superfícies suaves */
--ink:        #1d2a20   /* texto principal */
--ink-soft:   #5e6a5c   /* texto secundário */
--ink-faint:  #8a9384   /* texto terciário */
--line:       rgba(29,42,32,0.16)
--line-soft:  rgba(29,42,32,0.09)
--green:      #0c6e3a
--green-deep: #084d29
--gold:       #b58a2e
--gold-bright:#d9ab47
--gold-foil:  #e8c869
--red:        #b23a2a
--card-shadow:       3px 4px 0 rgba(29,42,32,0.13)
--card-shadow-hover: 5px 7px 0 rgba(12,110,58,0.22)
```

### Cores — tema escuro (`[data-theme="dark"]`)
```
--paper:      #0e1611
--paper-2:    #16221a
--paper-3:    #111b15
--ink:        #f0e9d6
--ink-soft:   #a4b0a2
--ink-faint:  #6f7d6f
--line:       rgba(240,233,214,0.16)
--line-soft:  rgba(240,233,214,0.08)
--green:      #36a868
--green-deep: #1d6f43
--gold:       #d9ab47
--gold-bright:#e8c869
--gold-foil:  #f0d784
--red:        #d8654f
--card-shadow:       3px 4px 0 rgba(0,0,0,0.45)
--card-shadow-hover: 5px 7px 0 rgba(54,168,104,0.30)
```

### Tipografia
- **Serifa (títulos, placares, pontos):** Libre Caslon Display. H1 de página `clamp(32px, 5.4vw, 52px)`, line-height `.95`; itálico no destaque (cor `--green`).
- **Sans (rótulos, nav, botões, nomes de time):** Archivo. Rótulos: `font-weight:800`, `text-transform:uppercase`, `letter-spacing:.1–.14em`, tamanhos 9.5–11px.
- **Mono (datas, horários, métricas, contadores):** Space Mono, 10–12px.

### Forma / sombra / espaçamento
- Raio de borda dos cards: **3px** (containers maiores 4px). Selos/escudos: círculos.
- Bordas: **1.5px solid var(--ink)** (cards), **2px** em peças de destaque.
- Sombra: **sólida e deslocada, sem blur** (`--card-shadow`); no hover, desloca e fica esverdeada (`--card-shadow-hover`) + `transform: translate(-2px,-3px)`.
- Largura máxima do conteúdo: **940px**, padding lateral 22px.
- Fundo da página: cor `--paper` + `radial-gradient(var(--line-soft) .6px, transparent .7px)` em grid de 5px, mais uma camada de grão (SVG feTurbulence) em `body::before` com `mix-blend-mode: multiply` (claro) / `screen` (escuro).

---

## Componentes (recrie como componentes React)

- **Header/nav** (`layout.tsx`): barra sticky `--paper-2`, borda inferior 2px + faixa dourada (`box-shadow: 0 2px 0 var(--gold)`). Marca com "bola" (círculo conic-gradient dourado). Links em Archivo 11px uppercase; ativo com sublinhado dourado. Chip do usuário (iniciais em círculo verde) + botão de tema + sair.
- **Masthead** (home): faixa "ALMANAQUE DO MUNDIAL · Nº 01", título em serifa com itálico verde, dois **selos** (rosetas) nas laterais, régua dupla embaixo.
- **Selo/medalhão** (`.seal`): roseta dourada via `repeating-conic-gradient` + máscara radial; núcleo de papel com borda dourada tracejada. Veja o HTML para a técnica exata da máscara.
- **Ticket/ingresso** (`.ticket`): card com dois entalhes circulares laterais (`::before/::after`) simulando picote; usado para "sua posição" e progresso.
- **Card de partida** (`.card`): número de estampa ("Nº 02") no topo, fase + status, dois times com escudo, placar em serifa (ou "—" em mono se pendente), rodapé picotado com avatares de palpiteiros.
- **Jogo em destaque** (`.featured`): card maior, brilho radial verde no rodapé, selo "AO VIVO" com ponto pulsante (`@keyframes blink`).
- **Tabela almanaque** (`.alm-table`): cabeçalho verde-escuro com texto creme; linhas com hover dourado; linha "você" com tinta verde + barra dourada à esquerda. Pontos em serifa.
- **Cards de grupo** (`.gcard`/`.gtable`): cabeçalho verde, 1º–2º com fundo verde, 3º com fundo dourado (zonas de classificação).
- **Chaveamento** (`.bracket`): colunas Oitavas→Final; vencedor em serifa, perdedor com `opacity:.5`; jogo ao vivo em vermelho; Final destacada em dourado.
- **Editor de palpites** (`.pcard` + `.sc-in`): inputs de placar estilo "placar de estádio" (numéricos, fonte serifa grande), pílula de status (Aberto/Fecha em…/Encerrado), e cards encerrados mostrando badge de pontos (+10 cravado / +5 vencedor / 0). Barra "Salvar" sticky com toast de confirmação.
- **Cartela da Copa** (`.bonus-hero` + `.bcard`): card-troféu do Campeão (+30), grid de vice/artilheiro/craque/zebra; `<select>` estilizado que troca o escudo ao lado ao mudar a seleção.
- **Gráficos** (`graficos`): dois gráficos de linha em SVG — **Evolução** (acumulado) e **Diferença para o líder** (eixo invertido, líder reto no topo). Linha do usuário ("você") mais grossa em azul. Paleta de jogadores com variantes para o tema escuro. Veja o `<script>` de `Bolão 2026 - Gráficos.html` para a lógica de desenho (gridlines, escala, pontos com `<title>` de tooltip) — recomendo recriar como componente client com a mesma matemática, ou plugar a paleta no seu `LineChart.tsx` atual.

## Interações & estados
- **Hover de card:** `translate(-2px,-3px)` + sombra esverdeada + borda verde, transição `.18s`.
- **AO VIVO:** ponto vermelho piscando (`blink 1.1s steps(2) infinite`).
- **Inputs de placar:** só dígitos (máx 2), foco com borda verde + anel interno; contador de preenchidos ao vivo.
- **Selects da Copa:** ao mudar, atualiza a classe do escudo adjacente.
- **Toast:** sobe do rodapé ao salvar, some em ~2.2s.
- **Tema:** instantâneo (sem transição de cor no body — ver passo 3).

## Assets
Nenhum binário externo. Fontes via Google Fonts (`next/font`). Escudos: **use os que o app já tem**. A textura de grão é um data-URI SVG embutido no CSS (em `body::before`).

## Arquivos neste pacote
- `Bolão 2026 - Jogos.html` — home / lista de jogos (com cópia inline do CSS)
- `Bolão 2026 - Classificação.html` — grupos + chaveamento
- `Bolão 2026 - Palpites.html` — editor de palpites
- `Bolão 2026 - Copa.html` — cartela de bônus
- `Bolão 2026 - Ranking.html` — pódio + tabela
- `Bolão 2026 - Estatísticas.html` — recordes + ranking por fase
- `Bolão 2026 - Gráficos.html` — gráficos SVG + tabela por dia
- `bolao.css` — **sistema visual compartilhado** (tokens + todos os utilitários de componente). É a fonte da verdade do estilo.
- `globals.css` — ponto de partida para o seu `app/globals.css` (Tailwind v4 + tokens + base).
