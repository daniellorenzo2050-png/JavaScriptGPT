export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR" class="h-full">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JavaScriptGPT - Qwen2.5-VL</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <style>
        * { box-sizing: border-box; }
        body {
            margin: 0; padding: 0; height: 100vh; height: 100dvh;
            display: flex; flex-direction: column; overflow: hidden;
            background-color: #020617; color: #f8fafc;
            font-family: ui-sans-serif, system-ui, sans-serif;
        }
        #chat-container { flex: 1; overflow-y: auto; scroll-behavior: smooth; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100">
    
    <header class="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center shadow-md shrink-0">
        <div class="flex items-center gap-3">
            <div class="bg-yellow-500 text-slate-950 font-bold px-3 py-1 rounded-md text-sm">JS-GPT VL</div>
            <div>
                <h1 class="font-bold text-lg leading-tight">JavaScriptGPT (Multimodal)</h1>
                <p class="text-xs text-slate-400">Powered by Qwen2.5-VL & Cloudflare Edge</p>
            </div>
        </div>
        <div class="text-xs bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700 text-slate-300">
            🟢 Visão Ativa
        </div>
    </header>

    <main id="chat-container" class="p-4 space-y-4 max-w-4xl w-full mx-auto">
        <div class="flex items-start gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
            <div class="bg-yellow-500 text-slate-950 font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">IA</div>
            <div class="text-sm space-y-2">
                <p class="font-semibold text-yellow-400">Olá! Eu sou o JavaScriptGPT com Visão.</p>
                <p class="text-slate-300">Envie prints de códigos, erros de console ou layouts para eu analisar e ajudar na correção.</p>
            </div>
        </div>
    </main>

    <footer class="bg-slate-900 border-t border-slate-800 p-4 shadow-lg shrink-0">
        <form id="chat-form" class="max-w-4xl mx-auto flex flex-col gap-2">
            <div id="image-preview-container" class="hidden flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800 w-fit">
                <span id="image-name" class="text-xs text-yellow-400 truncate max-w-xs"></span>
                <button type="button" id="remove-image" class="text-slate-400 hover:text-red-400 text-xs font-bold px-1">✕</button>
            </div>
            <div class="flex gap-3">
                <label class="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-3 rounded-lg text-sm cursor-pointer flex items-center justify-center transition border border-slate-700">
                    📷
                    <input type="file" id="image-input" accept="image/*" class="hidden">
                </label>
                <input 
                    type="text" 
                    id="user-input" 
                    placeholder="Faça uma pergunta ou envie uma imagem..." 
                    class="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-yellow-500 text-slate-100 placeholder-slate-500"
                >
                <button 
                    type="submit" 
                    id="send-btn"
                    class="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-semibold px-6 py-3 rounded-lg text-sm transition flex items-center justify-center min-w-[100px]"
                >
                    Enviar
                </button>
            </div>
        </form>
    </footer>

    <script>
        const form = document.getElementById('chat-form');
        const input = document.getElementById('user-input');
        const container = document.getElementById('chat-container');
        const sendBtn = document.getElementById('send-btn');
        const imageInput = document.getElementById('image-input');
        const imagePreviewContainer = document.getElementById('image-preview-container');
        const imageNameSpan = document.getElementById('image-name');
        const removeImageBtn = document.getElementById('remove-image');

        const API_TOKEN = "jsgpt_live_99f8a7b6c5d4e3f2a100112233445566";
        let base64Image = null;

        // Função para redimensionar imagem automaticamente antes de gerar o base64
        imageInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                const img = new Image();
                img.onload = function() {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Converte para JPEG otimizado
                    base64Image = canvas.toDataURL('image/jpeg', 0.8);
                    imageNameSpan.textContent = file.name;
                    imagePreviewContainer.classList.remove('hidden');
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        });

        removeImageBtn.addEventListener('click', () => {
            base64Image = null;
            imageInput.value = '';
            imagePreviewContainer.classList.add('hidden');
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const prompt = input.value.trim();
            if (!prompt && !base64Image) return;

            appendMessage(prompt, 'user', base64Image);
            
            const currentPrompt = prompt;
            const currentImage = base64Image;

            input.value = '';
            base64Image = null;
            imageInput.value = '';
            imagePreviewContainer.classList.add('hidden');
            
            input.disabled = true;
            sendBtn.disabled = true;
            sendBtn.textContent = 'Analisando...';

            const aiMessageDiv = appendMessage('', 'ai');
            const contentDiv = aiMessageDiv.querySelector('.message-content');

            try {
                const response = await fetch(window.location.href, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${API_TOKEN}\`
                    },
                    body: JSON.stringify({ prompt: currentPrompt, image: currentImage })
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.details || errData.error || 'Erro na requisição à API Multimodal.');
                }

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

        function appendMessage(text, sender, img = null) {
            const isUser = sender === 'user';
            const wrapper = document.createElement('div');
            wrapper.className = \`flex items-start gap-3 \${isUser ? 'flex-row-reverse' : ''}\`;
            
            let imgHtml = img ? \`<img src="\${img}" class="max-w-xs rounded-lg mb-2 border border-slate-700">\` : '';

            wrapper.innerHTML = \`
                <div class="\${isUser ? 'bg-cyan-600 text-white' : 'bg-yellow-500 text-slate-950'} font-bold w-8 h-8 rounded-full flex items-center justify-center shrink-0">
                    \${isUser ? 'EU' : 'IA'}
                </div>
                <div class="max-w-[80%] bg-\${isUser ? 'slate-800' : 'slate-900/60'} border border-slate-800 p-4 rounded-xl text-sm leading-relaxed message-content overflow-x-auto">
                    \${imgHtml}
                    \${isUser ? escapeHtml(text) : '<span class="animate-pulse text-slate-400">Analisando imagem e código...</span>'}
                </div>
            \`;
            container.appendChild(wrapper);
            container.scrollTop = container.scrollHeight;
            return wrapper;
        }

        function escapeHtml(str) {
            return str ? str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;") : '';
        }
    </script>
</body>
</html>`;

      return new Response(htmlContent, {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' }
      });
    }

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
      const userPrompt = body.prompt || "Analise esta imagem.";
      const base64Image = body.image;

      const aiPayload = {
        prompt: userPrompt,
        stream: true
      };

      if (base64Image) {
        try {
          const base64Data = base64Image.split(',')[1] || base64Image;
          const binaryString = atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          aiPayload.image = Array.from(bytes);
        } catch (imgErr) {
          return new Response(JSON.stringify({ error: 'Falha ao processar os bytes da imagem.', details: imgErr.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }

      const aiResponse = await env.AI.run('@cf/qwen/qwen2.5-vl-7b-instruct', aiPayload);

      return new Response(aiResponse, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (err) {
      return new Response(JSON.stringify({ error: 'Erro interno ao processar a visão da IA', details: err.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
};
