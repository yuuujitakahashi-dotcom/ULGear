/**
 * ULギアデータベース構築スクリプト
 * 実行: node scripts/fetch-moonlight-gear.mjs
 *
 * 複数ショップのShopify APIから商品を取得し、
 * body_htmlから重量を抽出して public/moonlight-gear.json に保存します。
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, '../public/moonlight-gear.json');

const SHOPS = [
  { name: 'Moonlight Gear', base: 'https://moonlight-gear.com' },
  { name: "Hiker's Depot",  base: 'https://hikersdepot.jp' },
  { name: '山と道',          base: 'https://shop.yamatomichi.com' },
];

function extractWeight(text) {
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

function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
}

function getBrand(tags) {
  const brandTag = tags.find(t => t.startsWith('brand-'));
  return brandTag ? brandTag.replace('brand-', '') : '';
}

async function fetchAllProducts(base, shopName) {
  const all = [];
  let page = 1;
  while (true) {
    process.stdout.write(`  [${shopName}] ページ ${page}...`);
    const res = await fetch(`${base}/collections/all/products.json?limit=250&page=${page}`);
    if (!res.ok) { console.log(` エラー ${res.status}`); break; }
    const { products } = await res.json();
    if (!products?.length) { console.log(' 完了'); break; }
    all.push(...products);
    console.log(` ${products.length}件（計 ${all.length}件）`);
    if (products.length < 250) break;
    page++;
    await new Promise(r => setTimeout(r, 300));
  }
  return all;
}

function extractIndexWeight(str) {
  if (!str) return 0;
  const m = str.match(/([\d,]+(?:\.\d+)?)\s*g/i);
  if (m) { const v = Math.round(parseFloat(m[1].replace(/,/g,''))); if (v > 0 && v < 50000) return v; }
  const kg = str.match(/([\d,]+(?:\.\d+)?)\s*kg/i);
  if (kg) { const v = Math.round(parseFloat(kg[1].replace(/,/g,'')) * 1000); if (v > 0 && v < 50000) return v; }
  return 0;
}

async function enrichYamatomichi(products) {
  console.log('  山と道 メインサイトから重量・画像を取得中...');
  let enriched = 0;
  const CONCURRENCY = 5;
  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const batch = products.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async p => {
      try {
        const res = await fetch(`https://www.yamatomichi.com/products/${p.handle}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
        if (!res.ok) return;
        const html = await res.text();
        const m = html.match(/__NEXT_DATA__[^>]+>(.+?)<\/script>/s);
        if (!m) return;
        const cn = JSON.parse(m[1])?.props?.pageProps?.contentNode;
        if (!cn) return;
        const w = extractIndexWeight(cn.productsInfo?.indexWeight);
        if (w > 0) { p.weight = w; enriched++; }
        const img = cn.featuredImage?.node?.mediaItemUrl;
        if (img) p.image = img;
      } catch { /* skip */ }
    }));
    process.stdout.write(`\r  ${Math.min(i + CONCURRENCY, products.length)}/${products.length} 件処理中...`);
    await new Promise(r => setTimeout(r, 200));
  }
  console.log(`\n  重量取得: ${enriched}/${products.length} 件`);
}

async function main() {
  console.log('ULギアDB構築開始...\n');
  const allProducts = [];
  const yamatomichi = [];

  for (const shop of SHOPS) {
    console.log(`\n${shop.name}:`);
    const products = await fetchAllProducts(shop.base, shop.name);

    let withWeight = 0;
    for (const p of products) {
      const bodyText = stripHtml(p.body_html || '');
      const weight = extractWeight(bodyText);
      if (weight > 0) withWeight++;
      const entry = {
        id: `${shop.base}_${p.id}`,
        title: p.title,
        handle: p.handle,
        url: `${shop.base}/products/${p.handle}`,
        shop: shop.name,
        type: p.product_type || '',
        brand: getBrand(p.tags || []),
        price: p.variants?.[0]?.price ? Math.round(parseFloat(p.variants[0].price)) : 0,
        weight,
        image: p.images?.[0]?.src || '',
      };
      allProducts.push(entry);
      if (shop.name === '山と道') yamatomichi.push(entry);
    }
    console.log(`  重量取得: ${withWeight}/${products.length} 件 (${Math.round(withWeight/products.length*100)}%)`);
  }

  if (yamatomichi.length > 0) {
    console.log('\n山と道 重量・画像エンリッチメント:');
    await enrichYamatomichi(yamatomichi);
  }

  writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), products: allProducts }, null, 2));

  const withWeight = allProducts.filter(p => p.weight > 0).length;
  console.log(`\n完了！`);
  console.log(`  総商品数: ${allProducts.length}`);
  console.log(`  重量取得: ${withWeight} 件 (${Math.round(withWeight/allProducts.length*100)}%)`);
  console.log(`  保存先: public/moonlight-gear.json`);
}

main().catch(console.error);
