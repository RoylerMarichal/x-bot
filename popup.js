document.addEventListener('DOMContentLoaded', () => {
  const btnStart = document.getElementById('btnStart');
  const btnStop = document.getElementById('btnStop');
  const statusMessage = document.getElementById('statusMessage');
  
  // Inputs
  const hashtagInput = document.getElementById('hashtag');
  const intervalInput = document.getElementById('interval');
  const enableComments = document.getElementById('enableComments');
  const enableFollow = document.getElementById('enableFollow');
  const apiKeyInput = document.getElementById('apiKey');

  // Cargar configuración guardada
  chrome.storage.local.get(['xConfig', 'apiKey', 'isRunning'], (result) => {
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    
    if (result.xConfig) {
      hashtagInput.value = result.xConfig.hashtag || '';
      intervalInput.value = result.xConfig.interval || 5;
      enableComments.checked = result.xConfig.comments || false;
      enableFollow.checked = result.xConfig.follow || false;
    }

    if (result.isRunning) {
      setRunningState(true);
    }
  });

  // Iniciar Bot
  btnStart.addEventListener('click', async () => {
    const hashtag = hashtagInput.value.trim();
    const apiKey = apiKeyInput.value.trim();
    
    if (!hashtag) {
      showStatus("Ingresa un hashtag por favor", true);
      return;
    }

    if (enableComments.checked && !apiKey) {
      showStatus("Se requiere API Key para comentarios", true);
      return;
    }

    // Guardar config
    const config = {
      hashtag,
      interval: parseInt(intervalInput.value) || 5,
      comments: enableComments.checked,
      follow: enableFollow.checked
    };

    await chrome.storage.local.set({
      xConfig: config,
      apiKey: apiKey,
      isRunning: true
    });

    setRunningState(true);

    // Navegar a X
    const searchUrl = `https://x.com/search?q=%23${hashtag}&src=typed_query&f=live`;
    
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tab = tabs[0];
      if (tab.url.includes("x.com") || tab.url.includes("twitter.com")) {
        chrome.tabs.update(tab.id, { url: searchUrl });
      } else {
        chrome.tabs.create({ url: searchUrl });
      }
    });
  });

  // Detener Bot
  btnStop.addEventListener('click', async () => {
    await chrome.storage.local.set({ isRunning: false });
    setRunningState(false);
  });

  function setRunningState(running) {
    if (running) {
      btnStart.disabled = true;
      btnStop.disabled = false;
      document.querySelector('.container').style.opacity = '0.9';
      showStatus("BOT ACTIVO 🚀");
    } else {
      btnStart.disabled = false;
      btnStop.disabled = true;
      document.querySelector('.container').style.opacity = '1';
      showStatus("Detenido");
    }
  }

  function showStatus(msg, error = false) {
    statusMessage.textContent = msg;
    statusMessage.style.color = error ? '#dc3545' : '#657786';
  }
});
