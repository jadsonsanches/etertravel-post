const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;

if (!TELEGRAM_BOT_TOKEN || !GEMINI_API_KEY || !UNSPLASH_ACCESS_KEY) {
  console.error("❌ Erro: Verifique se TELEGRAM_BOT_TOKEN, GEMINI_API_KEY e UNSPLASH_ACCESS_KEY estão preenchidos no .env");
  process.exit(1);
}

// Auxiliar para requisições HTTPS
function fetchHttps(url, options = {}, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

// Enviar mensagem no Telegram com suporte a botões interativos (Inline Keyboard)
async function sendTelegramMessage(chatId, text, inlineKeyboard = null) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload = { chat_id: chatId, text, parse_mode: 'Markdown' };
  if (inlineKeyboard) {
    payload.reply_markup = { inline_keyboard: inlineKeyboard };
  }
  await fetchHttps(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, payload);
}

// Enviar fotos no Telegram sem erro de tamanho de legenda (Garante a foto 1/5)
async function sendTelegramPhotoAlbum(chatId, photoPaths) {
  for (let i = 0; i < photoPaths.length; i++) {
    const photoPath = photoPaths[i];
    const curlCmd = `curl -s -F "chat_id=${chatId}" -F "photo=@${photoPath}" -F "caption=Slide ${i + 1}/${photoPaths.length}" "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto"`;
    try {
      execSync(curlCmd);
    } catch (e) {
      console.error(`Erro ao enviar foto ${i + 1}:`, e.message);
    }
  }
}

// Buscar fotos no Unsplash
async function searchUnsplashPhotos(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=portrait&per_page=6&client_id=${UNSPLASH_ACCESS_KEY}`;
  const res = await fetchHttps(url);
  if (res.data && res.data.results && res.data.results.length > 0) {
    return res.data.results.map(r => r.urls.regular);
  }
  return [
    'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1080&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1080&auto=format&fit=crop'
  ];
}

// Gerar Copy no Gemini API com fallback automático de modelos
async function generateGeminiContent(destino) {
  const candidateModels = [
    'gemini-flash-latest',
    'gemini-2.0-flash-lite-001',
    'gemini-2.5-pro'
  ];

  const systemPrompt = `Você é o Copywriter Sênior e Diretor de Arte da Éter Travel (agência de turismo sob medida de alto padrão).
Crie um carrossel educativo e de altíssimo luxo sobre o destino: "${destino}" no estilo editorial de revista (Vogue Travel / Condé Nast).

DIRETRIZES DE MARCA:
- PROIBIDO usar palavras de turismo em massa: "incrível", "maravilhoso", "imperdível", "dica de ouro", "promoção", "pacote", "desconto", "barato".
- OBRIGATÓRIO usar vocabulário refinado: "curadoria", "singular", "privilégio", "atemporal", "sob medida", "roteiro autoral", "hospedagem boutique".

ESTRUTURA DOS SLIDES:
- Slide 1: Capa com Título Principal de alto impacto e subtítulo inspirador de rodapé.
- Slides 2, 3 e 4: Destaque de hotéis boutique, experiências exclusivas ou vilas privadas do destino. Para cada um, forneça:
  - "place_name": Nome refinado da propriedade ou atração (ex: "Passalacqua", "Nihi Sumba", "Soneva Jani").
  - "location": Cidade, Região e País (ex: "Lago di Como, Itália", "Indonésia", "Maldivas").
  - "body": Descrição poética e elegante de 2 a 3 linhas.
  - "layout_position": Escolha a melhor posição do texto para criar variação visual entre os slides. Opções permitidas: "top-left", "top-center", "bottom-left", "bottom-right".
- Slide 5: Encerramento sofisticado convidando a viver o destino sob medida.

Retorne APENAS um JSON válido no seguinte formato sem marcações markdown:
{
  "theme": "Nome do Tema Refinado",
  "unsplash_keyword": "Palavra-chave em inglês para busca de fotos HD no Unsplash",
  "caption": "Legenda completa do post com narrativa de luxo e CTA para o WhatsApp",
  "slides": [
    {
      "slide_index": 1,
      "tag": "ROTEIRO EXCLUSIVO",
      "title": "Título de Capa Curto e Impactante",
      "body": "Frase de efeito inspiradora para a base da capa",
      "place_name": null,
      "location": null,
      "layout_position": "cover",
      "highlight": null
    },
    {
      "slide_index": 2,
      "tag": "CURADORIA ÉTER",
      "title": "Nome do Local 1",
      "place_name": "Nome da Propriedade / Experiência",
      "location": "Região, País",
      "body": "Descrição refinada de 2 a 3 linhas sobre a experiência.",
      "layout_position": "top-left",
      "highlight": null
    },
    {
      "slide_index": 3,
      "tag": "EXPERIÊNCIA SINGULAR",
      "title": "Nome do Local 2",
      "place_name": "Nome da Propriedade / Experiência",
      "location": "Região, País",
      "body": "Descrição refinada sobre gastronomia autoral ou hospedagem boutique.",
      "layout_position": "top-center",
      "highlight": null
    },
    {
      "slide_index": 4,
      "tag": "SABORES & VIVÊNCIAS",
      "title": "Nome do Local 3",
      "place_name": "Nome da Propriedade / Experiência",
      "location": "Região, País",
      "body": "Detalhes de vivências autênticas e roteiros privativos.",
      "layout_position": "bottom-right",
      "highlight": null
    },
    {
      "slide_index": 5,
      "tag": "SUA JORNADA SOB MEDIDA",
      "title": "Sua experiência começa aqui",
      "place_name": null,
      "location": null,
      "body": "Permita-nos desenhar seu roteiro personalizado com curadoria VIP.",
      "layout_position": "top-center",
      "highlight": null
    }
  ]
}`;

  const payload = {
    contents: [{ parts: [{ text: systemPrompt }] }]
  };

  let lastError = null;

  for (const model of candidateModels) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
    try {
      console.log(`🧠 Tentando gerar conteúdo com modelo: ${model}...`);
      const res = await fetchHttps(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, payload);

      if (res.status !== 200) {
        console.warn(`⚠️ Modelo ${model} retornou HTTP ${res.status}. Tentando próximo modelo...`);
        lastError = new Error(`Erro Gemini (${res.status}): ${res.data?.error?.message || res.raw}`);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }

      let rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        rawText = rawText.substring(firstBrace, lastBrace + 1);
      }

      const parsed = JSON.parse(rawText);
      console.log(`✅ Sucesso na geração com o modelo: ${model}`);
      return parsed;
    } catch (e) {
      console.warn(`⚠️ Falha com o modelo ${model}: ${e.message}`);
      lastError = e;
    }
  }

  throw lastError || new Error("Todos os modelos Gemini falharam temporariamente.");
}

// Renderizar Slides com Puppeteer
async function renderSlides(postData, images) {
  const templatePath = path.join(__dirname, 'templates', 'carousel-slide.html');
  const baseHtml = fs.readFileSync(templatePath, 'utf8');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const outputFiles = [];

  for (let i = 0; i < postData.slides.length; i++) {
    const slide = postData.slides[i];
    const bgImage = images[i % images.length];

    let layoutClass = 'layout-top-left';
    let slideContentHtml = '';

    if (i === 0 || slide.layout_position === 'cover') {
      layoutClass = 'layout-cover';
      slideContentHtml = `
        <div class="cover-title-block">
          <h1 class="cover-main-title">${slide.title}</h1>
        </div>
        <div class="cover-footer-block">
          <p class="cover-subtitle">${slide.body}</p>
        </div>
      `;
    } else if (i === postData.slides.length - 1) {
      layoutClass = 'layout-top-center';
      slideContentHtml = `
        <div class="destination-block" style="text-align: center; margin: auto;">
          <h1 class="place-name" style="font-size: 58px;">${slide.title}</h1>
          <p class="editorial-body" style="margin-top: 18px;">${slide.body}</p>
        </div>
      `;
    } else {
      // Posições dinâmicas para os cards de destino (Slides 2, 3, 4)
      const allowedPositions = ['top-left', 'top-center', 'bottom-left', 'bottom-right'];
      const pos = allowedPositions.includes(slide.layout_position)
        ? slide.layout_position
        : (i === 1 ? 'top-left' : (i === 2 ? 'top-center' : 'bottom-right'));

      layoutClass = `layout-${pos}`;

      const placeTitle = slide.place_name || slide.title;
      const locationText = slide.location || '';

      slideContentHtml = `
        <div class="destination-block">
          <h1 class="place-name">${placeTitle}</h1>
          ${locationText ? `<div class="place-location">${locationText}</div>` : ''}
          <p class="editorial-body">${slide.body}</p>
        </div>
      `;
    }

    let html = baseHtml
      .replace('{{UNSPLASH_IMAGE_URL}}', bgImage)
      .replace('{{SLIDE_TAG}}', slide.tag || 'ÉTER TRAVEL')
      .replace('{{LAYOUT_CLASS}}', layoutClass)
      .replace('{{SLIDE_CONTENT_HTML}}', slideContentHtml)
      .replace('{{CURRENT_PAGE}}', slide.slide_index)
      .replace('{{TOTAL_PAGES}}', postData.slides.length);

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const outputPath = path.join(__dirname, `output_slide_${i + 1}.jpg`);
    await page.screenshot({ path: outputPath, type: 'jpeg', quality: 95 });
    outputFiles.push(outputPath);
  }

  await browser.close();
  return outputFiles;
}

// Função de Processamento Completo de Post
async function processPostRequest(chatId, destino) {
  await sendTelegramMessage(chatId, `✨ *Recebido!* Iniciando curadoria para: *${destino}*\n\n🧠 Gerando narrativa de luxo via Gemini AI...\n🖼️ Buscando fotos HD no Unsplash...\n🎨 Renderizando slides em 4K Retina via Puppeteer...`);

  try {
    const postData = await generateGeminiContent(destino);
    console.log("✅ Conteúdo gerado:", postData.theme);

    const photos = await searchUnsplashPhotos(postData.unsplash_keyword || destino);
    console.log(`✅ ${photos.length} fotos obtidas do Unsplash.`);

    const renderedSlides = await renderSlides(postData, photos);
    console.log(`✅ ${renderedSlides.length} slides renderizados em 1080x1350.`);

    // 1. Envia o álbum com as fotos renderizadas
    await sendTelegramPhotoAlbum(chatId, renderedSlides);

    // 2. Envia a mensagem com a legenda e os BOTÕES INTERATIVOS
    const captionText = `📌 *${postData.theme}*\n\n${postData.caption}`;
    const inlineButtons = [
      [
        { text: "✅ Aprovar e Publicar", callback_data: `publish_${encodeURIComponent(destino)}` },
        { text: "🔄 Refazer Post", callback_data: `regen_${encodeURIComponent(destino)}` }
      ]
    ];

    await sendTelegramMessage(chatId, captionText, inlineButtons);
    console.log("✅ Prévia com botões interativos enviada com sucesso para o Telegram!");
  } catch (err) {
    console.error("Erro no processamento:", err);
    await sendTelegramMessage(chatId, `❌ *Erro ao processar post:* ${err.message}`);
  }
}

// Polling do Telegram Bot
let lastUpdateId = 0;

async function pollTelegram() {
  console.log("🤖 Éter Travel Telegram Bot ativo com botões de Ação! Aguardando comandos (ex: /post Santorini, Grécia)...");

  while (true) {
    try {
      const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}&timeout=30`;
      const res = await fetchHttps(url);

      if (res.data && res.data.ok && res.data.result.length > 0) {
        for (const update of res.data.result) {
          lastUpdateId = update.update_id;

          // 1. Tratar Cliques nos Botões Interativos (Callback Queries)
          if (update.callback_query) {
            const cb = update.callback_query;
            const chatId = cb.message.chat.id;
            const data = cb.data;

            // Notifica o Telegram para fechar o indicador de carregamento do botão
            const answerUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
            await fetchHttps(answerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }, { callback_query_id: cb.id });

            if (data.startsWith('publish_')) {
              const destino = decodeURIComponent(data.replace('publish_', ''));
              await sendTelegramMessage(chatId, `🎉 *Post Aprovado com Sucesso!*\n\n🚀 Destino: *${destino}*\n📲 *Status:* Próximo passo: adicionar Meta Token no .env para publicar automaticamente no perfil do Instagram!`);
            } else if (data.startsWith('regen_')) {
              const destino = decodeURIComponent(data.replace('regen_', ''));
              await processPostRequest(chatId, destino);
            }
            continue;
          }

          // 2. Tratar Comandos de Texto (/post ...)
          const msg = update.message;
          if (!msg || !msg.text) continue;

          const text = msg.text.trim();
          const chatId = msg.chat.id;

          if (text.startsWith('/post') || text.startsWith('/start') || text.length > 2) {
            let destino = text.replace('/post', '').replace('/start', '').trim();
            if (!destino) destino = "Santorini, Grécia";

            await processPostRequest(chatId, destino);
          }
        }
      }
    } catch (e) {
      console.error("Erro no loop de polling do Telegram:", e.message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

pollTelegram();
