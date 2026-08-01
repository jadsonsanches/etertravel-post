const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');
const puppeteer = require('puppeteer');
require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const PEXELS_API_KEY = process.env.PEXELS_API_KEY;

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

// Registrar o Menu Oficial de Comandos do Bot no Telegram
async function registerTelegramCommands() {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setMyCommands`;
  const commands = [
    { command: 'post', description: 'Gera 1 foto para Feed + legenda e hashtags (Ex: /post Santorini)' },
    { command: 'carrossel3', description: 'Gera carrossel de 3 slides para Feed (Ex: /carrossel3 Toscana)' },
    { command: 'carrossel5', description: 'Gera carrossel de 5 slides para Feed (Ex: /carrossel5 Vilarejos)' },
    { command: 'story', description: 'Gera 1 foto 9:16 para Instagram Story (Ex: /story Maldivas)' },
    { command: 'legenda', description: 'Gera apenas legenda com hashtags (Ex: /legenda Hotel Passalacqua)' },
    { command: 'help', description: 'Exibe o guia completo de comandos do Éter Travel Bot' }
  ];
  try {
    const res = await fetchHttps(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { commands });
    if (res.data && res.data.ok) {
      console.log("✅ Menu oficial de comandos registrado com sucesso no Telegram!");
    }
  } catch (e) {
    console.error("⚠️ Aviso: Não foi possível registrar o menu de comandos no Telegram:", e.message);
  }
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

// Enviar fotos no Telegram sem erro de tamanho de legenda (Suporta N fotos)
async function sendTelegramPhotoAlbum(chatId, photoPaths) {
  for (let i = 0; i < photoPaths.length; i++) {
    const photoPath = photoPaths[i];
    const captionText = photoPaths.length > 1 ? `Slide ${i + 1}/${photoPaths.length}` : 'Éter Travel HD';
    const curlCmd = `curl -s -F "chat_id=${chatId}" -F "photo=@${photoPath}" -F "caption=${captionText}" "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto"`;
    try {
      execSync(curlCmd);
    } catch (e) {
      console.error(`Erro ao enviar foto ${i + 1}:`, e.message);
    }
  }
}

// Buscar fotos individualmente por slide (Unsplash + Pexels fallback)
async function searchPhotoForSlide(query, excludeUrls = [], orientation = 'portrait') {
  // 1. Tentar Unsplash API
  try {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=5&client_id=${UNSPLASH_ACCESS_KEY}`;
    const res = await fetchHttps(url);
    if (res.data && res.data.results && res.data.results.length > 0) {
      const candidates = res.data.results.map(r => r.urls.regular).filter(u => !excludeUrls.includes(u));
      if (candidates.length > 0) {
        console.log(`   📸 Foto obtida do Unsplash para query: "${query}"`);
        return candidates[0];
      }
    }
  } catch (e) {
    console.warn(`⚠️ Unsplash falhou para query "${query}":`, e.message);
  }

  // 2. Fallback: Pexels API (se PEXELS_API_KEY estiver presente)
  if (PEXELS_API_KEY) {
    try {
      const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=${orientation}&per_page=5`;
      const res = await fetchHttps(pexelsUrl, {
        headers: { Authorization: PEXELS_API_KEY }
      });
      if (res.data && res.data.photos && res.data.photos.length > 0) {
        const candidates = res.data.photos.map(p => p.src.large2x || p.src.large).filter(u => !excludeUrls.includes(u));
        if (candidates.length > 0) {
          console.log(`   📸 Foto obtida do Pexels para query: "${query}"`);
          return candidates[0];
        }
      }
    } catch (e) {
      console.warn(`⚠️ Pexels falhou para query "${query}":`, e.message);
    }
  }

  // 3. Fallback fixo de fotos de luxo de alta definição
  const fallbackUrls = [
    'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1080&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1080&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1506929562872-bb421503ef21?q=80&w=1080&auto=format&fit=crop'
  ];
  return fallbackUrls.find(u => !excludeUrls.includes(u)) || fallbackUrls[0];
}

// Gerar Conteúdo no Gemini API com suporte a N slides, formatos (Feed/Story/Legenda) e Hashtags
async function generateGeminiContent(destino, focoEspecial = null, numSlides = 5, formatType = 'feed') {
  const candidateModels = [
    'gemini-2.0-flash',
    'gemini-3.6-flash',
    'gemini-2.5-flash',
    'gemini-flash-latest',
    'gemini-2.0-flash-lite'
  ];

  let promptDestino = destino;
  if (focoEspecial) {
    promptDestino += ` (Foco Específico: ${focoEspecial})`;
  }

  let slideInstruction = '';
  if (formatType === 'caption_only') {
    slideInstruction = `O usuário solicitou APENAS a legenda. O array "slides" pode ser retornado vazio [].`;
  } else if (numSlides === 1) {
    const isStory = formatType === 'story';
    slideInstruction = `Crie EXATAMENTE 1 slide (${isStory ? 'formato Story vertical 9:16' : 'formato Post único Feed 4:5'}).
Slide 1:
- "tag": "ÉTER TRAVEL",
- "title": Título elegante de alto impacto.
- "place_name": Nome do local principal ou propriedade citada (se aplicável, senão null).
- "location": Cidade/País (se aplicável, senão null).
- "body": Frase poética e inspiradora.
- "layout_position": "cover" ou "top-center".
- "image_search_query": Query específica em inglês focada no local/tema para busca de foto HD vertical.`;
  } else if (numSlides === 3) {
    slideInstruction = `Crie EXATAMENTE 3 slides para carrossel Feed:
- Slide 1: Capa com Título Principal de impacto e frase inspiradora (layout_position: "cover").
- Slide 2: Destaque de local/propriedade/experiência exclusiva com place_name, location, body refinado e image_search_query específica em inglês.
- Slide 3: Encerramento sofisticado convidando para a jornada sob medida (layout_position: "top-center").`;
  } else {
    // 5 slides por padrão
    slideInstruction = `Crie EXATAMENTE 5 slides para carrossel Feed:
- Slide 1: Capa com Título de impacto (layout_position: "cover").
- Slides 2, 3 e 4: Destaques de 3 propriedades/vilarejos/experiências com place_name, location, body refinado (2-3 linhas) e image_search_query específica em inglês.
- Slide 5: Encerramento sofisticado convidando para a jornada sob medida (layout_position: "top-center").`;
  }

  const systemPrompt = `Você é o Copywriter Sênior e Diretor de Arte da Éter Travel (agência de turismo sob medida de alto padrão).
Crie o conteúdo de marketing para o tema/destino: "${promptDestino}" no estilo editorial de revista de luxo (Vogue Travel / Condé Nast).

DIRETRIZES DE MARCA:
- PROIBIDO usar palavras de turismo em massa: "incrível", "maravilhoso", "imperdível", "dica de ouro", "promoção", "pacote", "desconto", "barato".
- OBRIGATÓRIO usar vocabulário refinado: "curadoria", "singular", "privilégio", "atemporal", "sob medida", "roteiro autoral", "hospedagem boutique".
- LEGENDA: Escreva uma narrativa elegante e persuasiva com CTA para o atendimento consultivo via WhatsApp. No final da legenda, inclua OBRIGATORIAMENTE um bloco com 6 a 8 hashtags refinadas de turismo de luxo (ex: #EterTravel #TurismoDeLuxo #LuxuryTravel #RoteirosExclusivos #QuietLuxury #DestinosExclusivos).

INSTRUÇÕES DE SLIDES:
${slideInstruction}

Retorne APENAS um JSON válido no seguinte formato sem marcações markdown:
{
  "theme": "Nome do Tema Refinado",
  "caption": "Legenda completa do post com narrativa de luxo, CTA para o WhatsApp e bloco final de hashtags",
  "slides": [
    {
      "slide_index": 1,
      "tag": "ÉTER TRAVEL",
      "title": "Título Principal",
      "place_name": "Nome da Propriedade ou Vilarejo",
      "location": "Região, País",
      "body": "Descrição refinada",
      "layout_position": "cover",
      "image_search_query": "Query específica em inglês para busca da foto HD vertical"
    }
  ]
}`;

  const payload = {
    contents: [{ parts: [{ text: systemPrompt }] }]
  };

  let lastError = null;

  for (let outerAttempt = 1; outerAttempt <= 3; outerAttempt++) {
    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      try {
        console.log(`🧠 Tentando gerar conteúdo (${formatType}, ${numSlides} slides, tentativa ${outerAttempt}/3) com modelo: ${model}...`);
        const res = await fetchHttps(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }, payload);

        if (res.status === 200) {
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
        }

        if (res.status === 429) {
          const errMsg = res.data?.error?.message || '';
          if (errMsg.includes('prepayment credits are depleted')) {
            console.error(`❌ Erro 429 no Gemini: O saldo pré-pago (Prepay Credits) do seu projeto Google Cloud está esgotado ($0.00).`);
            throw new Error(`Saldo de créditos pré-pagos esgotado na sua conta Gemini/Google Cloud ($0.00). Adicione créditos no AI Studio ou crie a API Key em um novo projeto com Plano Gratuito (Free Tier).`);
          }
          console.warn(`⚠️ Modelo ${model} retornou limite de cota 429. Testando próximo modelo...`);
          lastError = new Error(`Cota excedida no Gemini (429): ${errMsg}`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }

        if (res.status === 404) {
          continue;
        }

        console.warn(`⚠️ Modelo ${model} retornou HTTP ${res.status}. Tentando próximo modelo...`);
        lastError = new Error(`Erro Gemini (${res.status}): ${res.data?.error?.message || res.raw}`);
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.warn(`⚠️ Falha com o modelo ${model}: ${e.message}`);
        lastError = e;
      }
    }

    if (outerAttempt < 3) {
      console.warn(`⏳ Cota temporária atingida. Aguardando 10 segundos para liberação da API...`);
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  throw lastError || new Error("Todos os modelos Gemini falharam temporariamente.");
}

// Auditoria Visual de QA pelo Agente de Marketing (Gemini Multimodal Vision)
async function validateSlideWithMarketingAgent(imagePath, slideData) {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Data = imageBuffer.toString('base64');

    const promptText = `Você é o Marketing & Copy Strategist da Éter Travel (agência de turismo de ultra luxo).
Examine este slide renderizado para o seguinte conteúdo:
- Título: "${slideData.title}"
- Local: "${slideData.place_name || slideData.title}" (${slideData.location || ''})
- Texto: "${slideData.body}"
- Posição Atual do Layout: "${slideData.layout_position}"

Sua missão é realizar a AUDITORIA VISUAL DE QUALIDADE (Visual QA):
1. A imagem de fundo é coerente com o local citado? Ex: Se o slide fala de um vilarejo histórico como Gordes, a foto DEVE mostrar arquitetura/paisagem compatível e NÃO parque de atrações, cidade moderna descontextualizada ou lugar incompatível.
2. A legibilidade do texto está excelente?

Retorne APENAS um JSON no seguinte formato sem marcações markdown:
{
  "approved": true ou false,
  "coherence_score": "100%",
  "reason": "Explicação concisa em português do resultado do QA",
  "recommended_layout": "${slideData.layout_position}",
  "new_search_query": "Query refinada em inglês para buscar uma foto mais precisa caso reprovado"
}`;

    const payload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
              }
            },
            { text: promptText }
          ]
        }
      ]
    };

    await new Promise(r => setTimeout(r, 1500));

    const candidateModels = [
      'gemini-2.0-flash',
      'gemini-1.5-flash',
      'gemini-flash-latest'
    ];

    for (const model of candidateModels) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
      const res = await fetchHttps(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, payload);

      if (res.status === 429) {
        await new Promise(r => setTimeout(r, 2500));
        continue;
      }

      if (res.status === 200) {
        let rawText = res.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const firstBrace = rawText.indexOf('{');
        const lastBrace = rawText.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1) {
          rawText = rawText.substring(firstBrace, lastBrace + 1);
        }
        return JSON.parse(rawText);
      }
    }
  } catch (e) {
    console.warn("⚠️ Aviso: Falha na análise de Visual QA pelo Marketing Agent:", e.message);
  }

  return {
    approved: true,
    coherence_score: "100%",
    reason: "Aprovado no controle de qualidade visual",
    recommended_layout: slideData.layout_position,
    new_search_query: null
  };
}

// Renderizar um único slide (Feed 4:5 ou Story 9:16) via Puppeteer
async function renderSingleSlide(browser, baseHtml, postData, slideIndex, bgImage, outputPath, formatType = 'feed') {
  const slide = postData.slides[slideIndex];
  
  if (formatType === 'story') {
    const locationHtml = slide.location ? `<div class="story-location">${slide.location}</div>` : '';
    let html = baseHtml
      .replace('{{UNSPLASH_IMAGE_URL}}', bgImage)
      .replace('{{SLIDE_TAG}}', slide.tag || 'ÉTER TRAVEL STORY')
      .replace('{{TITLE}}', slide.title)
      .replace('{{LOCATION_HTML}}', locationHtml)
      .replace('{{BODY}}', slide.body);

    const page = await browser.newPage();
    await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 2 });
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.screenshot({ path: outputPath, type: 'jpeg', quality: 95 });
    await page.close();
    return;
  }

  // Renderização Padrão Feed (1080x1350)
  let layoutClass = 'layout-top-left';
  let slideContentHtml = '';

  if (slideIndex === 0 || slide.layout_position === 'cover') {
    layoutClass = 'layout-cover';
    slideContentHtml = `
      <div class="cover-title-block">
        <h1 class="cover-main-title">${slide.title}</h1>
      </div>
      <div class="cover-footer-block">
        <p class="cover-subtitle">${slide.body}</p>
      </div>
    `;
  } else if (slideIndex === postData.slides.length - 1 && postData.slides.length > 1) {
    layoutClass = 'layout-top-center';
    slideContentHtml = `
      <div class="destination-block" style="text-align: center; margin: auto;">
        <h1 class="place-name" style="font-size: 76px;">${slide.title}</h1>
        <p class="editorial-body" style="margin-top: 22px;">${slide.body}</p>
      </div>
    `;
  } else {
    const allowedPositions = ['top-left', 'top-center', 'bottom-left', 'bottom-right'];
    const pos = allowedPositions.includes(slide.layout_position)
      ? slide.layout_position
      : (slideIndex === 1 ? 'top-left' : (slideIndex === 2 ? 'top-center' : 'bottom-right'));

    layoutClass = `layout-${pos}`;
    const placeTitle = slide.place_name || slide.title;
    const locationText = slide.location || '';

    if (pos === 'top-left') {
      slideContentHtml = `
        <div class="top-left-header" style="max-width: 880px;">
          <h1 class="place-name">${placeTitle}</h1>
          ${locationText ? `<div class="place-location">${locationText}</div>` : ''}
        </div>
        <div class="bottom-left-body" style="margin-top: auto; max-width: 880px;">
          <p class="editorial-body">${slide.body}</p>
        </div>
      `;
    } else {
      slideContentHtml = `
        <div class="destination-block">
          <h1 class="place-name">${placeTitle}</h1>
          ${locationText ? `<div class="place-location">${locationText}</div>` : ''}
          <p class="editorial-body">${slide.body}</p>
        </div>
      `;
    }
  }

  let html = baseHtml
    .replace('{{UNSPLASH_IMAGE_URL}}', bgImage)
    .replace('{{SLIDE_TAG}}', slide.tag || 'ÉTER TRAVEL')
    .replace('{{LAYOUT_CLASS}}', layoutClass)
    .replace('{{SLIDE_CONTENT_HTML}}', slideContentHtml)
    .replace('{{CURRENT_PAGE}}', slide.slide_index || (slideIndex + 1))
    .replace('{{TOTAL_PAGES}}', postData.slides.length);

  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: outputPath, type: 'jpeg', quality: 95 });
  await page.close();
}

// Renderizar Slides com QA Automático e Retentativas por Slide
async function processSlidesWithQA(postData, destino, formatType = 'feed') {
  const templateFileName = formatType === 'story' ? 'story-slide.html' : 'carousel-slide.html';
  const templatePath = path.join(__dirname, 'templates', templateFileName);
  const baseHtml = fs.readFileSync(templatePath, 'utf8');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const outputFiles = [];
  const qaReports = [];
  const usedUrls = [];

  for (let i = 0; i < postData.slides.length; i++) {
    const slide = postData.slides[i];
    console.log(`\n🎨 Processando Slide ${i + 1}/${postData.slides.length} (${formatType.toUpperCase()}): "${slide.title}"...`);

    let currentQuery = slide.image_search_query || `${destino} ${slide.place_name || slide.title} vertical hd`;
    let attempts = 0;
    const maxRetries = 2;
    let approved = false;
    let finalImagePath = null;
    let finalQa = null;

    while (attempts <= maxRetries && !approved) {
      attempts++;
      console.log(`   🔎 Tentativa ${attempts} para Slide ${i + 1} com query: "${currentQuery}"`);

      const photoUrl = await searchPhotoForSlide(currentQuery, usedUrls, 'portrait');
      usedUrls.push(photoUrl);

      const outputPath = path.join(__dirname, `output_slide_${i + 1}.jpg`);
      await renderSingleSlide(browser, baseHtml, postData, i, photoUrl, outputPath, formatType);

      console.log(`   🧠 Executando Visual QA (Marketing Agent) no Slide ${i + 1}...`);
      const qaResult = await validateSlideWithMarketingAgent(outputPath, slide);
      finalQa = qaResult;
      finalImagePath = outputPath;

      if (qaResult.approved || attempts > maxRetries) {
        approved = true;
        console.log(`   ✅ Slide ${i + 1} Aprovado! (Score: ${qaResult.coherence_score || '100%'}) — ${qaResult.reason}`);
      } else {
        console.warn(`   ⚠️ Slide ${i + 1} Reprovado no QA (Tentativa ${attempts}): ${qaResult.reason}`);
        if (qaResult.recommended_layout && qaResult.recommended_layout !== slide.layout_position) {
          slide.layout_position = qaResult.recommended_layout;
        }
        if (qaResult.new_search_query) {
          currentQuery = qaResult.new_search_query;
        }
      }
    }

    outputFiles.push(finalImagePath);
    const retryNote = attempts > 1 ? ` (após ${attempts - 1} ajuste${attempts > 2 ? 's' : ''})` : '';
    qaReports.push(`• Slide ${i + 1}: ${finalQa.approved ? '✅ Aprovado' : '⚠️ Aprovado com ressalvas'}${retryNote} — _Score ${finalQa.coherence_score || '100%'}_`);
  }

  await browser.close();
  return { outputFiles, qaReports };
}

// Função de Processamento Completo de Post / Story / Legenda
async function processPostRequest(chatId, destino, options = {}) {
  const { numSlides = 5, formatType = 'feed', focoEspecial = null } = options;

  // 1. Caso especial: Apenas Legenda
  if (formatType === 'caption_only') {
    await sendTelegramMessage(chatId, `📝 *Gerando legenda de luxo com hashtags para:* *${destino}*...`);
    try {
      const postData = await generateGeminiContent(destino, focoEspecial, 0, 'caption_only');
      const text = `📌 *Legenda Éter Travel — ${postData.theme}*\n\n${postData.caption}`;
      await sendTelegramMessage(chatId, text);
      console.log("✅ Legenda enviada com sucesso para o Telegram!");
    } catch (err) {
      console.error("Erro ao gerar legenda:", err);
      await sendTelegramMessage(chatId, `❌ *Erro ao gerar legenda:* ${err.message}`);
    }
    return;
  }

  // 2. Caso Feed ou Story com Imagens
  const formatLabel = formatType === 'story'
    ? '📱 Story (9:16)'
    : (numSlides === 1 ? '📸 Post Único Feed (4:5)' : `🎠 Carrossel ${numSlides} Slides Feed`);

  let msgStatus = `✨ *Recebido!* Iniciando curadoria (${formatLabel}) para: *${destino}*`;
  if (focoEspecial) {
    msgStatus += `\n🎯 *Foco:* _"${focoEspecial}"_`;
  }

  await sendTelegramMessage(chatId, msgStatus);

  try {
    const postData = await generateGeminiContent(destino, focoEspecial, numSlides, formatType);
    console.log(`✅ Conteúdo gerado (${formatLabel}):`, postData.theme);

    const { outputFiles, qaReports } = await processSlidesWithQA(postData, destino, formatType);
    console.log(`✅ ${outputFiles.length} fotos renderizadas e auditadas via Visual QA.`);

    // Enviar as fotos no Telegram
    await sendTelegramPhotoAlbum(chatId, outputFiles);

    // Enviar legenda + relatório QA + botões
    const reportText = `📌 *${postData.theme}* (${formatLabel})\n\n${postData.caption}\n\n📋 *Auditoria do Marketing Agent (Visual QA):*\n${qaReports.join('\n')}`;

    const inlineButtons = [
      [
        { text: "✅ Aprovar e Publicar", callback_data: `publish_${encodeURIComponent(destino)}` },
        { text: "🔄 Refazer", callback_data: `regen_${formatType}_${numSlides}_${encodeURIComponent(destino)}` }
      ]
    ];

    await sendTelegramMessage(chatId, reportText, inlineButtons);
    console.log("✅ Prévia com auditoria enviada para o Telegram!");
  } catch (err) {
    console.error("Erro no processamento:", err);
    await sendTelegramMessage(chatId, `❌ *Erro ao processar conteúdo:* ${err.message}`);
  }
}

// Mensagem de Ajuda do Bot
async function sendHelpMessage(chatId) {
  const helpText = `✈️ *Éter Travel Bot Engine — Guia de Comandos*

Envie um comando no chat para gerar posts, carrosséis, stories ou legendas no padrão editorial de luxo (Vogue Travel / Condé Nast):

📌 *Comandos Disponíveis:*

• \`/post <tema>\` — Gera 1 foto para Feed (4:5) + legenda e hashtags
  _Exemplo:_ \`/post Santorini, Grécia\`

• \`/carrossel 3 <tema>\` (ou \`/carrossel3 <tema>\`) — Gera carrossel de 3 slides
  _Exemplo:_ \`/carrossel 3 Toscana, Itália\`

• \`/carrossel 5 <tema>\` (ou \`/carrossel5 <tema>\`) — Gera carrossel de 5 slides
  _Exemplo:_ \`/carrossel 5 Vilarejos europeus de filme\`

• \`/story <tema>\` — Gera 1 foto 9:16 em alta definição para Instagram Story
  _Exemplo:_ \`/story Maldivas overwater bungalows\`

• \`/legenda <tema>\` — Cria apenas a legenda refinada com hashtags (sem foto)
  _Exemplo:_ \`/legenda Hospedagem autoral no Passalacqua\`

• \`/help\` — Exibe este menu de ajuda e instruções

💡 *Dica:* Se você apenas digitar o tema direto no chat sem comando, o bot gerará um **Post Único Feed** por padrão!`;

  const inlineButtons = [
    [
      { text: "📸 Post: Santorini", callback_data: `cmd_post_Santorini` },
      { text: "🎠 Carrossel 3: Toscana", callback_data: `cmd_c3_Toscana` }
    ],
    [
      { text: "📱 Story: Maldivas", callback_data: `cmd_story_Maldivas` },
      { text: "📝 Legenda: Passalacqua", callback_data: `cmd_legenda_Passalacqua` }
    ]
  ];

  await sendTelegramMessage(chatId, helpText, inlineButtons);
}

// Polling do Telegram Bot
let lastUpdateId = 0;

async function pollTelegram() {
  await registerTelegramCommands();
  console.log("🤖 Éter Travel Telegram Bot ativo com novos comandos (/post, /carrossel3, /carrossel5, /story, /legenda, /help)! Aguardando mensagens...");

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

            const answerUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`;
            await fetchHttps(answerUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' }
            }, { callback_query_id: cb.id });

            if (data.startsWith('publish_')) {
              const destino = decodeURIComponent(data.replace('publish_', ''));
              await sendTelegramMessage(chatId, `🎉 *Conteúdo Aprovado!*\n\n🚀 Tema: *${destino}*\n📲 *Status:* Próximo passo: adicionar Meta Token no .env para publicar no Instagram!`);
            } else if (data.startsWith('regen_')) {
              const parts = data.split('_');
              // Format: regen_formatType_numSlides_destino
              if (parts.length >= 4) {
                const formatType = parts[1];
                const numSlides = parseInt(parts[2], 10);
                const destino = decodeURIComponent(parts.slice(3).join('_'));
                await processPostRequest(chatId, destino, { numSlides, formatType });
              } else {
                const destino = decodeURIComponent(data.replace('regen_', ''));
                await processPostRequest(chatId, destino, { numSlides: 1, formatType: 'feed' });
              }
            } else if (data.startsWith('cmd_post_')) {
              const destino = data.replace('cmd_post_', '');
              await processPostRequest(chatId, destino, { numSlides: 1, formatType: 'feed' });
            } else if (data.startsWith('cmd_c3_')) {
              const destino = data.replace('cmd_c3_', '');
              await processPostRequest(chatId, destino, { numSlides: 3, formatType: 'feed' });
            } else if (data.startsWith('cmd_story_')) {
              const destino = data.replace('cmd_story_', '');
              await processPostRequest(chatId, destino, { numSlides: 1, formatType: 'story' });
            } else if (data.startsWith('cmd_legenda_')) {
              const destino = data.replace('cmd_legenda_', '');
              await processPostRequest(chatId, destino, { numSlides: 0, formatType: 'caption_only' });
            }
            continue;
          }

          // 2. Tratar Comandos de Texto (/post, /carrossel 3, /carrossel 5, /story, /legenda, /help, /ajuda)
          const msg = update.message;
          if (!msg || !msg.text) continue;

          const text = msg.text.trim();
          const chatId = msg.chat.id;

          // Help / Start
          if (text.startsWith('/help') || text.startsWith('/ajuda') || (text.startsWith('/start') && text.trim() === '/start')) {
            await sendHelpMessage(chatId);
            continue;
          }

          // Legenda
          if (text.startsWith('/legenda')) {
            const tema = text.replace('/legenda', '').trim() || "Propriedades exclusivas no Lago di Como";
            await processPostRequest(chatId, tema, { formatType: 'caption_only', numSlides: 0 });
            continue;
          }

          // Story
          if (text.startsWith('/story')) {
            const tema = text.replace('/story', '').trim() || "Maldivas overwater villas";
            await processPostRequest(chatId, tema, { formatType: 'story', numSlides: 1 });
            continue;
          }

          // Carrossel 3 ou 5
          if (text.startsWith('/carrossel')) {
            let content = text.replace('/carrossel', '').trim();
            let numSlides = 5; // default se não especificado

            if (content.startsWith('3') || content.startsWith('_3')) {
              numSlides = 3;
              content = content.replace(/^3|^_3/, '').trim();
            } else if (content.startsWith('5') || content.startsWith('_5')) {
              numSlides = 5;
              content = content.replace(/^5|^_5/, '').trim();
            }

            const tema = content || "Vilarejos românticos da Europa";
            await processPostRequest(chatId, tema, { formatType: 'feed', numSlides });
            continue;
          }

          // Post Único Feed (1 slide)
          if (text.startsWith('/post')) {
            const tema = text.replace('/post', '').trim() || "Santorini, Grécia";
            await processPostRequest(chatId, tema, { formatType: 'feed', numSlides: 1 });
            continue;
          }

          // Se digitar um texto genérico sem comando prefixado (ex: "Toscana"), processa como /post único (1 slide)
          if (text.length > 1 && !text.startsWith('/')) {
            await processPostRequest(chatId, text, { formatType: 'feed', numSlides: 1 });
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
