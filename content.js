// KungRC Karaoke Queue - content.js
// เน้น auto-play next + รับคำสั่งจาก popup
// Fixed: SPA navigation support + reliable end detection

let _autoNextPending = false;
let _boundVideo = null;
let _pollTimer = null;

function isWatchPage(){
  return location.hostname.includes("youtube.com") && location.pathname === "/watch";
}

function getVideoElement(){
  return document.querySelector("video.html5-main-video") || document.querySelector("video") || null;
}

function triggerAutoNext(){
  if(_autoNextPending) return;
  _autoNextPending = true;
  chrome.runtime.sendMessage({ type:"YKQ_AUTOPLAY_NEXT" }, ()=>{
    setTimeout(()=>{ _autoNextPending = false; }, 5000);
  });
}

function stopPolling(){
  if(_pollTimer){
    clearInterval(_pollTimer);
    _pollTimer = null;
  }
}

function setupVideoListener(){
  if(!isWatchPage()) return;

  const vid = getVideoElement();
  if(!vid) return;

  // ถ้า bind อยู่กับ video element เดิมแล้ว ไม่ต้องทำซ้ำ
  if(_boundVideo === vid) return;

  // ถอด listener เก่า
  if(_boundVideo){
    _boundVideo.removeEventListener("ended", onVideoEnded);
  }
  stopPolling();

  _boundVideo = vid;
  _autoNextPending = false;

  // Method 1: ended event
  vid.addEventListener("ended", onVideoEnded);

  // Method 2: poll ตรวจจับใกล้จบ (backup กรณี YouTube กลืน ended event)
  _pollTimer = setInterval(()=>{
    if(!vid || vid.paused || !Number.isFinite(vid.duration) || vid.duration <= 0) return;
    const remaining = vid.duration - vid.currentTime;
    if(remaining <= 0.5 && remaining >= 0){
      stopPolling();
      triggerAutoNext();
    }
  }, 1000);
}

function onVideoEnded(){
  stopPolling();
  triggerAutoNext();
}

// รองรับ YouTube SPA navigation (เปลี่ยนวิดีโอโดยไม่ reload หน้า)
function onYouTubeNavigate(){
  _boundVideo = null;
  _autoNextPending = false;
  stopPolling();

  // รอให้ video element พร้อม (YouTube อาจยังโหลดไม่เสร็จ)
  let attempts = 0;
  const waitAndSetup = setInterval(()=>{
    attempts++;
    if(attempts > 30){ clearInterval(waitAndSetup); return; } // max 15 วิ
    const v = getVideoElement();
    if(v && v.readyState >= 1){
      clearInterval(waitAndSetup);
      setupVideoListener();
    }
  }, 500);
}

// ฟัง YouTube SPA events
document.addEventListener("yt-navigate-finish", onYouTubeNavigate);
window.addEventListener("popstate", onYouTubeNavigate);

// สังเกต URL เปลี่ยน (backup อีกชั้น)
let _lastUrl = location.href;
const urlObserver = new MutationObserver(()=>{
  if(location.href !== _lastUrl){
    _lastUrl = location.href;
    onYouTubeNavigate();
  }
});
urlObserver.observe(document.documentElement, { childList:true, subtree:true });

// handle commands จาก popup / service_worker
chrome.runtime.onMessage.addListener((msg, sender, sendResponse)=>{
  (async ()=>{
    if(msg.type === "YKQ_PLAY_URL"){
      location.href = msg.url;
      sendResponse({ ok:true });
      return;
    }
    if(msg.type === "YKQ_GET_VIDEO_STATE"){
      const v = getVideoElement();
      if(v && isWatchPage()){
        const vid = new URLSearchParams(location.search).get("v");
        sendResponse({
          ok: true,
          currentTime: v.currentTime || 0,
          duration: Number.isFinite(v.duration) ? v.duration : 0,
          paused: v.paused,
          title: document.title.replace(/\s*-\s*YouTube\s*$/i,"").trim(),
          thumb: vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : "",
          url: location.href
        });
      } else {
        sendResponse({ ok: false });
      }
      return;
    }
    if(msg.type === "YKQ_PAUSE_PLAY"){
      const v = getVideoElement();
      if(v){ v.paused ? v.play() : v.pause(); sendResponse({ ok:true, paused:v.paused }); }
      else { sendResponse({ ok:false }); }
      return;
    }
    if(msg.type === "YKQ_SKIP"){
      const v = getVideoElement();
      if(v && Number.isFinite(v.duration) && v.duration > 0){
        v.currentTime = v.duration;
        // ended event จะยิงเอง หรือ poll จะจับได้
        sendResponse({ ok:true });
      }else if(v){
        _autoNextPending = false;
        triggerAutoNext();
        sendResponse({ ok:true });
      }else{
        sendResponse({ ok:false });
      }
      return;
    }
    sendResponse({ ok:false });
  })();
  return true;
});

// init ครั้งแรก
setupVideoListener();
