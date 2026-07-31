const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

/**
 * Script de teste local para renderização de slides 1080x1350 via Puppeteer
 */
async function renderCarouselSlide(data) {
  const templatePath = path.join(__dirname, '..', 'templates', 'carousel-slide.html');
  let htmlContent = fs.readFileSync(templatePath, 'utf8');

  // Injeção de variáveis
  htmlContent = htmlContent
    .replace('{{UNSPLASH_IMAGE_URL}}', data.bgImage || 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?q=80&w=1080&auto=format&fit=crop')
    .replace('{{SLIDE_TAG}}', data.tag || 'ROTEIRO EXCLUSIVO')
    .replace('{{SLIDE_TITLE}}', data.title || 'Santorini Além do Clichê')
    .replace('{{SLIDE_BODY}}', data.body || 'Descubra como vivenciar a ilha grega com privacidade absoluta e suítes com vista para a caldeira.')
    .replace('{{CURRENT_PAGE}}', data.currentPage || '1')
    .replace('{{TOTAL_PAGES}}', data.totalPages || '5');

  if (data.highlight) {
    htmlContent = htmlContent
      .replace('{{#IF_HIGHLIGHT}}', '')
      .replace('{{/IF_HIGHLIGHT}}', '')
      .replace('{{SLIDE_HIGHLIGHT}}', data.highlight);
  } else {
    htmlContent = htmlContent.replace(/{{#IF_HIGHLIGHT}}[\s\S]*?{{\/IF_HIGHLIGHT}}/, '');
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  // Resolução exata de 1080x1350 com deviceScaleFactor 2 para qualidade 4K Retina
  await page.setViewport({
    width: 1080,
    height: 1350,
    deviceScaleFactor: 2
  });

  await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

  const outputPath = path.join(__dirname, '..', 'output_slide_test.jpg');
  await page.screenshot({
    path: outputPath,
    type: 'jpeg',
    quality: 95
  });

  await browser.close();
  console.log(`✅ Slide renderizado com sucesso em: ${outputPath}`);
}

// Teste de execução se rodar diretamente
if (require.main === module) {
  renderCarouselSlide({
    title: 'Santorini: O Guia de Luxo Definitivo',
    tag: 'DESTINO DOS SONHOS',
    body: 'Conheça as vilas exclusivas, iates privativos e a alta gastronomia grega com a Éter Travel.',
    highlight: 'Reservas exclusivas em hotéis boutique com piscina na caldeira.',
    currentPage: 1,
    totalPages: 5
  });
}
