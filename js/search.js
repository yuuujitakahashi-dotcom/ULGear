// ── URL Import Search ──
let _debounce = null;
let _dropOpen = false;
let _pendingUrlGear = null;

function isUrl(val) {
  return /^https?:\/\//i.test(val.trim());
}

function onInput(val) {
  clearTimeout(_debounce);
  if (!isUrl(val)) { closeDrop(); setLeadIcon('link'); return; }
  setLeadIcon('sync', true);
  _debounce = setTimeout(() => fetchFromUrl(val.trim()), 400);
}

function onFocus() {}
function onBlur() { setTimeout(closeDrop, 180); }

function onKeydown(e) {
  if (e.key==='Escape') closeDrop();
}

function setLeadIcon(name, spin=false) {
  const el = document.getElementById('searchLeadIcon');
  el.textContent = name;
  el.classList.toggle('spin-icon', spin);
}

function openDrop() {
  _dropOpen = true;
  document.getElementById('searchRow').classList.add('open');
  document.getElementById('predictDrop').classList.add('open');
}

function closeDrop() {
  _dropOpen = false;
  document.getElementById('searchRow').classList.remove('open');
  document.getElementById('predictDrop').classList.remove('open');
}

// ── CORS Proxy helpers ──
async function fetchWithTimeout(url, ms = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(targetUrl) {
  const enc = encodeURIComponent(targetUrl);
  const proxies = [
    async () => {
      const r = await fetchWithTimeout(`https://corsproxy.io/?${enc}`);
      if (!r.ok) throw new Error('corsproxy failed');
      return await r.text();
    },
    async () => {
      const r = await fetchWithTimeout(`https://api.allorigins.win/get?url=${enc}`);
      const d = await r.json();
      if (!d.contents) throw new Error('allorigins empty');
      return d.contents;
    },
    async () => {
      const r = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${enc}`);
      if (!r.ok) throw new Error('codetabs failed');
      return await r.text();
    },
  ];
  for (const proxy of proxies) {
    try { return await proxy(); } catch(e) { continue; }
  }
  throw new Error('all proxies failed');
}

// ── URL → Product Info ──
async function fetchFromUrl(url) {
  const drop = document.getElementById('predictDrop');
  drop.innerHTML = `
    <div class="shimmer-row">
      <div class="shimmer" style="width:52px;height:52px;border-radius:10px;flex-shrink:0"></div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        <div class="shimmer" style="height:13px;width:70%;border-radius:4px"></div>
        <div class="shimmer" style="height:11px;width:45%;border-radius:4px"></div>
      </div>
    </div>`;
  openDrop();

  try {
    const html = await fetchHtml(url);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const name     = getMeta(doc,'og:title') || doc.title || '';
    const image    = getMeta(doc,'og:image') || '';
    const desc     = getMeta(doc,'og:description') || '';
    const bodyText = (doc.body ? doc.body.textContent : html) + ' ' + desc;
    const weight   = extractWeight(bodyText);
    const cat      = guessCategory(name + ' ' + desc + ' ' + bodyText.slice(0,500));

    const cleanedName = name.replace(/[\|｜].*$/, '').replace(/\s*[-–—].*$/, '').trim();

    drop.innerHTML = `
      <div class="predict-item" onclick="confirmUrlGear()">
        ${image ? `<div class="p-icon"><img src="${image}" alt="" loading="lazy"></div>` : `<div class="p-icon">${CAT_ICONS[cat]||'📦'}</div>`}
        <div class="p-body">
          <div class="p-name">${cleanedName||'（名称不明）'}</div>
          <div class="p-chips">
            <span class="p-chip">${CAT_LABELS[cat]||cat}</span>
            ${weight ? `<span class="p-chip"><span class="material-icons-round">monitor_weight</span>${weight}g</span>` : ''}
          </div>
        </div>
        <button class="p-add" onclick="event.stopPropagation();confirmUrlGear()" title="追加">
          <span class="material-icons-round">add</span>
        </button>
      </div>`;

    _pendingUrlGear = { name: cleanedName, cat, weight, image, note: '' };

  } catch(e) {
    drop.innerHTML = `<div style="padding:16px;text-align:center;color:var(--on-surface-v);font-size:13px">
      <span class="material-icons-round" style="display:block;font-size:28px;color:var(--outline-v);margin-bottom:8px">wifi_off</span>
      読み込めませんでした<br>
      <button onclick="closeDrop();openNewGearDialog({})" style="margin-top:12px;height:36px;padding:0 16px;border-radius:999px;border:1px solid var(--outline);background:transparent;font-size:13px;font-weight:700;font-family:inherit;cursor:pointer;color:var(--primary)">
        手動で入力する
      </button>
    </div>`;
  }
  setLeadIcon('link');
}

function confirmUrlGear() {
  if (!_pendingUrlGear) return;
  closeDrop();
  openNewGearDialog(_pendingUrlGear);
  _pendingUrlGear = null;
}

function getMeta(doc, prop) {
  const el = doc.querySelector(`meta[property="${prop}"]`) ||
             doc.querySelector(`meta[name="${prop}"]`);
  return el ? (el.getAttribute('content') || '') : '';
}

function extractWeight(text) {
  const gPats = [
    /重量[^\d]{0,6}(\d+(?:\.\d+)?)\s*g(?!\/)/i,
    /重さ[^\d]{0,6}(\d+(?:\.\d+)?)\s*g(?!\/)/i,
    /ウェイト[^\d]{0,6}(\d+(?:\.\d+)?)\s*g(?!\/)/i,
    /Weight[:\s]{0,4}(\d+(?:\.\d+)?)\s*g/i,
    /(\d+(?:\.\d+)?)\s*g[（(]/,
  ];
  for (const p of gPats) {
    const m = text.match(p);
    if (m) { const v = parseFloat(m[1]); if (v > 0 && v < 50000) return Math.round(v); }
  }
  const kgPats = [
    /重量[^\d]{0,6}(\d+(?:\.\d+)?)\s*kg/i,
    /重さ[^\d]{0,6}(\d+(?:\.\d+)?)\s*kg/i,
    /Weight[:\s]{0,4}(\d+(?:\.\d+)?)\s*kg/i,
  ];
  for (const p of kgPats) {
    const m = text.match(p);
    if (m) { const v = parseFloat(m[1]); if (v > 0 && v < 50) return Math.round(v * 1000); }
  }
  return 0;
}

function guessCategory(text) {
  const t = text.toLowerCase();
  if (/テント|シュラフ|寝袋|スリーピング|マット|sleeping|tent|pad/.test(t)) return 'Sleep';
  if (/クッカー|バーナー|コンロ|stove|cook|pot|pan/.test(t)) return 'Cook';
  if (/バックパック|ザック|リュック|pack/.test(t)) return 'Backpack';
  if (/ジャケット|パンツ|シャツ|ウェア|フリース|jacket|pants|shirt|fleece/.test(t)) return 'Clothing';
  if (/シューズ|ブーツ|トレイル|shoe|boot/.test(t)) return 'Footwear';
  if (/ヘッドランプ|ランタン|headlamp|lantern|light/.test(t)) return 'Light';
  if (/コンパス|gps|地図|map|navigation/.test(t)) return 'Navigation';
  if (/食料|フード|water|hydration|filter/.test(t)) return 'Food';
  if (/救急|first.aid|safety|whistle/.test(t)) return 'Safety';
  return 'Other';
}
