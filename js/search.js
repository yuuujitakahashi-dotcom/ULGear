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
  // URLの場合はペーストをすぐ検知して即実行、手入力は少し待つ
  _debounce = setTimeout(() => fetchFromUrl(val.trim()), 100);
}

function onPaste(e) {
  // ペーストは確定後の値で即実行
  setTimeout(() => {
    const val = document.getElementById('searchInput').value;
    if (isUrl(val)) {
      clearTimeout(_debounce);
      setLeadIcon('sync', true);
      fetchFromUrl(val.trim());
    }
  }, 0);
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
async function fetchWithTimeout(url, ms = 6000) {
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
  // 全プロキシを並列実行して最速のものを採用
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
  return await Promise.any(proxies.map(fn => fn()));
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
    // AmazonはASIN直リンク+th=1でログイン不要の商品ページを取得しやすくなる
    const fetchUrl = /amazon\.(co\.jp|com)/i.test(url)
      ? url.replace(/[?#].*$/, '') + '?th=1&psc=1'
      : url;
    const html = await fetchHtml(fetchUrl);

    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // 1. JSON-LD構造化データ（最も信頼性が高い）
    const ld       = parseJsonLd(doc);
    // 2. OGP / meta / Amazon専用セレクタ
    const name     = ld?.name
                  || getMeta(doc,'og:title')
                  || getMeta(doc,'title')
                  || doc.querySelector('#productTitle')?.textContent?.trim()
                  || doc.title || '';
    const image    = ld?.image
                  || getMeta(doc,'og:image')
                  || doc.querySelector('#landingImage')?.src
                  || doc.querySelector('#imgBlkFront')?.src || '';
    const desc     = getMeta(doc,'og:description') || '';
    const bodyText = (doc.body ? doc.body.textContent : html) + ' ' + desc;
    const weight   = ld?.weight || extractWeightFromDom(doc) || extractWeight(bodyText);
    const cat      = guessCategory(name + ' ' + desc + ' ' + url + ' ' + bodyText.slice(0,800));

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

// JSON-LD構造化データからProduct情報を取得
function parseJsonLd(doc) {
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const product = item['@type'] === 'Product' ? item
          : item['@graph']?.find(n => n['@type'] === 'Product');
        if (!product) continue;
        const image = Array.isArray(product.image) ? product.image[0] : (product.image || '');
        let weight = 0;
        if (product.weight?.value) {
          const unit = (product.weight.unitCode || product.weight.unitText || 'g').toLowerCase();
          const v = parseFloat(product.weight.value);
          weight = unit.includes('kg') ? Math.round(v * 1000) : Math.round(v);
        }
        return { name: product.name || '', image, weight };
      }
    } catch(e) {}
  }
  return null;
}

// DOM構造（仕様表・定義リスト）から重量を抽出
function extractWeightFromDom(doc) {
  const KEY = /重量|重さ|本体重量|商品重量|ウェイト|Weight|Wt\./i;

  // dt/dd 形式
  for (const dt of doc.querySelectorAll('dt')) {
    if (KEY.test(dt.textContent)) {
      const dd = dt.nextElementSibling;
      if (dd) { const v = extractWeight(dd.textContent); if (v > 0) return v; }
    }
  }

  // th/td 形式（仕様表）
  for (const th of doc.querySelectorAll('th, td')) {
    const txt = th.textContent.trim();
    if (KEY.test(txt) && txt.length < 25) {
      const td = th.nextElementSibling;
      if (td) { const v = extractWeight(td.textContent); if (v > 0) return v; }
    }
  }

  return 0;
}

// テキストから重量を正規表現で抽出
function extractWeight(text) {
  // [パターン, 単位をgに変換する倍率]
  const pats = [
    [/(?:重量|重さ|本体重量|商品重量|ウェイト)[^\d]{0,12}約?\s*([\d,]+(?:\.\d+)?)\s*g(?!\/)/i, 1],
    [/(?:Weight|Wt\.?)[:\s]{0,6}([\d,]+(?:\.\d+)?)\s*g(?!\s*\/)/i, 1],
    [/[Ww]eighs?\s+([\d,]+(?:\.\d+)?)\s*g/i, 1],
    [/([\d,]+(?:\.\d+)?)\s*g\s*[（([\s]/i, 1],
    [/(?:重量|重さ|本体重量|商品重量|ウェイト)[^\d]{0,12}約?\s*([\d,]+(?:\.\d+)?)\s*kg/i, 1000],
    [/(?:Weight|Wt\.?)[:\s]{0,6}([\d,]+(?:\.\d+)?)\s*kg/i, 1000],
    [/(?:Weight|Wt\.?)[:\s]{0,6}([\d,]+(?:\.\d+)?)\s*(?:lbs?|pounds?)/i, 453.592],
    [/(?:Weight|Wt\.?)[:\s]{0,6}([\d,]+(?:\.\d+)?)\s*oz/i, 28.3495],
  ];

  for (const [pat, mult] of pats) {
    const m = text.match(pat);
    if (m) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      const grams = Math.round(v * mult);
      if (grams > 0 && grams < 50000) return grams;
    }
  }
  return 0;
}

function guessCategory(text) {
  const t = text.toLowerCase();
  const match = (pat) => pat.test(t);

  if (match(/テント|シュラフ|寝袋|スリーピングバッグ|スリーピングマット|マット|タープ|ビビー|ツェルト|tent|sleeping.?bag|sleep.?mat|bivy|bivouac|tarp|groundsheet/)) return 'Sleep';
  if (match(/クッカー|バーナー|コンロ|ストーブ|ケトル|飯盒|アルコールバーナー|stove|cooker|cookset|cook.?pot|pot|pan|kettle|canister|fuel.?can|アルコール炉/)) return 'Cook';
  if (match(/バックパック|ザック|リュック|ハイドレーション|backpack|rucksack|daypack|frameless.?pack|ultralight.?pack/)) return 'Backpack';
  if (match(/ジャケット|パンツ|ズボン|シャツ|ウェア|フリース|ダウン|レインウェア|ハードシェル|ソフトシェル|グローブ|手袋|帽子|ニット|バラクラバ|ゲイター|ソックス|靴下|ベースレイヤー|タイツ|ロングスリーブ|jacket|pants|trousers|shirt|fleece|down.?jacket|rain.?jacket|hardshell|softshell|glove|hat|cap|beanie|balaclava|sock|baselayer|midlayer|insulated/)) return 'Clothing';
  if (match(/シューズ|ブーツ|トレイルランニング|トレラン|インソール|アプローチ|shoe|boot|trail.?runner|approach|insole|footwear/)) return 'Footwear';
  if (match(/ヘッドランプ|ランタン|ライト|懐中電灯|headlamp|lantern|flashlight|torch|beacon.?light/)) return 'Light';
  if (match(/コンパス|gps|地図|マップ|高度計|腕時計|サーモメーター|compass|map|altimeter|gps.?watch|navigation|barometer/)) return 'Navigation';
  if (match(/食料|フード|行動食|レーション|水筒|ボトル|浄水器|フィルター|プラティパス|ハイドレーション|food|ration|energy.?bar|water.?bottle|hydration|water.?filter|purifier/)) return 'Food';
  if (match(/救急|ファーストエイド|ホイッスル|ビーコン|エマージェンシー|ツェルト|サバイバル|ファイヤースターター|first.?aid|whistle|emergency|beacon|survival|fire.?starter|shelter.?sheet/)) return 'Safety';
  return 'Other';
}
