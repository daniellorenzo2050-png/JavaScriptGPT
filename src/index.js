export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. Se a requisição for GET, retorna a Interface HTML5 com layout de tela cheia
    if (request.method === 'GET') {
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JavaScriptGPT - Qwen2.5-Coder</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        /* Ajustes finos para comportamento de aplicativo de tela cheia */
        * {
            box-sizing: border-box;
        }
        body {
            margin: 0;
            padding: 0;
            height: 100vh;
            height: 100dvh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background-color: #020617;
            color: #f8fafc;
            font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
        }
        #chat-container {
            flex: 1;
            overflow-y: auto;
            scroll-behavior: smooth;
        }
    </style>
</head>
<body class="bg-slate-950 text-slate-100">
    
    <header class="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-md shrink-0">
        <div class="flex items-center gap-3">
            <div class="bg-yellow-500 text-slate-950 font-bold px-3 py-1 rounded-md text-sm">JS-GPT</div>
            <div>
                <h1 class="font-bold text-lg leading-tight">JavaScriptGPT</h1>
                <p class="text-xs text-slate-400">Powered by Qwen2.5-Coder-32B & Cloudflare Workers</p>
            </div>
        </div>
        <div class="text-xs bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-300">
            🟢 Status: Online na Edge
        </div>
    </header>

    <main id="chat-container" class="p-4 space-y-4 max-w-4xl w-full mx-auto">
        <div class="flex items-start gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div class="bg-yellow-500 text-slate-950 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">IA</div>
            <div class="text-sm space-y-2">
                <p class="font-semibold text-yellow-400">Olá! Eu sou o JavaScriptGPT.</p>
                <p class="text-slate-300">Estou rodando com o modelo <strong>Qwen2.5-Coder-32B</strong> na infraestrutura global da Cloudflare. Como posso ajudar no seu código hoje?</p>
            </div>
        </div>
    </main>

    <footer class="bg-slate-900 border-t border-slate-800 p-4 shadow-lg shrink-0">
        <form id="chat-form" class="max-w-4xl mx-auto flex gap-3">
            <input 
                type="text" 
                id="user-input" 
                placeholder="Ex: Crie um custom hook em React..." 
                class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 text-slate-100 placeholder-slate-500"
                required
            >
            <button 
                type="submit" 
                id="send-btn"
                class="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-semibold px-6 py-3 rounded-lg text-sm transition flex items-center justify-center min-w-[100px]"
            >
                Enviar
            </button>
        </form>
    </footer>

    <script>
        const form = document.getElementById('chat-form');
        const input = document.getElementById('user-input');
        const container = document.getElementById('chat-container');
        const sendBtn = document.getElementById('send-btn');

        const API_TOKEN = "jsgpt_live_99f8a7b6c5d4e3f2a100112233445566";

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const prompt = input.value.trim();
            if (!prompt) return;

            appendMessage(prompt, 'user');
            input.value = '';
            input.disabled = true;
            sendBtn.disabled = true;
            sendBtn.textContent = 'Pensando...';

            const aiMessageDiv = appendMessage('', 'ai');
            const contentDiv = aiMessageDiv.querySelector('.message-content');

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${API_TOKEN}\`
                    },
                    body: JSON.stringify({ prompt })
                });

                if (!response.ok) throw new Error('Erro na requisição à API.');

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let fullText = '';

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    
                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.replace('data: ', '').trim();
                            if (dataStr === '[DONE]') continue;
                            try {
                                const json = JSON.parse(dataStr);
                                if (json.response) {
                                    fullText += json.response;
                                    contentDiv.innerHTML = marked.parse(fullText);
                                    container.scrollTop = container.scrollHeight;
                                }
                            } catch (err) {}
                        }
                    }
                }
            } catch (err) {
                contentDiv.innerHTML = \`<span class="text-red-400">Erro: \${err.message}</span>\`;
            } finally {
                input.disabled = false;
                sendBtn.disabled = false;
                sendBtn.textContent = 'Enviar';
                input.focus();
            }
        });

        function appendMessage(text, sender) {
            const isUser = sender === 'user';
            const wrapper = document.createElement('div');
            wrapper.className = \`flex items-start gap-3 \${isUser ? 'flex-row-reverse' : ''}\`;
            
            wrapper.innerHTML = \`
                <div class="\${isUser ? 'bg-cyan-600 text-white' : 'bg-yellow-500 text-slate-950'} font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    \${isUser ? 'EU' : 'IA'}
                </div>
                <div class="max-w-[80%] bg-\${isUser ? 'slate-800' : 'slate-900/60'} border border-slate-800 p-4 rounded-xl text-sm leading-relaxed message-content overflow-x-auto">
                    \${isUser ? escapeHtml(text) : '<span class="animate-pulse text-slate-400">Digitando...</span>'}
                </div>
            \`;
            container.appendChild(wrapper);
            container.scrollTop = container.scrollHeight;
            return wrapper;
        }

        function escapeHtml(str) {
            return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
    </script>
</body>
</html>`;

      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

    // 2. Se a requisição for POST, processa a API via Qwen2.5-Coder-32B
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Método não permitido.' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const authHeader = request.headers.get('Authorization');
    const expectedToken = env.JSGPT_API_TOKEN || "jsgpt_live_99f8a7b6c5d4e3f2a100112233445566";

    if (!authHeader || authHeader !== `Bearer ${expectedToken}`) {
      return new Response(JSON.stringify({ error: 'Unauthorized: API Token inválido ou ausente.' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const body = await request.json();
      const userPrompt = body.prompt || "Olá!";

      const aiResponse = await env.AI.run('@cf/qwen/qwen2.5-coder-32b-instruct', {
        messages: [
          { 
            role: "system", 
            content: "Você é o JavaScriptGPT, um engenheiro de software sênior e especialista em JavaScript, TypeScript, React e Node.js. Responda de forma clara e limpa." 
          },
          { 
            role: "user", 
            content: userPrompt 
          }
        ],
        stream: true,
        temperature: 0.2,
        max_tokens: 3072
      });

      return new Response(aiResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Erro interno ao processar a IA', details: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
