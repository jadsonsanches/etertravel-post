require('dotenv').config();
const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`;

const systemPrompt = `Você é o Copywriter Sênior da Éter Travel (agência de turismo sob medida de alto padrão).
Crie um carrossel educativo e de altíssimo luxo sobre o destino: "Santorini, Grécia".

DIRETRIZES DE MARCA:
- PROIBIDO usar palavras de turismo em massa: "incrível", "maravilhoso", "imperdível", "dica de ouro", "promoção", "pacote", "desconto", "barato".
- OBRIGATÓRIO usar vocabulário refinado: "curadoria", "singular", "privilégio", "atemporal", "sob medida", "roteiro autoral", "hospedagem boutique".

Retorne APENAS um JSON válido no seguinte formato:
{
  "theme": "Nome do Tema Refinado",
  "unsplash_keyword": "Palavra-chave em inglês para fotos HD no Unsplash",
  "caption": "Legenda completa do post com narrativa persuasiva de luxo e CTA para o WhatsApp",
  "slides": [
    {
      "slide_index": 1,
      "tag": "ROTEIRO EXCLUSIVO",
      "title": "Título Principal Impactante",
      "body": "Texto inspirador curto de capa",
      "highlight": null
    },
    {
      "slide_index": 2,
      "tag": "CURADORIA ÉTER",
      "title": "Subtítulo do Card 1",
      "body": "Descrição detalhada do aspecto exclusivo do destino.",
      "highlight": "Dica exclusiva Éter Travel"
    }
  ]
}`;

const payload = {
  contents: [{ parts: [{ text: systemPrompt }] }]
};

const req = https.request(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      console.log("RAW TEXT FROM GEMINI:", rawText.substring(0, 300));
      
      rawText = rawText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      const firstBrace = rawText.indexOf('{');
      const lastBrace = rawText.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1) {
        rawText = rawText.substring(firstBrace, lastBrace + 1);
      }
      
      const parsed = JSON.parse(rawText);
      console.log("✅ JSON PARSED SUCCESSFUL!");
      console.log("Theme:", parsed.theme);
      console.log("Unsplash Keyword:", parsed.unsplash_keyword);
      console.log("Slides count:", parsed.slides.length);
    } catch (e) {
      console.error("❌ Parse Error:", e.message);
      console.log("Full Raw Body:", body);
    }
  });
});

req.on('error', err => console.error("Req error:", err));
req.write(JSON.stringify(payload));
req.end();
