async function fetchWithTimeout(url: string, ms = 6000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function fetchHtml(targetUrl: string): Promise<string> {
  const enc = encodeURIComponent(targetUrl);
  const proxies = [
    async () => {
      const r = await fetchWithTimeout(`https://corsproxy.io/?${enc}`);
      if (!r.ok) throw new Error('corsproxy failed');
      return r.text();
    },
    async () => {
      const r = await fetchWithTimeout(`https://api.allorigins.win/get?url=${enc}`);
      const d = await r.json();
      if (!d.contents) throw new Error('allorigins empty');
      return d.contents as string;
    },
    async () => {
      const r = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${enc}`);
      if (!r.ok) throw new Error('codetabs failed');
      return r.text();
    },
  ];
  return Promise.any(proxies.map(fn => fn()));
}

function getMeta(doc: Document, prop: string): string {
  const el = doc.querySelector(`meta[property="${prop}"]`) || doc.querySelector(`meta[name="${prop}"]`);
  return el ? (el.getAttribute('content') || '') : '';
}

function parseJsonLd(doc: Document): { name: string; image: string; weight: number } | null {
  for (const script of doc.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data = JSON.parse(script.textContent || '');
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const product = item['@type'] === 'Product' ? item
          : item['@graph']?.find((n: { '@type': string }) => n['@type'] === 'Product');
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
    } catch { /* ignore */ }
  }
  return null;
}

export function extractWeightFromDom(doc: Document): number {
  const KEY = /重量|重さ|本体重量|商品重量|ウェイト|Weight|Wt\./i;
  for (const dt of doc.querySelectorAll('dt')) {
    if (KEY.test(dt.textContent || '')) {
      const dd = dt.nextElementSibling;
      if (dd) { const v = extractWeight(dd.textContent || ''); if (v > 0) return v; }
    }
  }
  for (const th of doc.querySelectorAll('th, td')) {
    const txt = th.textContent?.trim() || '';
    if (KEY.test(txt) && txt.length < 25) {
      const td = th.nextElementSibling;
      if (td) { const v = extractWeight(td.textContent || ''); if (v > 0) return v; }
    }
  }
  return 0;
}

export function extractWeight(text: string): number {
  const pats: [RegExp, number][] = [
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

export function guessCategory(text: string): string {
  const t = text.toLowerCase();
  const RULES: Record<string, [RegExp, number][]> = {
    Sleep: [
      [/nemo|big.?agnes|therm.?a.?rest/, 10],
      [/シュラフ|寝袋|sleeping.?bag/, 9],
      [/テント(?!.*バッグ)|tent(?!\w)(?!.*bag)/, 9],
      [/タープ|tarp(?!\w)|ビビー|bivy|bivouac/, 8],
      [/スリーピングマット|sleeping.?mat|sleep.?pad/, 9],
      [/マット(?!リョク)(?!レス)/, 3],
    ],
    Cook: [
      [/jetboil|trangia|primus|soto(?!\w)/, 10],
      [/クッカー|cooker|cookset|cook.?pot/, 9],
      [/バーナー|stove(?!\w)/, 9],
      [/ケトル|kettle(?!\w)|飯盒/, 8],
      [/カニスター|canister(?!\w)|od缶|ガス缶/, 7],
    ],
    Backpack: [
      [/osprey|gregory|hyperlite|gossamer/, 10],
      [/バックパック|backpack(?!\w)/, 9],
      [/ザック(?!リ)|rucksack/, 9],
      [/リュック|daypack/, 6],
      [/pack(?!\w)(?!age)(?!et)/, 3],
    ],
    Clothing: [
      [/arc.?teryx|patagonia|mammut|rab(?!\w)/, 8],
      [/レインウェア|rain.?jacket|rain.?wear/, 9],
      [/ハードシェル|hardshell|ソフトシェル|softshell/, 9],
      [/ジャケット|jacket(?!\w)/, 8],
      [/フリース|fleece(?!\w)/, 8],
      [/ダウンジャケット|down.?jacket/, 9],
    ],
    Light: [
      [/petzl|ledlenser|fenix(?!\w)/, 10],
      [/ヘッドランプ|headlamp/, 10],
      [/ランタン|lantern(?!\w)/, 8],
      [/ライト(?!ウェイト)(?!ウェア)|light(?!\w)(?!weight)(?!ly)/, 4],
    ],
    Food: [
      [/フリーズドライ|freeze.?dried/, 9],
      [/行動食|レーション|ration(?!\w)/, 8],
      [/water.?bottle|水筒|ウォーターボトル/, 7],
      [/food(?!\w)|食料/, 4],
    ],
    Safety: [
      [/ファーストエイド|first.?aid/, 9],
      [/ホイッスル|whistle(?!\w)/, 8],
      [/エマージェンシー|emergency(?!\w)/, 7],
    ],
  };
  let best = { cat: 'Other', score: 0 };
  for (const [cat, rules] of Object.entries(RULES)) {
    const score = rules.reduce((sum, [pat, w]) => sum + (pat.test(t) ? w : 0), 0);
    if (score > best.score) best = { cat, score };
  }
  return best.cat;
}

export interface FetchedGear {
  name: string;
  cat: string;
  weight: number;
  image: string;
  note: string;
}

export async function fetchFromUrl(url: string): Promise<FetchedGear> {
  const fetchUrl = /amazon\.(co\.jp|com)/i.test(url)
    ? url.replace(/[?#].*$/, '') + '?th=1&psc=1'
    : url;
  const html = await fetchHtml(fetchUrl);
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const ld = parseJsonLd(doc);
  const name = ld?.name
    || getMeta(doc, 'og:title')
    || getMeta(doc, 'title')
    || doc.querySelector('#productTitle')?.textContent?.trim()
    || doc.title || '';
  const image = ld?.image || getMeta(doc, 'og:image') || doc.querySelector('#landingImage')?.getAttribute('src') || '';
  const desc = getMeta(doc, 'og:description') || '';
  const bodyText = (doc.body ? doc.body.textContent : html) + ' ' + desc;
  const weight = ld?.weight || extractWeightFromDom(doc) || extractWeight(bodyText);
  const cat = guessCategory(name + ' ' + desc + ' ' + url + ' ' + bodyText.slice(0, 800));
  const cleanedName = name.replace(/[\|｜].*$/, '').replace(/\s*[-–—].*$/, '').trim();
  return { name: cleanedName, cat, weight, image, note: '' };
}
