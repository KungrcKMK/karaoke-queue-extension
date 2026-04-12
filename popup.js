// KungRC Karaoke Queue - popup.js
// Version: 1.6.1

const VERSION = "1.6.2";
const $ = (id) => document.getElementById(id);

// ===== OTA Version Check =====
const VERSION_URL = "https://raw.githubusercontent.com/KungrcKMK/karaoke-queue-extension/main/version.json";
const UPDATE_CACHE_MS = 24 * 3600 * 1000; // เช็คใหม่ทุก 24 ชม.

function compareVersions(a, b){
  const pa = (a||"0").split(".").map(Number);
  const pb = (b||"0").split(".").map(Number);
  for(let i = 0; i < 3; i++){
    if((pa[i]||0) > (pb[i]||0)) return 1;
    if((pa[i]||0) < (pb[i]||0)) return -1;
  }
  return 0;
}

async function checkForUpdate(){
  try {
    const d = await storageGet(["updateCheckTs","latestVersion","updateNotes","updateUrl"]);
    if(d.updateCheckTs && (Date.now()-d.updateCheckTs) < UPDATE_CACHE_MS && d.latestVersion){
      showUpdateBannerIfNeeded(d.latestVersion, d.updateNotes, d.updateUrl);
      return;
    }
    const res = await fetch(VERSION_URL, { cache:"no-cache" });
    if(!res.ok) return;
    const data = await res.json();
    await storageSet({ updateCheckTs: Date.now(), latestVersion: data.version, updateNotes: data.notes||"", updateUrl: data.downloadUrl||"" });
    showUpdateBannerIfNeeded(data.version, data.notes, data.downloadUrl);
  } catch(e){ /* ไม่มี network ก็ข้ามไป */ }
}

function showUpdateBannerIfNeeded(latestVer, notes, downloadUrl){
  if(compareVersions(latestVer, VERSION) <= 0) return;
  const banner = $("updateBanner");
  if(!banner) return;
  $("updateMsg").textContent = `มีเวอร์ชันใหม่ v${latestVer}${notes ? " — "+notes : ""}`;
  if(downloadUrl) $("btnDownloadUpdate").dataset.url = downloadUrl;
  banner.classList.remove("hidden");
}

// ===== License =====
// *** วาง URL ที่ได้จาก Deploy Google Apps Script ตรงนี้ ***
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbygj2dUUiiGWWtlfvpcs7iveSpJ9mM924DWjW_RVeGugBO5eyTO02WBwT0QAIQmJ8Em1g/exec";
const LICENSE_CACHE_MS = 12 * 3600 * 1000; // 12 ชั่วโมง

async function getMachineId(){
  const d = await storageGet(["machineId"]);
  if(d.machineId) return d.machineId;
  const id = crypto.randomUUID();
  await storageSet({ machineId: id });
  return id;
}

async function verifyLicenseRemote(key){
  try{
    const machine = await getMachineId();
    const url = `${APPS_SCRIPT_URL}?key=${encodeURIComponent(key)}&machine=${encodeURIComponent(machine)}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error("http " + res.status);
    const data = await res.json();
    if(data.valid) return { valid:true, expiry: data.expiry || "" };
    return { valid:false, reason: data.reason || "ไม่ผ่านการตรวจสอบ" };
  }catch(e){
    return { valid:false, reason:"เชื่อมต่อไม่ได้ กรุณาลองใหม่", networkError:true };
  }
}

async function checkLicense(){
  const d = await storageGet(["licenseKey","licenseTs"]);
  if(!d.licenseKey){
    showLicenseScreen();
    return false;
  }
  // ใช้ cache ถ้าไม่เกิน 12 ชม.
  if(d.licenseTs && (Date.now()-d.licenseTs) < LICENSE_CACHE_MS) return true;
  // ต้อง verify ใหม่
  const r = await verifyLicenseRemote(d.licenseKey);
  if(r.valid){
    await storageSet({ licenseTs: Date.now() });
    return true;
  }
  if(r.networkError && d.licenseTs){
    // network fail แต่เคย verify แล้ว → อนุญาตต่อ
    return true;
  }
  await storageSet({ licenseKey:null, licenseTs:null });
  showLicenseScreen(r.reason);
  return false;
}

function showLicenseScreen(error=""){
  $("licenseScreen").classList.remove("hidden");
  $("licenseError").textContent = error;
}

function hideLicenseScreen(){
  $("licenseScreen").classList.add("hidden");
}

// License UI
const btnActivate = $("btnActivate");
const licenseInput = $("licenseInput");

btnActivate.addEventListener("click", async ()=>{
  const key = licenseInput.value.trim();
  if(!key){ $("licenseError").textContent="กรุณาใส่ License Key"; return; }
  btnActivate.disabled = true;
  btnActivate.textContent = "กำลังตรวจสอบ…";
  $("licenseError").textContent = "";
  const r = await verifyLicenseRemote(key);
  if(r.valid){
    await storageSet({ licenseKey:key, licenseTs:Date.now() });
    hideLicenseScreen();
    showSplash(800);
    await refresh();
    setStatus("พร้อม","ok");
    startNowPlayingPoll();
  }else{
    $("licenseError").textContent = r.reason;
    btnActivate.disabled = false;
    btnActivate.textContent = "ยืนยัน License";
  }
});

// Splash
const splash = $("splash");
function showSplash(ms = 800){
  splash.classList.remove("hidden");
  setTimeout(()=> splash.classList.add("hidden"), ms);
}

// Elements
const statusPill = $("statusPill");
const inputText = $("inputText");
const btnSearch = $("btnSearch");
const btnSearchOpenYT = $("btnSearchOpenYT");
const btnClearSearch = $("btnClearSearch");
const suggestList = $("suggestList");

const searchMode = $("searchMode");
const thaiKeyMode = $("thaiKeyMode");
const channelBias = $("channelBias");
const onlyKaraokeChannels = $("onlyKaraokeChannels");
const instrumentalMode = $("instrumentalMode");
const autoPlayNext = $("autoPlayNext");
const allowDuplicates = $("allowDuplicates");
const minViewCount = $("minViewCount");

const btnRefreshBias = $("btnRefreshBias");

const searchList = $("searchList");
const searchEmpty = $("searchEmpty");

const queueList = $("queueList");
const queueEmpty = $("queueEmpty");
const btnAddCurrent = $("btnAddCurrent");
const btnAddCurrentTop = $("btnAddCurrentTop");
const btnAddCurrentTopPlay = $("btnAddCurrentTopPlay");
const btnSkip = $("btnSkip");
const btnClear = $("btnClear");

const playlistName = $("playlistName");
const btnSavePl = $("btnSavePl");
const btnLoadPl = $("btnLoadPl");

const nowPlayingCard = $("nowPlayingCard");
const npThumb = $("npThumb");
const npTitle = $("npTitle");
const progressFill = $("progressFill");
const npTime = $("npTime");
const btnPausePlay = $("btnPausePlay");
const btnSkipNow = $("btnSkipNow");

const historyList = $("historyList");
const historyEmpty = $("historyEmpty");
const btnClearHistory = $("btnClearHistory");

// Mini view
const btnMiniToggle = $("btnMiniToggle");
const miniView = $("miniView");
const btnMiniExpand = $("btnMiniExpand");
const miniEmpty = $("miniEmpty");
const miniSongBlock = $("miniSongBlock");
const miniThumb = $("miniThumb");
const miniTitle = $("miniTitle");
const miniSub = $("miniSub");
const btnMiniWait = $("btnMiniWait");
const btnMiniPlayNow = $("btnMiniPlayNow");
const btnMiniBack = $("btnMiniBack");
const btnMiniNext = $("btnMiniNext");

// Utils
function setStatus(text, kind="ok"){
  statusPill.textContent = text;
  statusPill.style.color = kind === "ok" ? "#00e676" : kind === "warn" ? "#ffab00" : "#ff5252";
  statusPill.style.borderColor = kind === "ok" ? "#00e676" : kind === "warn" ? "#ffab00" : "#ff5252";
}

async function storageGet(keys){ return await chrome.storage.local.get(keys); }
async function storageSet(obj){ return await chrome.storage.local.set(obj); }

async function getState(){
  const data = await storageGet(["queue","playlists","settings","metaCache","channelStats","favChannels","lastSearchResults","history"]);
  const s = data.settings && typeof data.settings === "object" ? data.settings : {};
  return {
    queue: Array.isArray(data.queue) ? data.queue : [],
    playlists: data.playlists && typeof data.playlists === "object" ? data.playlists : {},
    settings: {
      autoPlayNext: s.autoPlayNext ?? true,
      allowDuplicates: s.allowDuplicates ?? false,
      defaultSearchMode: s.defaultSearchMode ?? "karaoke",
      thaiKeyMode: s.thaiKeyMode ?? "auto",
      channelBias: s.channelBias ?? true,
      onlyKaraokeChannels: s.onlyKaraokeChannels ?? false,
      instrumentalMode: s.instrumentalMode ?? false,
      killUntil: s.killUntil ?? 0,
      minViewCount: s.minViewCount ?? 500
    },
    metaCache: data.metaCache && typeof data.metaCache === "object" ? data.metaCache : {},
    channelStats: data.channelStats && typeof data.channelStats === "object" ? data.channelStats : {},
    favChannels: Array.isArray(data.favChannels) ? data.favChannels : [],
    lastSearchResults: Array.isArray(data.lastSearchResults) ? data.lastSearchResults : [],
    history: Array.isArray(data.history) ? data.history : []
  };
}

async function setQueue(queue){
  await chrome.runtime.sendMessage({ type: "QUEUE_SET", queue });
}

async function setSettingsPatch(patch){
  await chrome.runtime.sendMessage({ type: "SETTINGS_SET", patch });
}

async function setLastSearchResults(results){
  await storageSet({ lastSearchResults: results });
}

async function setMetaCache(metaCache){
  await storageSet({ metaCache });
}

async function setBiasState(channelStats, favChannels){
  await storageSet({ channelStats, favChannels });
}

// helpers
async function getActiveTab(){
  const tabs = await chrome.tabs.query({ active:true, currentWindow:true });
  return tabs[0] || null;
}

function isYouTubeUrl(s){
  try{
    const u = new URL(s.trim());
    return u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be");
  }catch{ return false; }
}

function normalizeYouTubeUrl(s){
  const raw = s.trim();
  if(!raw) return null;
  try{
    const u = new URL(raw);
    if(u.hostname === "youtu.be"){
      const id = u.pathname.replace("/","");
      if(!id) return null;
      return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
    }
    if(u.hostname.includes("youtube.com")){
      const v = u.searchParams.get("v");
      if(u.pathname === "/watch" && v){
        return `https://www.youtube.com/watch?v=${encodeURIComponent(v)}`;
      }
      if(u.pathname.startsWith("/shorts/")){
        const id = u.pathname.split("/shorts/")[1]?.split(/[?&#/]/)[0];
        if(id) return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
      }
      return raw;
    }
    return raw;
  }catch{
    return null;
  }
}

function extractVideoId(url){
  try{
    const u = new URL(url);
    if(u.hostname === "youtu.be") return u.pathname.replace("/","") || null;
    if(u.hostname.includes("youtube.com")){
      if(u.pathname === "/watch") return u.searchParams.get("v") || null;
      if(u.pathname.startsWith("/shorts/")){
        return u.pathname.split("/shorts/")[1]?.split(/[?&#/]/)[0] || null;
      }
    }
    return null;
  }catch{
    return null;
  }
}

function escapeHtml(s){
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function formatDuration(sec){
  if(!Number.isFinite(sec) || sec <= 0) return "--:--";
  const s = Math.floor(sec);
  const hh = Math.floor(s/3600);
  const mm = Math.floor((s%3600)/60);
  const ss = s%60;
  const pad = (n)=> String(n).padStart(2,"0");
  return hh>0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${mm}:${pad(ss)}`;
}

function looksThai(text){
  return /[ก-๙]/.test(text || "");
}

function normalizeSpaces(s){
  return (s || "").replace(/\s+/g," ").trim();
}

function stripExistingKeywords(q){
  return (q || "")
    .replace(/\bkaraoke\b/ig,"")
    .replace(/\blyrics\b/ig,"")
    .replace(/\blyric\b/ig,"")
    .replace(/\bคาราโอเกะ\b/ig,"")
    .replace(/\bเนื้อเพลง\b/ig,"")
    .replace(/\bofficial\b/ig,"")
    .replace(/\bmv\b/ig,"")
    .replace(/\blive\b/ig,"")
    .replace(/\bcover\b/ig,"")
    .replace(/\bsped up\b/ig,"")
    .replace(/\bremix\b/ig,"")
    .trim();
}

// ===== Search Suggestions =====
let _suggestTimer = null;
let _suggestActive = -1;

async function fetchSuggestions(q){
  try{
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`;
    const res = await fetch(url);
    const json = await res.json();
    return Array.isArray(json[1]) ? json[1].slice(0, 8) : [];
  }catch{
    return [];
  }
}

function closeSuggestions(){
  suggestList.classList.remove("open");
  suggestList.innerHTML = "";
  _suggestActive = -1;
}

function showSuggestions(items){
  suggestList.innerHTML = "";
  _suggestActive = -1;
  if(!items.length){ suggestList.classList.remove("open"); return; }
  items.forEach(text => {
    const li = document.createElement("li");
    li.className = "suggestItem";
    li.textContent = text;
    li.addEventListener("mousedown", (e)=>{
      e.preventDefault();
      inputText.value = text;
      closeSuggestions();
      doSearch(false);
    });
    suggestList.appendChild(li);
  });
  suggestList.classList.add("open");
}

function moveSuggestCursor(dir){
  const items = suggestList.querySelectorAll(".suggestItem");
  if(!items.length) return;
  items[_suggestActive]?.classList.remove("active");
  _suggestActive = Math.max(-1, Math.min(items.length - 1, _suggestActive + dir));
  if(_suggestActive >= 0){
    items[_suggestActive].classList.add("active");
    inputText.value = items[_suggestActive].textContent;
  }
}

function buildHardcoreQuery(rawQuery, mode, opts){
  const q0 = normalizeSpaces(stripExistingKeywords(rawQuery));
  const thai = looksThai(q0);

  let mainKeyword;
  if(mode === "lyrics"){
    mainKeyword = thai ? "เนื้อเพลง" : "lyrics";
  }else{
    mainKeyword = thai ? "คาราโอเกะ" : "karaoke";
  }

  // Thai key hint
  let keyHint = "";
  if(thai){
    const tk = opts?.thaiKeyMode || "auto";
    if(tk === "female") keyHint = " ผู้หญิง";
    else if(tk === "male") keyHint = " ผู้ชาย";
    else if(tk === "original") keyHint = " ต้นฉบับ";
  }

  const negatives = [
    "-official",
    "-mv",
    "-live",
    "-cover",
    "-remix",
    "-sped",
    "-reaction",
    "-teaser"
  ];

  const instrumental = opts?.instrumentalMode
    ? (thai ? " ดนตรี" : " instrumental no vocal")
    : "";

  const finalQuery = normalizeSpaces(`${q0} ${mainKeyword}${keyHint}${instrumental} ${negatives.join(" ")}`);
  return finalQuery;
}

function buildSearchUrl(rawQuery, mode, opts){
  const finalQuery = buildHardcoreQuery(rawQuery, mode, opts);
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(finalQuery)}`;
}

// Fetch & parse YouTube search page (simplified)
async function fetchSearchResults(url){
  const res = await fetch(url, { method:"GET" });
  if(!res.ok) throw new Error("Search fetch failed");
  const text = await res.text();

  // Extract ytInitialData JSON from YouTube HTML
  let data;

  // Try regex approach first (handles "var ytInitialData = {...};" pattern)
  const regexMatch = text.match(/var\s+ytInitialData\s*=\s*(\{.+?\});\s*<\/script>/s);
  if(regexMatch){
    try{ data = JSON.parse(regexMatch[1]); }catch{ data = null; }
  }

  // Fallback: brace-matching from marker position
  if(!data){
    const marker = "ytInitialData";
    const idx = text.indexOf(marker);
    if(idx < 0) return [];

    const start = text.indexOf("{", idx);
    if(start < 0) return [];
    let depth = 0;
    let end = start;
    for(let i=start;i<text.length;i++){
      const ch = text[i];
      if(ch === "{") depth++;
      else if(ch === "}") depth--;
      if(depth === 0){
        end = i+1;
        break;
      }
    }
    try{
      data = JSON.parse(text.slice(start, end));
    }catch{
      return [];
    }
  }

  if(!data) return [];

  // Walk into contents → twoColumnSearchResultsRenderer → primaryContents → sectionListRenderer → contents
  const contents =
    data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents
    || data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.richGridRenderer?.contents
    || [];

  const results = [];

  function walkCandidates(list){
    for(const item of list){
      const v1 = item?.videoRenderer || item?.richItemRenderer?.content?.videoRenderer;
      if(v1){
        const vid = v1.videoId;
        if(!vid) continue;
        const title = v1.title?.runs?.map(r=>r.text).join("") || "";
        const durText = v1.lengthText?.simpleText || v1.lengthText?.runs?.map(r=>r.text).join("") || "";
        const owner = v1.ownerText?.runs?.map(r=>r.text).join("") || "";
        const thumb =
          v1.thumbnail?.thumbnails?.slice(-1)[0]?.url ||
          v1.thumbnail?.thumbnails?.[0]?.url ||
          "";
        const viewText = v1.viewCountText?.simpleText || v1.viewCountText?.runs?.map(r=>r.text).join("") || "";

        results.push({
          videoId: vid,
          title,
          durationText: durText,
          owner,
          thumb,
          viewText
        });
      }

      const sub = item?.contents || item?.itemSectionRenderer?.contents || item?.richSectionRenderer?.content?.contents;
      if(Array.isArray(sub)) walkCandidates(sub);
    }
  }

  walkCandidates(contents);
  return results;
}

function parseDurationTextToSeconds(t){
  if(!t) return null;
  const parts = t.split(":").map(x=>parseInt(x,10));
  if(parts.some(x=>Number.isNaN(x))) return null;
  if(parts.length === 3){
    return parts[0]*3600 + parts[1]*60 + parts[2];
  }else if(parts.length === 2){
    return parts[0]*60 + parts[1];
  }else if(parts.length === 1){
    return parts[0];
  }
  return null;
}

// Meta cache utilities
async function ensureMetaForUrl(url, hint){
  const st = await getState();
  const cache = { ...(st.metaCache || {}) };
  if(cache[url]?.title && cache[url]?.thumb && Number.isFinite(cache[url]?.durationSec)) return cache[url];

  const vid = extractVideoId(url);
  const thumbFallback = vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : "";

  // try from last search results
  if(Array.isArray(st.lastSearchResults)){
    const found = st.lastSearchResults.find(r => r.url === url || extractVideoId(r.url) === vid);
    if(found){
      const sec = parseDurationTextToSeconds(found.durationText);
      cache[url] = {
        title: found.title || hint?.title || "วิดีโอ YouTube",
        thumb: found.thumb || thumbFallback || "",
        id: vid || found.videoId || null,
        durationSec: Number.isFinite(sec) ? sec : null
      };
      await setMetaCache(cache);
      return cache[url];
    }
  }

  // fallback minimal
  cache[url] = {
    title: hint?.title || "วิดีโอ YouTube",
    thumb: thumbFallback || "",
    id: vid || null,
    durationSec: null
  };
  await setMetaCache(cache);
  return cache[url];
}

// Channel bias helpers
function getChannelIdFromOwnerText(ownerText){
  return (ownerText || "").trim() || null;
}

function parseViewCount(text){
  if(!text) return 0;
  const t = text.replace(/,/g,"").toLowerCase();
  let m;
  m = t.match(/([\d.]+)\s*b/);   if(m) return parseFloat(m[1]) * 1e9;
  m = t.match(/([\d.]+)\s*m/);   if(m) return parseFloat(m[1]) * 1e6;
  m = t.match(/([\d.]+)\s*k/);   if(m) return parseFloat(m[1]) * 1e3;
  m = t.match(/([\d.]+)\s*พันล้าน/); if(m) return parseFloat(m[1]) * 1e9;
  m = t.match(/([\d.]+)\s*ล้าน/);    if(m) return parseFloat(m[1]) * 1e6;
  m = t.match(/([\d.]+)\s*พัน/);     if(m) return parseFloat(m[1]) * 1e3;
  m = t.match(/[\d.]+/);         if(m) return parseFloat(m[0]);
  return 0;
}

function applyChannelBiasToResults(results, channelStats, favChannels, settings){
  const stats = channelStats || {};
  const karaokeWords = ["karaoke","คาราโอเกะ","minus one","no vocal","instrumental"];

  const shortsPattern = /\/shorts\//i;
  const minViews = settings.minViewCount ?? 500;
  return results
    .filter(r => {
      if(parseViewCount(r.viewText) < minViews) return false;
      if(shortsPattern.test(r.url || "")) return false;
      return true;
    })
    .map(r => {
      const cid = getChannelIdFromOwnerText(r.owner);
      const s = stats[cid] || {};
      let score = 0;
      if(typeof s.count === "number") score += Math.min(30, s.count * 2);
      const t = (r.title || "").toLowerCase();
      const o = (r.owner || "").toLowerCase();
      const isKaraoke = karaokeWords.some(w => t.includes(w) || o.includes(w));
      if(settings.onlyKaraokeChannels && !isKaraoke) score -= 40;
      return { ...r, _biasScore: score, _isKaraoke: isKaraoke };
    })
    .sort((a, b) => {
      // 1. คาราโอเกะขึ้นก่อนเสมอ
      if(a._isKaraoke !== b._isKaraoke) return b._isKaraoke ? 1 : -1;
      // 2. ภายในกลุ่มเดียวกัน → ยอดวิวมากสุด
      const va = parseViewCount(a.viewText);
      const vb = parseViewCount(b.viewText);
      if(vb !== va) return vb - va;
      // 3. bias score
      return (b._biasScore || 0) - (a._biasScore || 0);
    });
}

async function bumpChannelStatForUrl(url){
  const st = await getState();
  const vid = extractVideoId(url);
  let chName = null;

  if(Array.isArray(st.lastSearchResults)){
    const hit = st.lastSearchResults.find(r => r.url === url || extractVideoId(r.url) === vid);
    if(hit) chName = (hit.owner || "").trim() || null;
  }

  if(!chName) return;
  const cid = getChannelIdFromOwnerText(chName);
  if(!cid) return;

  const stats = { ...(st.channelStats || {}) };
  const cur = stats[cid] || {};
  const count = (cur.count || 0) + 1;
  stats[cid] = { name: chName, count };
  await setBiasState(stats, st.favChannels || []);
}

// Render functions
// ===== Now Playing =====
let _npTimer = null;
let _currentPlayingUrl = null;

async function updateNowPlaying(){
  const tab = await getActiveTab();
  if(!tab?.id){ nowPlayingCard.style.display="none"; return; }
  chrome.tabs.sendMessage(tab.id, { type:"YKQ_GET_VIDEO_STATE" }, (res)=>{
    if(chrome.runtime.lastError || !res?.ok){
      nowPlayingCard.style.display="none";
      _currentPlayingUrl = null;
      return;
    }
    nowPlayingCard.style.display="";
    npTitle.textContent = res.title || "กำลังเล่น…";
    if(res.thumb) npThumb.src = res.thumb;
    if(res.duration > 0){
      const pct = Math.min(100,(res.currentTime/res.duration*100)).toFixed(1);
      progressFill.style.width = pct+"%";
      npTime.textContent = `${formatDuration(res.currentTime)} / ${formatDuration(res.duration)}`;
    }
    btnPausePlay.textContent = res.paused ? "▶" : "⏸";
    _currentPlayingUrl = res.url;
    // highlight queue item ที่กำลังเล่น
    document.querySelectorAll("#queueList .item").forEach(li=>{
      const url = li.dataset.url || "";
      li.classList.toggle("nowPlaying", !!url && res.url.includes(url.split("v=")[1]));
    });
  });
}

async function togglePausePlay(){
  const tab = await getActiveTab();
  if(!tab?.id) return;
  chrome.tabs.sendMessage(tab.id, { type:"YKQ_PAUSE_PLAY" }, ()=>{});
}

function startNowPlayingPoll(){
  if(_npTimer) clearInterval(_npTimer);
  updateNowPlaying();
  _npTimer = setInterval(updateNowPlaying, 2000);
}

// ===== Mini View =====
let _miniMode = false;

function applyMiniMode(){
  const app = document.querySelector(".app");
  if(_miniMode){
    app.classList.add("miniMode");
    btnMiniToggle.textContent = "⊞ ขยาย";
  } else {
    app.classList.remove("miniMode");
    btnMiniToggle.textContent = "⊡ ย่อ";
  }
}

async function renderMiniView(){
  const st = await getState();
  const q = st.queue;
  if(!q.length){
    miniEmpty.style.display = "block";
    miniSongBlock.style.display = "none";
  } else {
    miniEmpty.style.display = "none";
    miniSongBlock.style.display = "flex";
    const url = q[0];
    const meta = (st.metaCache || {})[url] || {};
    const vid = extractVideoId(url);
    miniThumb.src = meta.thumb || (vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : "");
    miniTitle.textContent = meta.title || url;
    miniSub.textContent = `${q.length} เพลงในคิว`;
  }
}

function toggleMiniMode(){
  _miniMode = !_miniMode;
  applyMiniMode();
  if(_miniMode) renderMiniView();
}

// ===== History =====
function renderHistory(history, metaCache){
  historyList.innerHTML = "";
  historyEmpty.style.display = history.length ? "none" : "block";
  history.forEach(item=>{
    const meta = metaCache[item.url] || {};
    const li = document.createElement("li");
    li.className = "histItem";
    li.title = "คลิกเพื่อเพิ่มในคิว";
    li.onclick = () => addUrlToQueue(item.url,"bottom",{ title: meta.title });

    const img = document.createElement("img");
    img.className = "thumb";
    img.loading = "lazy";
    const vid = extractVideoId(item.url);
    img.src = meta.thumb || (vid ? `https://i.ytimg.com/vi/${vid}/hqdefault.jpg` : "");

    const info = document.createElement("div");
    info.className = "histMeta";
    const t = document.createElement("div");
    t.className = "t";
    t.textContent = meta.title || item.url;
    const u = document.createElement("div");
    u.className = "u";
    u.textContent = new Date(item.playedAt).toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"});
    info.appendChild(t);
    info.appendChild(u);

    li.appendChild(img);
    li.appendChild(info);
    historyList.appendChild(li);
  });
}

function renderQueue(queue, metaCache){
  queueList.innerHTML = "";
  queueEmpty.style.display = queue.length ? "none" : "block";

  // อัปเดตจำนวนในหัว
  const queueHeader = document.querySelector("#queueList").closest(".card").querySelector(".h");
  if(queueHeader) queueHeader.textContent = queue.length ? `คิวเพลง (${queue.length})` : "คิวเพลง";

  queue.forEach((url, index) => {
    const meta = metaCache[url] || {};
    const title = meta.title || "Loading…";
    const thumb = meta.thumb || "";
    const durText = formatDuration(meta.durationSec);
    const li = document.createElement("li");
    li.className = "item";
    li.draggable = true;
    li.dataset.index = String(index);
    li.dataset.url = url;

    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = "thumbnail";
    img.loading = "lazy";
    if(thumb) img.src = thumb;

    const drag = document.createElement("div");
    drag.className = "drag";
    drag.textContent = "⠿";

    const m = document.createElement("div");
    m.className = "meta";

    const top = document.createElement("div");
    top.className = "metaTop";

    const t = document.createElement("div");
    t.className = "t";
    t.textContent = title;

    const d = document.createElement("div");
    d.className = "d";
    d.textContent = durText;

    top.appendChild(t);
    top.appendChild(d);

    const u = document.createElement("div");
    u.className = "u";
    u.textContent = url;

    m.appendChild(top);
    m.appendChild(u);

    const ctrl = document.createElement("div");
    ctrl.className = "ctrl";

    const playBtn = document.createElement("button");
    playBtn.className = "iconBtn";
    playBtn.textContent = "▶";
    playBtn.title = "เล่นเลย";
    playBtn.onclick = () => playNow(url);

    const delBtn = document.createElement("button");
    delBtn.className = "iconBtn";
    delBtn.textContent = "✕";
    delBtn.title = "ลบ";
    delBtn.onclick = async () => {
      const st = await getState();
      const q = st.queue.slice();
      q.splice(index, 1);
      await setQueue(q);
      await refresh();
      setStatus("ลบแล้ว", "ok");
    };

    const copyBtn = document.createElement("button");
    copyBtn.className = "iconBtn";
    copyBtn.textContent = "⧉";
    copyBtn.title = "คัดลอก URL";
    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(url);
      setStatus("คัดลอก URL แล้ว", "ok");
    };

    ctrl.appendChild(playBtn);
    ctrl.appendChild(copyBtn);
    ctrl.appendChild(delBtn);

    li.appendChild(img);
    li.appendChild(drag);
    li.appendChild(m);
    li.appendChild(ctrl);

    // drag reorder
    li.addEventListener("dragstart", (e)=>{
      e.dataTransfer.setData("text/plain", String(index));
      e.dataTransfer.effectAllowed = "move";
      li.style.opacity = "0.7";
    });
    li.addEventListener("dragend", ()=>{
      li.style.opacity = "1";
    });
    li.addEventListener("dragover",(e)=>{
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    li.addEventListener("drop", async (e)=>{
      e.preventDefault();
      const from = Number(e.dataTransfer.getData("text/plain"));
      const to = index;
      if(Number.isNaN(from) || from === to) return;
      const st = await getState();
      const q = st.queue.slice();
      const [moved] = q.splice(from,1);
      q.splice(to,0,moved);
      await setQueue(q);
      await refresh();
      setStatus("เรียงใหม่แล้ว", "ok");
    });

    queueList.appendChild(li);
  });
}

function renderSearchResults(results, st){
  searchList.innerHTML = "";
  searchEmpty.style.display = results.length ? "none" : "block";
  if(!results.length) return;

  const favSet = new Set(st.favChannels || []);
  (results || []).forEach(r => {
    const url = `https://www.youtube.com/watch?v=${encodeURIComponent(r.videoId)}`;
    const li = document.createElement("li");
    li.className = "item" + (r._biasScore ? " biasItem" : "");

    const img = document.createElement("img");
    img.className = "thumb";
    img.alt = "thumbnail";
    img.loading = "lazy";
    if(r.thumb) img.src = r.thumb;

    const m = document.createElement("div");
    m.className = "meta";

    const top = document.createElement("div");
    top.className = "metaTop";

    const t = document.createElement("div");
    t.className = "t";
    t.textContent = r.title || "(no title)";

    const sec = parseDurationTextToSeconds(r.durationText);
    const d = document.createElement("div");
    d.className = "d";
    d.textContent = formatDuration(sec);

    top.appendChild(t);
    top.appendChild(d);

    const u = document.createElement("div");
    u.className = "u";
    u.textContent = r.owner ? `${r.owner} • ${r.viewText || ""}` : (r.viewText || "");

    const badges = document.createElement("div");
    badges.className = "badges";
    if(r._biasScore){
      const b = document.createElement("div");
      b.className = "biasDot";
      b.title = `Bias +${r._biasScore}`;
      badges.appendChild(b);
    }

    // แถวบน: Bias + ปุ่มทั้งหมด
    const ctrl = document.createElement("div");
    ctrl.className = "ctrl";

    if(badges.childNodes.length) ctrl.appendChild(badges);

    const addBtn = document.createElement("button");
    addBtn.className = "iconBtn";
    addBtn.textContent = "เพิ่ม";
    addBtn.onclick = () => addUrlToQueue(url,"bottom",{ title:r.title });

    const vipBtn = document.createElement("button");
    vipBtn.className = "iconBtn";
    vipBtn.textContent = "VIP";
    vipBtn.title = "แทรกหัวคิว";
    vipBtn.onclick = () => addUrlToQueue(url,"top",{ title:r.title });

    const vipPlayBtn = document.createElement("button");
    vipPlayBtn.className = "iconBtn";
    vipPlayBtn.textContent = "VIP+เล่น";
    vipPlayBtn.title = "แทรกหัวคิวแล้วเล่นเลย";
    vipPlayBtn.onclick = () => addUrlToQueue(url,"top",{ title:r.title },true);

    ctrl.appendChild(addBtn);
    ctrl.appendChild(vipBtn);
    ctrl.appendChild(vipPlayBtn);

    // แถวล่าง: ชื่อเพลง + ช่อง
    m.appendChild(top);
    m.appendChild(u);

    li.appendChild(img);
    li.appendChild(m);
    // จัด meta ใหม่: ctrl บน, ชื่อ+ช่องล่าง
    const wrapper = document.createElement("div");
    wrapper.className = "resultBody";
    wrapper.appendChild(ctrl);
    wrapper.appendChild(m);
    li.appendChild(wrapper);

    searchList.appendChild(li);
  });
}


// refresh all UI
async function refresh(){
  const st = await getState();
  autoPlayNext.checked = !!st.settings.autoPlayNext;
  allowDuplicates.checked = !!st.settings.allowDuplicates;
  searchMode.value = st.settings.defaultSearchMode || "karaoke";
  thaiKeyMode.value = st.settings.thaiKeyMode || "auto";
  channelBias.checked = !!st.settings.channelBias;
  onlyKaraokeChannels.checked = !!st.settings.onlyKaraokeChannels;
  instrumentalMode.checked = !!st.settings.instrumentalMode;
  minViewCount.value = st.settings.minViewCount ?? 500;

  // queue
  renderQueue(st.queue, st.metaCache || {});

  // search
  const biasedResults = applyChannelBiasToResults(st.lastSearchResults || [], st.channelStats, st.favChannels, st.settings);
  renderSearchResults(biasedResults, st);

  // history
  renderHistory(st.history || [], st.metaCache || {});

  // mini view (ถ้าเปิดอยู่)
  if(_miniMode) renderMiniView();
}

// add URL to queue
async function addUrlToQueue(url, position="bottom", hint=null, playNowToo=false){
  const st = await getState();
  const q = st.queue.slice();

  if(!st.settings.allowDuplicates && q.includes(url)){
    setStatus("มีในคิวแล้ว (Allow duplicates ปิดอยู่)", "warn");
    return;
  }

  if(position === "top") q.unshift(url);
  else q.push(url);

  await setQueue(q);
  await ensureMetaForUrl(url, hint);
  await bumpChannelStatForUrl(url);
  await refresh();
  setStatus(position === "top" ? "แทรกหัวคิวแล้ว" : "เพิ่มแล้ว", "ok");

  if(playNowToo){
    await playNow(url);
  }
}

// get active tab & play
async function playNow(url){
  const tab = await getActiveTab();
  if(!tab?.id) return setStatus("ไม่พบแท็บ", "bad");

  try{
    await chrome.tabs.update(tab.id, { url });
    setStatus("Playing…", "ok");

    // บังคับ fullscreen ทุกครั้งที่สลับเพลง
    const fsTabId = tab.id;
    setTimeout(async ()=>{
      try{
        await chrome.scripting.executeScript({
          target: { tabId: fsTabId },
          world: "MAIN",
          func: ()=>{
            if(document.fullscreenElement) return;
            let n = 0;
            const t = setInterval(()=>{
              if(++n > 20 || document.fullscreenElement){ clearInterval(t); return; }
              const vid = document.querySelector("video.html5-main-video")
                       || document.querySelector("video");
              if(!vid || vid.ended) return;
              const el = document.querySelector("#movie_player") || document.documentElement;
              el.requestFullscreen({ navigationUI:"hide" })
                .then(()=> clearInterval(t)).catch(()=>{});
            }, 700);
          }
        });
      }catch(e){}
    }, 1800);

    // ลบออกจากคิวทันที (ถ้ามีอยู่)
    const st = await getState();
    const q = st.queue.slice();
    const idx = q.indexOf(url);
    if(idx !== -1){
      q.splice(idx, 1);
      await setQueue(q);
    }

    // บันทึกประวัติ
    const hist = (st.history || []).slice();
    if(!hist.length || hist[0].url !== url){
      hist.unshift({ url, playedAt: Date.now() });
      if(hist.length > 5) hist.length = 5;
      await storageSet({ history: hist });
    }

    await refresh();
  }catch(e){
    console.error("playNow failed:", e);
    setStatus("เปิดเพลงไม่ได้", "bad");
  }
}

async function addCurrent(position="bottom", playNowToo=false){
  const tab = await getActiveTab();
  if(!tab?.url) return setStatus("หาแท็บไม่เจอ", "bad");
  if(!isYouTubeUrl(tab.url)) return setStatus("แท็บนี้ไม่ใช่ YouTube", "warn");

  const url = normalizeYouTubeUrl(tab.url);
  if(!url) return setStatus("URL แปลก ๆ", "bad");

  const title = (tab.title || "").replace(/\s*-\s*YouTube\s*$/i,"").trim();
  await addUrlToQueue(url, position, { title }, playNowToo);
}

async function skip(){
  const tab = await getActiveTab();
  if(!tab?.id) return setStatus("ไม่พบแท็บ", "bad");
  chrome.tabs.sendMessage(tab.id, { type:"YKQ_SKIP" }, ()=>{});
  setStatus("Skip → next", "ok");
}

async function clearQueue(){
  await chrome.runtime.sendMessage({ type:"QUEUE_CLEAR" });
  await refresh();
  setStatus("ล้างแล้ว", "ok");
}

// search actions
async function doSearch(openOnYoutube=false){
  const q = inputText.value.trim();
  if(!q) return setStatus("พิมพ์ชื่อเพลงก่อน", "warn");

  const st = await getState();
  const mode = searchMode.value || st.settings.defaultSearchMode || "karaoke";
  const url = buildSearchUrl(q, mode, {
    instrumentalMode: st.settings.instrumentalMode,
    thaiKeyMode: st.settings.thaiKeyMode
  });

  if(openOnYoutube){
    const tab = await getActiveTab();
    if(!tab?.id) return setStatus("ไม่พบแท็บ", "bad");
    if(st.settings.openInSameTab !== false){
      await chrome.tabs.update(tab.id, { url });
    }else{
      await chrome.tabs.create({ url });
    }
    setStatus("เปิดผลค้นหาบน YouTube แล้ว", "ok");
    return;
  }

  try{
    setStatus("Searching…", "ok");
    const results = await fetchSearchResults(url);
    const enriched = (results || []).map(r => ({
      ...r,
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(r.videoId)}`
    }));
    await setLastSearchResults(enriched);
    const st2 = await getState();
    const biased = applyChannelBiasToResults(enriched, st2.channelStats, st2.favChannels, st2.settings);
    renderSearchResults(biased, st2);
    setStatus(`พบ ${biased.length} วิดีโอ`, "ok");
  }catch(e){
    console.error(e);
    setStatus("ค้นหาล้มเหลว ลองเปิดบน YouTube แทน", "warn");
  }
}

// playlists — file-based save/load
async function savePlaylist(){
  const st = await getState();
  if(!st.queue.length) return setStatus("ไม่มีเพลงในคิว", "warn");

  const name = playlistName.value.trim() || "playlist";
  const payload = {
    name,
    savedAt: new Date().toISOString(),
    version: VERSION,
    queue: st.queue,
    metaCache: st.metaCache
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.json`;
  a.click();
  URL.revokeObjectURL(url);
  setStatus(`Saved: ${name}.json`, "ok");
}

async function loadPlaylist(){
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if(!file) return;
    try{
      const text = await file.text();
      const obj = JSON.parse(text);
      const queue = Array.isArray(obj.queue) ? obj.queue : [];
      if(!queue.length) return setStatus("ไม่มีเพลงในไฟล์นี้", "warn");

      const metaCache = obj.metaCache && typeof obj.metaCache === "object" ? obj.metaCache : {};
      await storageSet({ metaCache });
      await setQueue(queue);
      await refresh();
      setStatus(`Loaded: ${file.name}`, "ok");
    }catch{
      setStatus("ไฟล์ JSON เสีย", "bad");
    }
  };
  input.click();
}

// settings change
async function updateSettings(){
  await setSettingsPatch({
    autoPlayNext: !!autoPlayNext.checked,
    allowDuplicates: !!allowDuplicates.checked,
    defaultSearchMode: searchMode.value || "karaoke",
    thaiKeyMode: thaiKeyMode.value || "auto",
    channelBias: !!channelBias.checked,
    onlyKaraokeChannels: !!onlyKaraokeChannels.checked,
    instrumentalMode: !!instrumentalMode.checked,
    minViewCount: Math.max(0, parseInt(minViewCount.value) || 0)
  });
  setStatus("บันทึกการตั้งค่าแล้ว", "ok");
}

// Events
btnSearch.addEventListener("click", ()=>{ closeSuggestions(); doSearch(false); });
btnSearchOpenYT.addEventListener("click", ()=> doSearch(true));
btnClearSearch.addEventListener("click", ()=>{
  inputText.value = "";
  searchList.innerHTML = "";
  searchEmpty.style.display = "block";
  setStatus("ล้างผลค้นหาแล้ว", "ok");
});

btnAddCurrent.addEventListener("click", ()=> addCurrent("bottom", false));
btnAddCurrentTop.addEventListener("click", ()=> addCurrent("top", false));
btnAddCurrentTopPlay.addEventListener("click", ()=> addCurrent("top", true));

btnSkip.addEventListener("click", skip);
btnClear.addEventListener("click", clearQueue);

btnSavePl.addEventListener("click", savePlaylist);
btnLoadPl.addEventListener("click", loadPlaylist);

autoPlayNext.addEventListener("change", updateSettings);
allowDuplicates.addEventListener("change", updateSettings);
searchMode.addEventListener("change", updateSettings);
thaiKeyMode.addEventListener("change", updateSettings);
channelBias.addEventListener("change", updateSettings);
onlyKaraokeChannels.addEventListener("change", updateSettings);
instrumentalMode.addEventListener("change", updateSettings);
minViewCount.addEventListener("change", updateSettings);

btnPausePlay.addEventListener("click", togglePausePlay);
btnSkipNow.addEventListener("click", skip);
btnClearHistory.addEventListener("click", async ()=>{
  await chrome.runtime.sendMessage({ type:"HISTORY_CLEAR" });
  await refresh();
  setStatus("ล้างประวัติแล้ว", "ok");
});

// Update banner buttons
$("btnDismissUpdate").addEventListener("click", ()=>{
  $("updateBanner").classList.add("hidden");
});
$("btnDownloadUpdate").addEventListener("click", ()=>{
  const url = $("btnDownloadUpdate").dataset.url;
  if(url) chrome.tabs.create({ url });
});

// Mini view buttons
btnMiniToggle.addEventListener("click", toggleMiniMode);
btnMiniExpand.addEventListener("click", ()=>{ _miniMode = false; applyMiniMode(); });

btnMiniWait.addEventListener("click", ()=>{
  // รอ = ออก mini mode กลับ full view
  _miniMode = false;
  applyMiniMode();
  setStatus("รอต่อ…", "ok");
});

btnMiniPlayNow.addEventListener("click", async ()=>{
  const st = await getState();
  const q = st.queue.slice();
  if(!q.length) return setStatus("ไม่มีเพลงในคิว", "warn");
  const url = q.shift();
  await setQueue(q);
  await playNow(url);
  await refresh();
  setStatus("เล่นทันที!", "ok");
});

btnMiniBack.addEventListener("click", async ()=>{
  const st = await getState();
  const hist = st.history || [];
  if(!hist.length) return setStatus("ไม่มีประวัติ", "warn");
  await playNow(hist[0].url);
  setStatus("ย้อนกลับเพลงก่อนหน้า", "ok");
});

btnMiniNext.addEventListener("click", async ()=>{
  await skip();
  setTimeout(()=>{ if(_miniMode) renderMiniView(); }, 800);
});

// Search input — suggestions + enter
inputText.addEventListener("input", ()=>{
  clearTimeout(_suggestTimer);
  const q = inputText.value.trim();
  if(q.length < 2){ closeSuggestions(); return; }
  _suggestTimer = setTimeout(async ()=>{
    const items = await fetchSuggestions(q);
    showSuggestions(items);
  }, 280);
});

inputText.addEventListener("keydown", (e)=>{
  if(suggestList.classList.contains("open")){
    if(e.key === "ArrowDown"){ e.preventDefault(); moveSuggestCursor(1); return; }
    if(e.key === "ArrowUp"){  e.preventDefault(); moveSuggestCursor(-1); return; }
    if(e.key === "Escape"){ closeSuggestions(); return; }
  }
  if(e.key === "Enter"){ closeSuggestions(); doSearch(false); }
});

inputText.addEventListener("blur", ()=>{
  setTimeout(closeSuggestions, 150);
});

// Keyboard shortcuts (เมื่อ focus อยู่ที่ panel ไม่ใช่ input)
document.addEventListener("keydown",(e)=>{
  if(e.target.tagName==="INPUT"||e.target.tagName==="TEXTAREA"||e.target.tagName==="SELECT") return;
  if(e.code==="Space"||e.code==="KeyK"){ e.preventDefault(); togglePausePlay(); }
  if(e.code==="ArrowRight"||e.code==="KeyN"){ e.preventDefault(); skip(); }
});

// init
(async function init(){
  const licensed = await checkLicense();
  if(!licensed) return;
  showSplash(800);
  await refresh();
  setStatus("พร้อม", "ok");
  startNowPlayingPoll();
  checkForUpdate(); // ไม่ต้อง await — ทำ background
})();
