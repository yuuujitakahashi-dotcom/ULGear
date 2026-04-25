import type { GearList, Category, Account } from '@/types';
import { STORAGE_KEY, CAT_STORAGE_KEY, ACCOUNT_KEY, DEFAULT_CATEGORIES } from '@/types';

const SAMPLE_VERSION = 'v8';
const VERSION_KEY = 'ulgear_sample_version';

// UL compass (https://ul-compass.com/ul-gear-list/) のギアリストを参考にしたサンプル
const SAMPLE_GEARS = [
  { cat: 'Sleep',    name: '山と道 MINI2',                              weight: 448 },
  { cat: 'Sleep',    name: 'Zpacks Hexamid Pocket Tarp w/Doors',       weight: 142 },
  { cat: 'Sleep',    name: 'CUMULUS X-LITE 200 Custom / シュラフ',      weight: 297, image: 'https://cdn.shopify.com/s/files/1/0598/0821/9307/files/SDIM3399.jpg?v=1734315567' },
  { cat: 'Sleep',    name: '山と道 UL Pad 15',                          weight: 75,  image: 'https://cdn.shopify.com/s/files/1/0535/8380/6627/files/2024_UL-Pad-15-Plus-100cm_color.jpg?v=1772847605' },
  { cat: 'Cook',     name: 'FREELIGHT Titanium Pot UL-380H',           weight: 57  },
  { cat: 'Cook',     name: 'FINAL FLAME アルコールストーブ FAS-30T',     weight: 11,  image: 'https://cdn.shopify.com/s/files/1/0535/8380/6627/files/2015-08-27-14.51.30-1080x1080.jpg?v=1712643833' },
  { cat: 'Cook',     name: 'KATADYN BeFree 浄水器',                     weight: 63,  image: 'https://cdn.shopify.com/s/files/1/0598/0821/9307/files/DSC01705-_-SR.jpg?v=1744609449' },
  { cat: 'Clothing', name: 'ENLIGHTENED EQUIPMENT Torrid Pullover',    weight: 198, image: 'https://cdn.shopify.com/s/files/1/0598/0821/9307/files/aa.png?v=1747977192' },
  { cat: 'Clothing', name: '山と道 UL All-weather Hoody',               weight: 109, image: 'https://cdn.shopify.com/s/files/1/0535/8380/6627/files/ULAll-weatherHoody_Peppermint_1.webp?v=1760780570' },
  { cat: 'Clothing', name: '山と道 UL All-weather Pants',               weight: 83  },
  { cat: 'Clothing', name: 'patagonia キャプリーン・クール・メリノ',       weight: 139 },
  { cat: 'Safety',   name: 'ファーストエイド＆エマージェンシーキット',       weight: 106 },
  { cat: 'Safety',   name: 'MOUNTAIN KING Trail Blaze Skyrunner',      weight: 226, image: 'https://cdn.shopify.com/s/files/1/0598/0821/9307/files/01_6675e7a8-aac2-4764-9544-44d2d33f77ba.jpg?v=1693806941' },
  { cat: 'Light',    name: 'Black Diamond フレアー',                    weight: 26  },
  { cat: 'Light',    name: 'Anker PowerCore II 6700',                  weight: 131 },
  { cat: 'Other',    name: 'VICTORINOX クラシックAL',                   weight: 17,  image: 'https://cdn.shopify.com/s/files/1/0598/0821/9307/products/top1_4cf6d26a-28f3-4c56-807f-8d620c6ce804.jpg?v=1642648880' },
  { cat: 'Other',    name: 'Ra-Shin ミニマリストコンパス',                weight: 16  },
  { cat: 'Food',     name: '行動食・フリーズドライ',                       weight: 400 },
  { cat: 'Water',    name: 'コカ・コーラ ICY SPARK 500ml',               weight: 47  },
  { cat: 'Water',    name: '水 1.0L',                                   weight: 1000 },
  { cat: 'Fuel',     name: 'FREELIGHT PP Bottle 燃料ボトル',             weight: 17  },
];

export function loadGearData(): { lists: GearList[]; currentListId: number } {
  try {
    if (localStorage.getItem(VERSION_KEY) !== SAMPLE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(VERSION_KEY, SAMPLE_VERSION);
    }
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.lists && saved.lists.length > 0) {
      return { lists: saved.lists, currentListId: saved.currentListId || saved.lists[0].id };
    }
    const gears = (saved.gears && saved.gears.length > 0)
      ? saved.gears
      : SAMPLE_GEARS.map((g, i) => ({ id: Date.now() + i, ...g }));
    const list: GearList = {
      id: Date.now(),
      name: 'ALL My Gear',
      gears,
      checkedIds: saved.checkedIds || [],
      info: { comment: '2026/7 北アルプス 3泊4日・槍ヶ岳〜穂高縦走　天気：晴れ時々曇り　/ 気温：稜線10℃前後' },
    };
    return { lists: [list], currentListId: list.id };
  } catch {
    const gears = SAMPLE_GEARS.map((g, i) => ({ id: Date.now() + i, ...g }));
    const list: GearList = { id: Date.now(), name: 'ALL My Gear', gears, checkedIds: [], info: { comment: '2026/7 北アルプス 3泊4日・槍ヶ岳〜穂高縦走　天気：晴れ時々曇り　/ 気温：稜線10℃前後' } };
    return { lists: [list], currentListId: list.id };
  }
}

export function saveGearData(lists: GearList[], currentListId: number) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ lists, currentListId }));
}

export function loadCategories(): Category[] {
  try {
    const saved = JSON.parse(localStorage.getItem(CAT_STORAGE_KEY) || 'null');
    let cats: Category[] = Array.isArray(saved) && saved.length
      ? saved
      : DEFAULT_CATEGORIES.map(c => ({ ...c }));

    let migrated = false;
    cats.forEach(c => {
      if (!c.group || (c.group as string) === 'food' || (c.group as string) === 'water') {
        const def = DEFAULT_CATEGORIES.find(d => d.key === c.key);
        c.group = def?.group || 'base';
        migrated = true;
      }
    });
    for (const def of DEFAULT_CATEGORIES) {
      if (!cats.find(c => c.key === def.key)) {
        cats.push({ ...def });
        migrated = true;
      }
    }
    if (migrated) localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(cats));
    return cats;
  } catch {
    return DEFAULT_CATEGORIES.map(c => ({ ...c }));
  }
}

export function saveCategories(categories: Category[]) {
  localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(categories));
}

export function loadAccount(): Account {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNT_KEY) || '{}');
  } catch {
    return {};
  }
}

export function saveAccount(account: Account) {
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
}
