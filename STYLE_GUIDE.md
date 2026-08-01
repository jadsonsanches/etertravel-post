# 🎨 Guia de Estilo Visual & Editorial — Éter Travel (`STYLE_GUIDE.md`)

> **REGRA MANDATÓRIA PARA TODOS OS AGENTES:**
> Antes de criar, sugerir, redigir ou renderizar qualquer post, carrossel, story ou legenda para o Instagram da Éter Travel, o agente DEVE obrigatoriamente ler e aplicar as diretrizes contidas neste documento.

---

## 🌟 1. Conceito Estético de Design

A identidade visual da **Éter Travel** é inspirada nas mais prestigiadas publicações internacionais de arquitetura e viagem de luxo (*Vogue Travel*, *Condé Nast Traveler*, *Architectural Digest*).

### Princípios Visuais Fundamentais:
1. **Design Clean & Flutuante**: É estritamente **PROIBIDO** utilizar caixas de fundo (*cards*), fundos escuros sólidos, bordas de vidro pesadas ou sombras artificiais (*text-shadow*) exageradas. Os textos devem flutuar de forma orgânica e elegante sobre a fotografia.
2. **Fotografia Protagonista**: A imagem é a peça central. A tipografia e os textos complementam a cena, nunca a poluem ou escondem os elementos principais (arquitetura, piscinas, paisagens, horizontes).
3. **Textura Editorial (*Film Grain*)**: Todas as imagens contêm uma camada sutil de granulado estético (*noise filter*), conferindo acabamento de fotografia analógica de revista.
4. **Proteção de Leitura Invisível**: Um degradê suave e translúcido é aplicado sobre a imagem (`linear-gradient`) apenas o suficiente para garantir contraste e legibilidade impecável dos textos brancos.

---

## 📐 2. Especificações Técnicas de Imagem & Formatos

* **Post Feed (Único / Carrossel)**: `1080px` × `1350px` (Proporção 4:5 vertical do Instagram).
* **Story Instagram**: `1080px` × `1920px` (Proporção 9:16 vertical cheia do Instagram).
* **Fator de Escala (Densidade)**: `deviceScaleFactor: 2` (Renderização 4K Retina via Puppeteer).
* **Critérios de Curadoria Fotográfica**:
  * Fotografia arquitetônica e paisagística de altíssimo padrão.
  * Iluminação natural (luz dourada do pôr do sol, manhã ensolarada ou crepúsculo refinado).
  * Cores terrosas, neutras, champanhe, azuis cristalinos e tons orgânicos.

---

## 🤖 3. Arquitetura de Comandos no Telegram Bot

* **`/post <tema>`**: Gera 1 foto para o Feed (4:5) + legenda refinada + bloco de hashtags.
* **`/carrossel 3 <tema>`** (ou `/carrossel3`): Gera carrossel com 3 slides para o Feed (4:5).
* **`/carrossel 5 <tema>`** (ou `/carrossel5`): Gera carrossel com 5 slides para o Feed (4:5).
* **`/story <tema>`**: Gera 1 imagem vertical no formato Instagram Story (9:16).
* **`/legenda <tema>`**: Gera apenas a legenda e hashtags (sem geração de imagem).
* **`/help`** (ou `/ajuda`): Exibe o guia completo de comandos e ajuda no Telegram.

---

## ✒️ 4. Hierarquia Tipográfica

O projeto utiliza duas famílias tipográficas principais via Google Fonts:

### 1. Título do Post / Nome da Propriedade (Serifada)
* **Fonte**: `'Playfair Display', serif`
* **Estilo**: Peso `500` (Medium), cor `#FFFFFF`.
* **Tamanho**:
  * Capa Feed: `84px` a `88px` (Line height: `1.08`).
  * Story: `88px` (Line height: `1.08`).
  * Slides Intermediários: `76px` a `84px` (Line height: `1.06`).

### 2. Localização / Região e País (Sans-Serif Complementar)
* **Fonte**: `'Plus Jakarta Sans', sans-serif`
* **Estilo**: Peso `400` (Regular), cor `#F1F5F9`.
* **Tamanho**: `28px` a `30px` (Line height: `1.4`).
* **Uso**: Posicionado **imediatamente abaixo do título serifado**, indicando cidade, região ou país (ex: *"Lago di Como, Itália"*, *"Indonésia"*, *"Maldivas"*).

### 3. Corpo Editorial / Subtítulos (Sans-Serif Leve)
* **Fonte**: `'Plus Jakarta Sans', sans-serif`
* **Estilo**: Peso `300` (Light), cor `#FFFFFF`.
* **Tamanho**:
  * Subtítulo da Capa / Story: `30px` (Line height: `1.5`).
  * Corpo dos Slides: `26px` a `28px` (Line height: `1.55`), limite de 2 a 3 linhas por slide.

---

## 🖼️ 5. Matriz de Posicionamento no Grid (`layout_position`)

Para manter o carrossel dinâmico e evitar que o texto obstrua a fotografia, o sistema suporta 5 variações de posicionamento no Feed:

```
+--------------------------+   +--------------------------+
|  [TITLE - SERIF]         |   |      [TITLE - SERIF]     |
|  [LOCATION - SANS]       |   |    [LOCATION - SANS]     |
|                          |   |    [EDITORIAL BODY]      |
|                          |   |                          |
|                          |   |                          |
|                          |   |                          |
|  [EDITORIAL BODY]        |   |                          |
+--------------------------+   +--------------------------+
  (1) layout-cover / top-left      (2) layout-top-center
```

```
+--------------------------+   +--------------------------+
|                          |   |                          |
|                          |   |                          |
|                          |   |                          |
|                          |   |                          |
|                          |   |      [TITLE - SERIF]     |
|  [TITLE - SERIF]         |   |    [LOCATION - SANS]     |
|  [LOCATION - SANS]       |   |    [EDITORIAL BODY]      |
|  [EDITORIAL BODY]        |   |                          |
+--------------------------+   +--------------------------+
   (3) layout-bottom-left         (4) layout-bottom-right
```

---

## 🗣️ 6. Tom de Voz & Dicionário de Copywriting

A linguagem da Éter Travel é poética, sofisticada, discreta e focada no **luxo silencioso** (*quiet luxury*).

### ❌ Termos Estritamente Proibidos:
* *Turismo de massa*: "incrível", "maravropolhes", "dica de ouro", "imperdível", "barato", "promoção", "pacote", "desconto", "top".
* *Gatilhos apelativos*: "corra", "últimas vagas", "preço imbatível".

### ✅ Vocabulário Recomendado:
* *Substantivos*: "curadoria", "propriedade", "refúgio", "atemporalidade", "sanctuário", "autoria", "jornada".
* *Adjetivos*: "singular", "sob medida", "contemplativo", "exclusivo", "discreto", "impecável".
* *Verbos*: "vivenciar", "desfrutar", "desenhar", "despertar", "percorrer".

---

## #️⃣ 7. Hashtags Estratégicas de Luxo

Ao final de todas as legendas (seja para `/post`, `/carrossel` ou `/legenda`), é obrigatória a inserção de 6 a 8 hashtags curadas, tais como:
`#EterTravel #TurismoDeLuxo #LuxuryTravel #RoteirosExclusivos #QuietLuxury #HotelsAndResorts #DestinosExclusivos`
