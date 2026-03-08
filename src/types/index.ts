export interface Gear {
  id: number;
  name: string;
  cat: string;
  weight: number;
  note?: string;
  image?: string;
}

export interface GearList {
  id: number;
  name: string;
  gears: Gear[];
  checkedIds: number[];
  info?: Record<string, string>;
}

export interface Category {
  key: string;
  label: string;
  group: 'base' | 'consumable';
  col?: 0 | 1 | 2;
}

export interface Account {
  name?: string;
  handle?: string;
  bio?: string;
  image?: string;
}

export const CAT_ICONS: Record<string, string> = {
  Sleep: '😴', Cook: '🍳', Backpack: '🎒', Clothing: '👕',
  Safety: '🩹', Food: '🍱', Light: '🔦', Other: '📦',
  Water: '💧', Fuel: '🔥', Rainwear: '🧥',
};

export const DEFAULT_CATEGORIES: Category[] = [
  { key: 'Sleep',    label: 'Sleep',    group: 'base' },
  { key: 'Cook',     label: 'Cook',     group: 'base' },
  { key: 'Backpack', label: 'Backpack', group: 'base' },
  { key: 'Clothing', label: 'Wear',     group: 'base' },
  { key: 'Safety',   label: 'Safety',   group: 'base' },
  { key: 'Light',    label: 'Light',    group: 'base' },
  { key: 'Rainwear', label: 'Rainwear', group: 'base' },
  { key: 'Other',    label: 'Other',    group: 'base' },
  { key: 'Food',     label: 'Food',     group: 'consumable', col: 0 },
  { key: 'Water',    label: 'Water',    group: 'consumable', col: 1 },
  { key: 'Fuel',     label: 'Fuel',     group: 'consumable', col: 2 },
];

export const STORAGE_KEY = 'ulgear_data';
export const CAT_STORAGE_KEY = 'ulgear_cats';
export const ACCOUNT_KEY = 'ulgear_account';
