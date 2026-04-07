// KungRC Karaoke Queue - service_worker.js
// Background / queue + settings + autoplay
// Version: 1.6.1

const IDLE_URL = "https://www.youtube.com/watch?v=epSQTJsMO9g";

const DEFAULT_SETTINGS = {
  autoPlayNext: true,
  allowDuplicates: false,
  defaultSearchMode: "karaoke",
  thaiKeyMode: "auto",
  channelBias: true,
  onlyKaraokeChannels: false,
  instrumentalMode: false,
  killUntil: 0
};

async function getLocal(keys){ return await chrome.storage.local.get(keys); }
async function setLocal(obj){ return await chrome.storage.local.set(obj); }

async function getState(){
  const data = await getLocal(["queue","settings"]);
  const s = data.settings && typeof data.settings === "object" ? data.settings : {};
  return {
    queue: Array.isArray(data.queue) ? data.queue : [],
    settings: { ...DEFAULT_SETTINGS, ...s }
  };
}

async function setQueue(queue){
  await setLocal({ queue });
}

async function setSettings(patch){
  const data = await getLocal(["settings"]);
  const s = data.settings && typeof data.settings === "object" ? data.settings : {};
  await setLocal({ settings: { ...s, ...patch } });
}

async function addToHistory(url){
  const data = await getLocal(["history"]);
  const hist = Array.isArray(data.history) ? data.history : [];
  if(hist.length > 0 && hist[0].url === url) return;
  hist.unshift({ url, playedAt: Date.now() });
  if(hist.length > 5) hist.length = 5;
  await setLocal({ history: hist });
}

async function goFullscreenInTab(tabId){
  // รอให้ page เริ่มโหลดก่อน
  await new Promise(r => setTimeout(r, 1800));
  try{
    await chrome.scripting.executeScript({
      target: { tabId },
      world: "MAIN",
      func: () => {
        if(document.fullscreenElement) return;
        let n = 0;
        const t = setInterval(() => {
          if(++n > 20 || document.fullscreenElement){ clearInterval(t); return; }
          const vid = document.querySelector("video.html5-main-video")
                   || document.querySelector("video");
          if(!vid || vid.ended) return;
          const el = document.querySelector("#movie_player") || document.documentElement;
          el.requestFullscreen({ navigationUI:"hide" })
            .then(() => clearInterval(t))
            .catch(() => {});
        }, 700);
      }
    });
  }catch(e){}
}

async function playNextIfNeeded(tabId){
  const st = await getState();
  const now = Date.now();
  if(st.settings.killUntil && now < st.settings.killUntil) return;

  const q = st.queue.slice();

  if(q.length){
    // มีเพลงในคิว → ต้องเปิด autoPlayNext ถึงจะเล่นต่อ
    if(!st.settings.autoPlayNext) return;
    const url = q.shift();
    await setQueue(q);
    await addToHistory(url);
    try{ await chrome.tabs.update(tabId, { url }); }catch(e){}
    goFullscreenInTab(tabId);
  } else {
    // คิวว่าง → เล่น idle loop เสมอ (ไม่ขึ้นกับ autoPlayNext)
    const idleUrl = IDLE_URL + "&_=" + Date.now();
    try{ await chrome.tabs.update(tabId, { url: idleUrl }); }catch(e){}
    goFullscreenInTab(tabId);
  }
}

// เปิด Side Panel เมื่อกดไอคอน
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// On messages
chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
  (async ()=>{
    if(msg.type === "QUEUE_SET"){
      await setQueue(msg.queue || []);
      sendResponse({ ok:true });
      return;
    }
    if(msg.type === "QUEUE_CLEAR"){
      await setQueue([]);
      sendResponse({ ok:true });
      return;
    }
    if(msg.type === "SETTINGS_SET"){
      await setSettings(msg.patch || {});
      sendResponse({ ok:true });
      return;
    }
    if(msg.type === "SETTINGS_GET"){
      const st = await getState();
      sendResponse({ settings: st.settings });
      return;
    }
    if(msg.type === "HISTORY_CLEAR"){
      await setLocal({ history: [] });
      sendResponse({ ok:true });
      return;
    }
    if(msg.type === "YKQ_AUTOPLAY_NEXT"){
      const tabId = sender?.tab?.id;
      if(!tabId) { sendResponse({ ok:false }); return; }
      await playNextIfNeeded(tabId);
      sendResponse({ ok:true });
      return;
    }
    sendResponse({ ok:false, reason:"unknown" });
  })();
  return true;
});
