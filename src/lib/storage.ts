import type { GearList, Category, Account } from '@/types';
import { STORAGE_KEY, CAT_STORAGE_KEY, ACCOUNT_KEY, DEFAULT_CATEGORIES } from '@/types';

export function loadGearData(): { lists: GearList[]; currentListId: number } {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.lists && saved.lists.length > 0) {
      return { lists: saved.lists, currentListId: saved.currentListId || saved.lists[0].id };
    }
    const list: GearList = {
      id: Date.now(),
      name: 'ALL My Gear',
      gears: saved.gears || [],
      checkedIds: saved.checkedIds || [],
    };
    return { lists: [list], currentListId: list.id };
  } catch {
    const list: GearList = { id: Date.now(), name: 'ALL My Gear', gears: [], checkedIds: [] };
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
