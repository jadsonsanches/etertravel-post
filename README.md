# ✈️ Éter Travel - Motor de Automação de Posts do Instagram

Repositório dedicado ao motor de inteligência artificial e geração automática de carrosséis de luxo para o Instagram da **Éter Travel**.

---

## 🚀 Como Iniciar em 3 Passos Simples

### Passo 1: Configurar Variáveis de Ambiente
Copie o arquivo `.env.example` para `.env` e preencha suas chaves gratuitas:
```bash
cp .env.example .env
```
- **Telegram Bot Token:** Obtenha com o `@BotFather` no Telegram.
- **Gemini API Key:** Obtenha no [Google AI Studio](https://aistudio.google.com/).
- **Unsplash Access Key:** Obtenha no [Unsplash Developers](https://unsplash.com/developers).
- **Meta Token:** Token da Meta Graph API para postagem no Instagram Business.

---

### Passo 2: Subir o Orquestrador n8n
Com o Docker instalado, execute na pasta do projeto:
```bash
docker compose up -d
```
Acesse o painel do n8n em seu navegador: **`http://localhost:5678`**

---

### Passo 3: Importar o Workflow do Telegram Bot
1. No painel do n8n, clique em **Workflows** > **Import from File**.
2. Selecione o arquivo em: `./workflows/n8n-instagram-bot-workflow.json`.
3. Ative o workflow.

---

## 📲 Como Usar no Dia a Dia

Abra o chat com seu bot no Telegram e envie:
```text
/post Santorini, Grécia
```
ou especificando um foco:
```text
/post Toscana, Itália --foco "Vinhedos seculares e hotéis boutique"
```

O bot responderá gerando o carrossel em ~40 segundos e enviará a pré-visualização dos slides 1080x1350 + legenda com os botões `[✅ Publicar Agora]`, `[🗓️ Agendar]` e `[🔄 Regerar]`.
