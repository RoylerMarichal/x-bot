// --- CONFIGURACIÓN GLOBAL ---
let state = {
  isRunning: false,
  config: {},
  apiKey: '',
  stats: { likes: 0, comments: 0, follows: 0 }
};
let timer = null;
let modalOpenedAt = null;

// --- UI HELPERS ---
const statusPanel = document.createElement('div');
statusPanel.style.cssText = `
  position: fixed; bottom: 20px; right: 20px;
  background: rgba(0, 0, 0, 0.9); color: white;
  padding: 12px; border-radius: 8px; font-family: sans-serif;
  z-index: 99999; font-size: 13px; display: none;
  border: 1px solid #1da1f2; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
  max-width: 250px; pointer-events: none;
`;
document.body.appendChild(statusPanel);

function updateStatus(text) {
  statusPanel.innerHTML = `<strong>🤖 X-Bot</strong><br>${text}<br>
  <div style="font-size:10px; color:#aaa; margin-top:5px; display:flex; gap:8px;">
    <span>❤️ ${state.stats.likes}</span>
    <span>💬 ${state.stats.comments}</span>
    <span>➕ ${state.stats.follows}</span>
  </div>`;
  statusPanel.style.display = 'block';
}

// --- INIT ---
chrome.storage.local.get(['isRunning', 'xConfig', 'apiKey'], (res) => {
  if (res.isRunning && res.xConfig) {
    state.isRunning = true;
    state.config = res.xConfig;
    state.apiKey = res.apiKey;

    console.log("X-Bot Iniciado", state.config);
    updateStatus("Arrancando motores...");
    runTwitterLoop();
  }
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isRunning) {
    if (!changes.isRunning.newValue) {
      state.isRunning = false;
      if (timer) clearTimeout(timer);
      updateStatus("Detenido.");
      setTimeout(() => statusPanel.style.display = 'none', 3000);
    } else {
      // Se reactivó
      chrome.storage.local.get(['xConfig', 'apiKey'], (res) => {
        state.isRunning = true;
        state.config = res.xConfig;
        state.apiKey = res.apiKey;
        runTwitterLoop();
      });
    }
  }
});

// --- OPENAI HELPER ---
async function generateAIComment(text) {
  if (!state.apiKey) return null;
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${state.apiKey}` },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "Act as a genuine user of X.\nCONTEXT: You are an active member of FounderLog.club, the private space where founders document notes, quotes, links, and micro-actions to refine their thinking and execute without distractions. There, you organize public/private collections, follow other founders to see what they truly save, and turn notes like \"Talk to customers\" into actionable reminders thanks to the Micro-Action Engine.\nRULES:\n1. Detect the post's language and ALWAYS reply in the same language.\n2. Before replying, assess if the post has quality (real learning, useful insight, concrete experience, or honest question). If not, reply exactly 'SKIP'.\n3. Only comment if you can add actionable insight; max 30 words, casual tone, no hashtags.\n4. When the topic touches on execution, focus, productivity, founders' notes, or learning, naturally mention FounderLog.club as the place where founders save what they truly value, organize collections, and activate micro-actions.\n5. No quotes, no invites to DM, and no forced emojis." },
          { role: "user", content: `Tweet: "${text}"` }
        ],
        max_tokens: 60
      })
    });
    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();
    
    if (!content || content.includes('SKIP')) return null;
    return content.replace(/"/g, '');
  } catch (e) {
    console.error("AI Error", e);
    return null;
  }
}

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

function forceCloseModal(modal) {
  try {
    const closeButtons = [
      ...modal.querySelectorAll('[data-testid="app-bar-close"]'),
      ...modal.querySelectorAll('[aria-label="Close"]'),
      ...modal.querySelectorAll('[aria-label="Cerrar"]')
    ];

    if (closeButtons.length) {
      closeButtons.forEach(btn => btn.click());
    } else {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
      document.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true }));
    }
    updateStatus("Modal forzado a cerrar ⏱️");
  } catch (error) {
    console.warn('No se pudo cerrar el modal automáticamente', error);
  }
}

function monitorModals() {
  const modal = document.querySelector('[role="dialog"]');
  if (modal && !modalOpenedAt) {
    modalOpenedAt = Date.now();
  } else if (!modal) {
    modalOpenedAt = null;
  }

  if (modal && modalOpenedAt && Date.now() - modalOpenedAt >= 10000) {
    forceCloseModal(modal);
    modalOpenedAt = null;
  }
}

setInterval(monitorModals, 1000);

// ==========================================
// DRIVER TWITTER / X
// ==========================================
async function runTwitterLoop() {
  if (!state.isRunning) return;

  try {
    const tweets = Array.from(document.querySelectorAll('article'));
    // Buscar un tweet visible que no hayamos procesado
    const target = tweets.find(t => {
      const r = t.getBoundingClientRect();
      return r.top > 50 && r.top < window.innerHeight - 100 && !t.hasAttribute('data-bot-proc');
    });

    if (target) {
      target.setAttribute('data-bot-proc', 'true');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await wait(1000);

      const alreadyLiked = !!target.querySelector('[data-testid="unlike"]');

      if (alreadyLiked) {
        updateStatus("Saltando post ya likeado 👍");
      } else {
        // 1. LIKE
        const likeBtn = target.querySelector('[data-testid="like"]');
        if (likeBtn) {
          likeBtn.click();
          state.stats.likes++;
          updateStatus("Like ❤️");
          await wait(1000);
        }

        // 2. FOLLOW (Si está habilitado)
        if (state.config.follow) {
          const userLink = target.querySelector('[data-testid="User-Name"] a');
          if (userLink) {
            // Hover para mostrar card de usuario
            updateStatus("Check follow...");
            userLink.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
            await wait(2500); // Esperar popup
            
            // Buscar botón seguir en el documento (el popup se renderiza en portal)
            const followBtn = Array.from(document.querySelectorAll('[role="button"]'))
              .find(b => {
                 const txt = b.innerText.toLowerCase();
                 return txt === 'follow' || txt === 'seguir';
              });
              
            if (followBtn) {
              followBtn.click();
              state.stats.follows++;
              updateStatus("Seguido ➕");
              await wait(1000);
            }
            // Quitar hover
            userLink.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }));
          }
        }

        // 3. COMMENT (Si está habilitado y hay API Key)
        if (state.config.comments && state.apiKey) {
           const txtElement = target.querySelector('[data-testid="tweetText"]');
           if (txtElement) {
             const txt = txtElement.innerText;
             updateStatus("Pensando 🧠...");
             
             const comment = await generateAIComment(txt);
             
             if (comment) {
               const replyBtn = target.querySelector('[data-testid="reply"]');
               if (replyBtn) {
                 replyBtn.click();
                 await wait(2000);
                 
                 // Editor de respuesta
                 const editor = document.querySelector('[data-testid="tweetTextarea_0"]');
                 if (editor) {
                   editor.focus();
                   document.execCommand('insertText', false, comment);
                   await wait(1000);
                   
                   const sendBtn = document.querySelector('[data-testid="tweetButton"]');
                   if (sendBtn) {
                      sendBtn.click();
                      state.stats.comments++;
                      updateStatus("Comentado 💬");
                      await wait(2000);
                   }
                 }
               }
             }
           }
        }
      }
      
      // Esperar un poco antes de seguir
      await wait(1000);

    } else {
      // Si no hay target visible, scroll
      window.scrollBy({ top: 400, behavior: 'smooth' });
    }

  } catch (e) {
    console.error("Bot Error", e);
    updateStatus("Error: " + e.message);
  }

  // Loop
  const delay = (state.config.interval * 1000) || 5000;
  timer = setTimeout(runTwitterLoop, delay + Math.random() * 1000);
}
