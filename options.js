// KungRC Karaoke Queue - options.js
// Version: 1.6.1 (About/version added)

const $ = (id) => document.getElementById(id);

const statusEl = $("status");

// About
const aboutVersion = $("aboutVersion");
const aboutMV3 = $("aboutMV3");
const aboutLocal = $("aboutLocal");
const btnOpenPrivacy = $("btnOpenPrivacy");
const btnOpenChangelog = $("btnOpenChangelog");
const btnCopyDebug = $("btnCopyDebug");
const debugBox = $("debugBox");
const footText = $("footText");

// Settings
const defaultSearchMode = $("defaultSearchMode");
const thaiKeyMode = $("thaiKeyMode");
const autoPlayNext = $("autoPlayNext");
const allowDuplicates = $("allowDuplicates");
const channelBias = $("channelBias");
const onlyKaraokeChannels = $("onlyKaraokeChannels");
const instrumentalMode = $("instrumentalMode");

const btnSave = $("btnSave");
const btnResetSettings = $("btnResetSettings");

// Kill switch
const kill30 = $("kill30");
const kill60 = $("kill60");
const killOff = $("killOff");

// Bias manager
const btnExportBias = $("btnExportBias");
const btnImportBias = $("btnImportBias");
const btnClearStats = $("btnClearStats");
const btnClearFavs = $("btnClearFavs");
const biasJson = $("biasJson");
const favList = $("favList");
const learnedList = $("learnedList");

// Danger
const btnResetAll = $("btnResetAll");

function setStatus(text, kind="ok"){
  statusEl.textContent = text;
  statusEl.style.color = kind === "ok" ? "#00e676" : (kind === "warn" ? "#ffab00" : "#ff5252");
  statusEl.style.borderColor = kind === "ok" ? "#00e676" : (kind === "warn" ? "#ffab00" : "#ff5252");
}

async function getLocal(keys){ return await chrome.storage.local.get(keys); }
async function setLocal(obj){ return await chrome.storage.local.set(obj); }
async function setSettingsPatch(patch){
  await chrome.runtime.sendMessage({ type: "SETTINGS_SET", patch });
}

function escapeHtml(s){
  return String(s || "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;");
}

function initAbout(){
  const m = chrome.runtime.getManifest();
  aboutVersion.textContent = `v${m.version}`;
  aboutMV3.textContent = `Manifest v${m.manifest_version}`;
  aboutLocal.textContent = "Local-only";
  footText.textContent = `Local-only • no data collected • v${m.version}`;
}

async function getState(){
  const data = await getLocal(["settings","channelStats","favChannels","queue","metaCache","playlists","lastSearchResults"]);
  const s = (data.settings && typeof data.settings === "object") ? data.settings : {};
  return {
    settings: {
      autoPlayNext: s.autoPlayNext ?? true,
      allowDuplicates: s.allowDuplicates ?? false,
      defaultSearchMode: s.defaultSearchMode ?? "karaoke",
      thaiKeyMode: s.thaiKeyMode ?? "auto",
      channelBias: s.channelBias ?? true,
      onlyKaraokeChannels: s.onlyKaraokeChannels ?? false,
      instrumentalMode: s.instrumentalMode ?? false,
      killUntil: s.killUntil ?? 0
    },
    channelStats: data.channelStats && typeof data.channelStats === "object" ? data.channelStats : {},
    favChannels: Array.isArray(data.favChannels) ? data.favChannels : [],
    queueCount: Array.isArray(data.queue) ? data.queue.length : 0,
    playlistsCount: data.playlists && typeof data.playlists === "object" ? Object.keys(data.playlists).length : 0,
    cacheCount: data.metaCache && typeof data.metaCache === "object" ? Object.keys(data.metaCache).length : 0,
    lastSearchCount: Array.isArray(data.lastSearchResults) ? data.lastSearchResults.length : 0
  };
}

function renderBias(state){
  favList.innerHTML = "";
  learnedList.innerHTML = "";

  for(const cid of state.favChannels){
    const li = document.createElement("li");
    li.className = "item";

    const info = state.channelStats[cid] || {};
    const name = info.name || cid;

    const left = document.createElement("div");
    left.innerHTML = `<b>⭐ ${escapeHtml(name)}</b><div class="mini">${escapeHtml(cid)}</div>`;

    const rm = document.createElement("button");
    rm.className = "iconBtn";
    rm.textContent = "✕";
    rm.title = "Remove favorite";
    rm.onclick = async () => {
      const st = await getState();
      const fav = st.favChannels.filter(x => x !== cid);
      await setLocal({ favChannels: fav });
      await refresh();
      setStatus("Removed favorite", "ok");
    };

    li.appendChild(left);
    li.appendChild(rm);
    favList.appendChild(li);
  }

  const learned = Object.entries(state.channelStats)
    .map(([cid, v]) => ({ cid, name: v?.name || cid, count: v?.count || 0 }))
    .filter(x => x.count > 0)
    .sort((a,b) => b.count - a.count);

  for(const r of learned){
    const li = document.createElement("li");
    li.className = "item";

    const left = document.createElement("div");
    left.innerHTML = `<b>🧠 ${escapeHtml(r.name)}</b> <span class="mini">(Adds: ${r.count})</span><div class="mini">${escapeHtml(r.cid)}</div>`;

    const btnFav = document.createElement("button");
    btnFav.className = "iconBtn";
    btnFav.textContent = "⭐";
    btnFav.title = "Add to favorites";
    btnFav.onclick = async () => {
      const st = await getState();
      if(!st.favChannels.includes(r.cid)){
        await setLocal({ favChannels: [...st.favChannels, r.cid] });
        await refresh();
        setStatus("Added favorite", "ok");
      }
    };

    li.appendChild(left);
    li.appendChild(btnFav);
    learnedList.appendChild(li);
  }
}

async function refresh(){
  const st = await getState();

  defaultSearchMode.value = st.settings.defaultSearchMode;
  thaiKeyMode.value = st.settings.thaiKeyMode;
  autoPlayNext.checked = !!st.settings.autoPlayNext;
  allowDuplicates.checked = !!st.settings.allowDuplicates;
  channelBias.checked = !!st.settings.channelBias;
  onlyKaraokeChannels.checked = !!st.settings.onlyKaraokeChannels;
  instrumentalMode.checked = !!st.settings.instrumentalMode;

  renderBias(st);
}

async function buildDebugInfo(){
  const m = chrome.runtime.getManifest();
  const st = await getState();
  const now = new Date().toISOString();
  const killLeft = Math.max(0, Number(st.settings.killUntil || 0) - Date.now());
  const killMin = Math.ceil(killLeft / 60000);

  const info = {
    name: m.name,
    version: m.version,
    manifest_version: m.manifest_version,
    time: now,
    settings: st.settings,
    counts: {
      queue: st.queueCount,
      playlists: st.playlistsCount,
      metaCache: st.cacheCount,
      lastSearchResults: st.lastSearchCount
    },
    killSwitch: killLeft > 0 ? `ACTIVE ~${killMin} min left` : "OFF"
  };
  return JSON.stringify(info, null, 2);
}

// About buttons
btnOpenPrivacy.addEventListener("click", () => {
  setStatus("Privacy is in PRIVACY.md", "ok");
  debugBox.value = "Open PRIVACY.md in your project folder (Chrome Web Store listing can also link to it).";
});

btnOpenChangelog.addEventListener("click", () => {
  setStatus("Changelog is in CHANGELOG.md", "ok");
  debugBox.value = "Open CHANGELOG.md in your project folder.";
});

btnCopyDebug.addEventListener("click", async () => {
  const text = await buildDebugInfo();
  debugBox.value = text;
  try{
    await navigator.clipboard.writeText(text);
    setStatus("Debug copied ✅", "ok");
  }catch{
    setStatus("Copy failed (clipboard blocked)", "warn");
  }
});

// Save
btnSave.addEventListener("click", async () => {
  await setSettingsPatch({
    defaultSearchMode: defaultSearchMode.value,
    thaiKeyMode: thaiKeyMode.value,
    autoPlayNext: !!autoPlayNext.checked,
    allowDuplicates: !!allowDuplicates.checked,
    channelBias: !!channelBias.checked,
    onlyKaraokeChannels: !!onlyKaraokeChannels.checked,
    instrumentalMode: !!instrumentalMode.checked
  });
  await refresh();
  setStatus("Saved ✅", "ok");
});

// Reset settings (keep bias)
btnResetSettings.addEventListener("click", async () => {
  await setSettingsPatch({
    autoPlayNext: true,
    allowDuplicates: false,
    defaultSearchMode: "karaoke",
    thaiKeyMode: "auto",
    channelBias: true,
    onlyKaraokeChannels: false,
    instrumentalMode: false,
    killUntil: 0
  });
  await refresh();
  setStatus("Settings reset ✅", "ok");
});

// Kill switch
kill30.addEventListener("click", async () => {
  await setSettingsPatch({ killUntil: Date.now() + 30*60*1000 });
  setStatus("Autoplay paused 30 min", "warn");
});
kill60.addEventListener("click", async () => {
  await setSettingsPatch({ killUntil: Date.now() + 60*60*1000 });
  setStatus("Autoplay paused 60 min", "warn");
});
killOff.addEventListener("click", async () => {
  await setSettingsPatch({ killUntil: 0 });
  setStatus("Autoplay resumed ✅", "ok");
});

// Export/Import bias
btnExportBias.addEventListener("click", async () => {
  const st = await getState();
  const payload = { exportedAt: new Date().toISOString(), favChannels: st.favChannels, channelStats: st.channelStats };
  biasJson.value = JSON.stringify(payload, null, 2);
  setStatus("Bias exported", "ok");
});

btnImportBias.addEventListener("click", async () => {
  const text = (biasJson.value || "").trim();
  if(!text) return setStatus("Paste JSON first", "warn");
  try{
    const obj = JSON.parse(text);
    const favChannels = Array.isArray(obj.favChannels) ? obj.favChannels : [];
    const channelStats = obj.channelStats && typeof obj.channelStats === "object" ? obj.channelStats : {};
    await setLocal({ favChannels, channelStats });
    await refresh();
    setStatus("Bias imported ✅", "ok");
  }catch{
    setStatus("Invalid JSON", "bad");
  }
});

btnClearStats.addEventListener("click", async () => {
  await setLocal({ channelStats: {} });
  await refresh();
  setStatus("Cleared stats", "ok");
});

btnClearFavs.addEventListener("click", async () => {
  await setLocal({ favChannels: [] });
  await refresh();
  setStatus("Cleared favorites", "ok");
});

// Reset all
btnResetAll.addEventListener("click", async () => {
  const ok = confirm("RESET ALL DATA? (queue+settings+bias+cache) This cannot be undone.");
  if(!ok) return;

  await chrome.storage.local.clear();
  await chrome.runtime.sendMessage({ type: "SETTINGS_GET" }).catch(()=>{});
  await refresh();
  setStatus("RESET DONE ✅", "warn");
});

// Init
(async function init(){
  initAbout();
  await refresh();
  setStatus("Ready", "ok");
})();
