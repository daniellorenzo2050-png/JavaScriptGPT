import { randomUUID } from "node:crypto";

const MODEL_IA = "@cf/zai-org/glm-5.2";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Proteção rigorosa: Bane o uso de fetch diretamente na raiz (GET /)
    // Se a intenção for carregar a página, deve ser um GET normal sem requisições scriptadas maliciosas.
    // Aqui garantimos que qualquer requisição POST deve ir para a rota correta de API ou sessão.
    if (url.pathname === "/") {
      if (request.method === "GET") {
        const response = new Response(getFrontendHTML(), {
          headers: { "Content-Type": "text/html;charset=UTF-8" }
        });
        return applySecurityHeaders(response);
      } else {
        // Bloqueia qualquer tentativa de fetch/POST direto na raiz "/"
        const blockedResponse = new Response(JSON.stringify({ error: "Endpoint bloqueado por política de segurança." }), {
          status: 403,
          headers: { "Content-Type": "application/json" }
        });
        return applySecurityHeaders(blockedResponse);
      }
    }

    // Gerenciamento de sessões via Durable Object para rotas de chat
    const sessionId = url.searchParams.get("sessionId") || randomUUID();
    const id = env.CHAT_SESSION.idFromName(sessionId);
    const stub = env.CHAT_SESSION.get(id);

    const backendResponse = await stub.fetch(request);
    return applySecurityHeaders(backendResponse);
  }
};

// Função centralizada que injeta todos os headers HTTP de segurança máxima (CSP, HSTS, X-Frame-Options, etc.)
function applySecurityHeaders(response) {
  const newHeaders = new Headers(response.headers);

  // HTTP Strict Transport Security (HSTS) - Força HTTPS por 2 anos com subdomínios e preload
  newHeaders.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  // Content Security Policy (CSP) blindada - Restringe estritamente fontes de scripts e conexões
  // Permitimos apenas o Tailwind via CDN e scripts inline necessários para a UI do chat
  newHeaders.set(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; " +
    "connect-src 'self'; " +
    "img-src 'self' data:; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self'; " +
    "frame-ancestors 'none';"
  );

  // Proteção contra Clickjacking
  newHeaders.set("X-Frame-Options", "DENY");

  // Prevenção contra MIME-type sniffing
  newHeaders.set("X-Content-Type-Options", "nosniff");

  // Controle de Referrer rigoroso
  newHeaders.set("Referrer-Policy", "no-referrer");

  // Política de permissões de recursos do navegador (desativa câmera, mic, geolocalização)
  newHeaders.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  // Proteção contra Cross-Site Scripting (XSS) legada para navegadores antigos
  newHeaders.set("X-XSS-Protection", "1; mode=block");

  // Remove headers que revelam informações do servidor
  newHeaders.delete("X-Powered-By");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}

export class ChatSessionDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.state.blockConcurrencyWhile(async () => {
      this.initDatabase();
    });
  }

  initDatabase() {
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        role TEXT,
        content TEXT
      )
    `);
  }

  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "GET") {
      const history = [...this.state.storage.sql.exec("SELECT role, content FROM messages")];
      return Response.json({ sessionId: this.state.id.toString(), history });
    }

    try {
      const body = await request.json();
      const userPrompt = body.prompt;

      if (!userPrompt) {
        return new Response(JSON.stringify({ error: "O campo 'prompt' é obrigatório." }), { status: 400 });
      }

      let customSystemPrompt = await this.env.JavaScriptKV.get("system_prompt_javascriptgpt");
      const systemPrompt = customSystemPrompt || "Você é o JavaScriptGPT, um assistente especialista em JavaScript, TypeScript e desenvolvimento web moderno. Forneça códigos limpos e utilize padrões ES6+.";

      this.state.storage.sql.exec("INSERT INTO messages (role, content) VALUES (?, ?)", "user", userPrompt);

      const historyRows = [...this.state.storage.sql.exec("SELECT role, content FROM messages")];
      const messages = [{ role: "system", content: systemPrompt }, ...historyRows];

      const aiResponse = await this.env.AI.run(MODEL_IA, {
        messages: messages,
        temperature: 0.2,
        max_completion_tokens: 4096,
        reasoning_effort: "high"
      });

      const respostaIA = aiResponse.response || "Erro ao gerar resposta.";

      this.state.storage.sql.exec("INSERT INTO messages (role, content) VALUES (?, ?)", "assistant", respostaIA);

      const sessionStrId = this.state.id.toString();
      await this.env.JavaScriptD1.prepare(
        `INSERT INTO global_chats (session_id, role, content, created_at) VALUES (?, ?, ?, datetime('now'))`
      ).bind(sessionStrId, "user", userPrompt).run();

      await this.env.JavaScriptD1.prepare(
        `INSERT INTO global_chats (session_id, role, content, created_at) VALUES (?, ?, ?, datetime('now'))`
      ).bind(sessionStrId, "assistant", respostaIA).run();

      return Response.json({
        sessionId: sessionStrId,
        model: MODEL_IA,
        resposta: respostaIA
      }, {
        headers: { "Content-Type": "application/json" }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
  }
}

function getFrontendHTML() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JavaScriptGPT - Secure Enterprise Edition</title>
    <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
</head>
<body class="bg-slate-950 text-slate-100 h-screen flex flex-col justify-between font-sans">
    <header class="bg-slate-900 border-b border-slate-800 p-4 text-center">
        <h1 class="text-xl font-bold text-yellow-400">⚡ JavaScriptGPT</h1>
        <p class="text-xs text-slate-400">Proteção Máxima: HSTS + CSP Blindado + Durable Objects + D1 + KV + GLM-5.2</p>
    </header>

    <main id="chat-container" class="flex-1 overflow-y-auto p-4 space-y-4 max-w-3xl w-full mx-auto">
        <div class="flex items-start space-x-3">
            <div class="bg-yellow-500 text-slate-950 font-bold px-3 py-1 rounded-full text-xs">AI</div>
            <div class="bg-slate-900 p-3 rounded-lg border border-slate-800 text-sm max-w-[80%]">
                Ambiente blindado com cabeçalhos de segurança máximos ativos. Como posso ajudar com seu código hoje?
            </div>
        </div>
    </main>

    <footer class="bg-slate-900 border-t border-slate-800 p-4">
        <form id="chat-form" class="max-w-3xl mx-auto flex gap-2">
            <input type="text" id="user-input" placeholder="Digite sua dúvida de JavaScript/TypeScript..." 
                class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-yellow-400">
            <button type="submit" class="bg-yellow-500 text-slate-950 font-semibold px-5 py-2 rounded-lg text-sm hover:bg-yellow-400 transition">Enviar</button>
        </form>
    </footer>

    <script>
        const sessionId = crypto.randomUUID();
        const chatContainer = document.getElementById('chat-container');
        const chatForm = document.getElementById('chat-form');
        const userInput = document.getElementById('user-input');

        chatForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = userInput.value.trim();
            if (!text) return;

            appendMessage('Você', text, 'bg-slate-800 text-right');
            userInput.value = '';

            try {
                // Requisições de chat utilizam a query string com sessionId, evitando requisições vazias na raiz '/'
                const res = await fetch(\`/?sessionId=\${sessionId}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: text })
                });
                const data = await res.json();
                appendMessage('JavaScriptGPT', data.resposta || data.error, 'bg-slate-900 border border-slate-800 text-yellow-300');
            } catch (err) {
                appendMessage('Erro', 'Falha ao comunicar com o servidor.', 'bg-red-900 text-white');
            }
        });

        function appendMessage(sender, text, styleClass) {
            const div = document.createElement('div');
            div.className = \`p-3 rounded-lg text-sm max-w-[85%] \${styleClass} mx-4 my-2\`;
            div.innerHTML = \`<strong>\${sender}:</strong> <p class="mt-1 whitespace-pre-wrap">\${text}</p>\`;
            chatContainer.appendChild(div);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    </script>
</body>
</html>`;
}
