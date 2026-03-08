'use client';
import { useState, useEffect, useRef } from 'react';
import type { Gear, GearList, Category, Account } from '@/types';
import { loadGearData, saveGearData, loadCategories, saveCategories, loadAccount, saveAccount } from '@/lib/storage';
import { fetchFromUrl } from '@/lib/urlFetch';

const ACTIVITY_SUGGESTIONS = ['TrailRun','Hiking','Alpine','BackPacking','Camping','Trekking','ULHike'];
function randSuggestion() { return ACTIVITY_SUGGESTIONS[Math.floor(Math.random() * ACTIVITY_SUGGESTIONS.length)]; }

function weightLabel(w: number) {
  return (
    <span style={{fontSize:'18px',fontWeight:500,color:'var(--on-surface)',letterSpacing:0,textTransform:'none' as const}}>
      {(w/1000).toFixed(2)}
      <span style={{fontSize:'11px',color:'var(--on-surface-v)',fontWeight:400,marginLeft:'1px'}}>kg</span>
    </span>
  );
}

export default function HomePage() {
  const [lists, setLists] = useState<GearList[]>([]);
  const [currentListId, setCurrentListId] = useState<number>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [account, setAccount] = useState<Account>({});
  const [activeTab, setActiveTab] = useState<'home'|'trip'>('home');
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  // Dialog states
  const [editOpen, setEditOpen] = useState(false);
  const [editMode, setEditMode] = useState<'add'|'edit'>('add');
  const [editGearId, setEditGearId] = useState<number>(-1);
  const [editName, setEditName] = useState('');
  const [editCat, setEditCat] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editUrlStatus, setEditUrlStatus] = useState('');
  const [pendingImage, setPendingImage] = useState('');

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailGearId, setDetailGearId] = useState<number>(-1);

  const [catManagerOpen, setCatManagerOpen] = useState(false);
  const [catNewInput, setCatNewInput] = useState('');

  const [addListOpen, setAddListOpen] = useState(false);
  const [addListMode, setAddListMode] = useState<'new'|'copy'>('new');
  const [newListName, setNewListName] = useState('');
  const [copyFromId, setCopyFromId] = useState<number>(0);

  const [accountOpen, setAccountOpen] = useState(false);
  const [accName, setAccName] = useState('');
  const [accHandle, setAccHandle] = useState('');
  const [accBio, setAccBio] = useState('');
  const [accImage, setAccImage] = useState('');

  const [shareOpen, setShareOpen] = useState(false);
  const [listTitlePlaceholder, setListTitlePlaceholder] = useState('');

  const listTitleRef = useRef<HTMLDivElement>(null);
  const gearContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detailImgInputRef = useRef<HTMLInputElement>(null);
  const accountImgInputRef = useRef<HTMLInputElement>(null);

  // ── Init ──
  useEffect(() => {
    const { lists: ls, currentListId: cid } = loadGearData();
    const cats = loadCategories();
    const acc = loadAccount();
    setLists(ls);
    setCurrentListId(cid);
    setCategories(cats);
    setAccount(acc);
    setAccName(acc.name||'');
    setAccHandle(acc.handle||'');
    setAccBio(acc.bio||'');
    setAccImage(acc.image||'');
    setListTitlePlaceholder(randSuggestion());
    const cl = ls.find(l => l.id === cid) || ls[0];
    setCheckedIds(new Set(cl?.checkedIds || []));
  }, []);

  // ── Derived state ──
  const currentList = lists.find(l => l.id === currentListId) || lists[0];
  const gears: Gear[] = currentList?.gears || [];

  function isConsumable(cat: Category | undefined) {
    return cat?.group === 'consumable';
  }
  function isConsumableKey(key: string) {
    return isConsumable(categories.find(c => c.key === key));
  }

  // ── Persistence helpers ──
  function saveLists(newLists: GearList[], newCurrentId?: number) {
    const cid = newCurrentId ?? currentListId;
    saveGearData(newLists, cid);
    setLists([...newLists]);
    if (newCurrentId !== undefined) setCurrentListId(newCurrentId);
  }

  function updateCurrentGears(newGears: Gear[]) {
    setLists(prev => {
      const next = prev.map(l => l.id === currentListId ? {...l, gears: newGears} : l);
      saveGearData(next, currentListId);
      return next;
    });
  }

  // ── Snack ──
  function snack(msg: string) {
    setSnackMsg(msg);
    setSnackVisible(true);
    setTimeout(() => setSnackVisible(false), 2800);
  }

  // ── Assign default cols ──
  function assignDefaultColsMut(cats: Category[]) {
    const nonCons = cats.filter(c => !isConsumable(c));
    const unassigned = nonCons.filter(c => c.col === undefined);
    if (unassigned.length === 0) return;
    if (unassigned.length === nonCons.length) {
      const t = Math.ceil(nonCons.length / 3);
      nonCons.forEach((c, i) => { c.col = i < t ? 0 : i < t*2 ? 1 : 2; });
    } else {
      unassigned.forEach(c => { c.col = 0; });
    }
  }

  // ── Gear CRUD ──
  function addGear(gear: Omit<Gear,'id'>) {
    const newGear: Gear = { id: Date.now(), ...gear };
    const newGears = [...gears, newGear];
    updateCurrentGears(newGears);
    snack('✓ ' + gear.name + ' を登録しました');
  }

  function deleteGear(id: number) {
    const g = gears.find(x => x.id === id);
    const newGears = gears.filter(x => x.id !== id);
    setCheckedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    updateCurrentGears(newGears);
    if (g) snack(g.name + ' を削除しました');
  }

  function editGear(id: number, patch: Partial<Gear>) {
    const newGears = gears.map(g => g.id === id ? {...g, ...patch} : g);
    updateCurrentGears(newGears);
  }

  // ── List management ──
  function switchList(id: number) {
    setCurrentListId(id);
    const nl = lists.find(l => l.id === id);
    setCheckedIds(new Set(nl?.checkedIds || []));
    setListTitlePlaceholder(randSuggestion());
    saveGearData(lists, id);
  }

  function addList(name: string) {
    const id = Date.now();
    const newLists = [...lists, { id, name, gears: [], checkedIds: [] }];
    saveLists(newLists, id);
    setCheckedIds(new Set());
    setListTitlePlaceholder(randSuggestion());
    snack('シートを追加しました');
  }

  function duplicateList(srcId: number) {
    const src = lists.find(l => l.id === srcId);
    if (!src) return;
    const newId = Date.now();
    const newGears = src.gears.map(g => ({...g, id: Date.now() + Math.random()}));
    const newLists = [...lists, { id: newId, name: src.name + ' のコピー', gears: newGears, checkedIds: [] }];
    saveLists(newLists, newId);
    setCheckedIds(new Set());
    snack(src.name + ' をコピーしました');
  }

  function deleteList(id: number) {
    if (lists.length <= 1) return;
    if (!confirm((lists.find(l => l.id === id)?.name || '') + ' を削除しますか？')) return;
    const newLists = lists.filter(l => l.id !== id);
    const newCid = id === currentListId ? newLists[0].id : currentListId;
    saveLists(newLists, newCid);
    if (id === currentListId) {
      setCheckedIds(new Set(newLists[0]?.checkedIds || []));
    }
  }

  function saveListTitle() {
    if (!listTitleRef.current) return;
    const name = listTitleRef.current.textContent?.trim() || '';
    setLists(prev => {
      const next = prev.map(l => l.id === currentListId ? {...l, name} : l);
      saveGearData(next, currentListId);
      return next;
    });
  }

  function saveListInfo(key: string, value: string) {
    setLists(prev => {
      const next = prev.map(l => {
        if (l.id !== currentListId) return l;
        return {...l, info: {...(l.info||{}), [key]: value}};
      });
      saveGearData(next, currentListId);
      return next;
    });
  }

  // ── Category management ──
  function renameCat(key: string, newLabel: string) {
    newLabel = newLabel.trim();
    if (!newLabel) return;
    const cat = categories.find(c => c.key === key);
    if (!cat || cat.label === newLabel) return;
    const newCats = categories.map(c => c.key === key ? {...c, label: newLabel} : c);
    setCategories(newCats);
    saveCategories(newCats);
  }

  function setCatGroup(key: string, group: 'base'|'consumable') {
    const newCats = categories.map(c => c.key === key ? {...c, group} : c);
    setCategories(newCats);
    saveCategories(newCats);
  }

  function addNewCategory(label: string) {
    if (!label) return;
    const key = 'cat_' + Date.now();
    const newCats = [...categories, { key, label, group: 'base' as const }];
    setCategories(newCats);
    saveCategories(newCats);
    snack(label + ' を追加しました');
  }

  function deleteCat(key: string) {
    if (key === 'Other') return;
    const label = categories.find(c => c.key === key)?.label || key;
    const newCats = categories.filter(c => c.key !== key);
    const newLists = lists.map(l => ({
      ...l,
      gears: l.gears.map(g => g.cat === key ? {...g, cat: 'Other'} : g)
    }));
    setCategories(newCats);
    saveCategories(newCats);
    setLists(newLists);
    saveGearData(newLists, currentListId);
    snack(label + ' を削除しました（ギアは Other に移動）');
  }

  // ── Edit dialog ──
  function openNewGearDialog(prefill: Partial<Gear & {cat:string}> = {}) {
    setEditMode('add');
    setEditGearId(-1);
    setEditName(prefill.name||'');
    setEditCat(prefill.cat||'');
    setEditWeight(prefill.weight ? String(prefill.weight) : '');
    setEditNote(prefill.note||'');
    setEditUrl('');
    setEditUrlStatus('');
    setPendingImage(prefill.image||'');
    setEditOpen(true);
  }

  function openEditDialog(id: number) {
    const g = gears.find(x => x.id === id);
    if (!g) return;
    setEditMode('edit');
    setEditGearId(id);
    setEditName(g.name);
    setEditCat(g.cat);
    setEditWeight(g.weight ? String(g.weight) : '');
    setEditNote(g.note||'');
    setPendingImage(g.image||'');
    setEditOpen(true);
  }

  function closeEdit() {
    if (editMode === 'edit' && editGearId !== -1) {
      if (editName.trim()) {
        editGear(editGearId, { name: editName.trim(), cat: editCat, weight: parseInt(editWeight)||0, note: editNote.trim() });
      }
    }
    setEditOpen(false);
  }

  function confirmAddGear() {
    if (!editName.trim()) { snack('ギア名を入力してください'); return; }
    addGear({ name: editName.trim(), cat: editCat, weight: parseInt(editWeight)||0, note: editNote.trim(), image: pendingImage });
    setEditOpen(false);
  }

  async function fetchGearUrl(url: string) {
    if (!/^https?:\/\//i.test(url)) return;
    setEditUrlStatus('読み込み中…');
    try {
      const gear = await fetchFromUrl(url);
      if (gear.name) setEditName(gear.name);
      if (gear.weight) setEditWeight(String(gear.weight));
      if (gear.cat) setEditCat(gear.cat);
      if (gear.image) setPendingImage(gear.image);
      setEditUrlStatus('✓');
      setTimeout(() => setEditUrlStatus(''), 2000);
    } catch {
      setEditUrlStatus('取得失敗');
      setTimeout(() => setEditUrlStatus(''), 2000);
    }
  }

  // ── Detail dialog ──
  function openDetail(id: number) {
    setDetailGearId(id);
    setDetailOpen(true);
  }

  function onDetailImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || detailGearId === -1) return;
    const reader = new FileReader();
    reader.onload = ev => {
      editGear(detailGearId, { image: ev.target?.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // ── Trip ──
  function toggleCheck(id: number) {
    setCheckedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      const newCheckedIds = [...s];
      setLists(ls => {
        const next = ls.map(l => l.id === currentListId ? {...l, checkedIds: newCheckedIds} : l);
        saveGearData(next, currentListId);
        return next;
      });
      return s;
    });
  }

  function clearChecks() {
    setCheckedIds(new Set());
    setLists(prev => {
      const next = prev.map(l => l.id === currentListId ? {...l, checkedIds: []} : l);
      saveGearData(next, currentListId);
      return next;
    });
  }

  // ── Account ──
  function saveAccountData() {
    const acc: Account = { name: accName.trim(), handle: accHandle.trim(), bio: accBio.trim(), image: accImage||undefined };
    saveAccount(acc);
    setAccount(acc);
  }

  function onAccountImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setAccImage(dataUrl);
      const acc: Account = { name: accName.trim(), handle: accHandle.trim(), bio: accBio.trim(), image: dataUrl };
      saveAccount(acc);
      setAccount(acc);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // ── Share Card ──
  function _roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y);
    ctx.closePath();
  }

  async function generateShareCard() {
    await document.fonts.ready;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = 600, H = 400;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const acc = account;
    const total = gears.reduce((s,g) => s+g.weight, 0);
    const kg = (total/1000).toFixed(2);
    const px = 52;

    ctx.fillStyle = 'hsl(225,28%,92%)';
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#ffffff';
    _roundRect(ctx,24,24,W-48,H-48,22); ctx.fill();

    ctx.textBaseline = 'top';
    ctx.fillStyle = '#9a9dac';
    ctx.font = '500 12px "Google Sans",system-ui,sans-serif';
    ctx.fillText('ULoG', px, 46);

    ctx.fillStyle = '#1a1a1a';
    ctx.font = '500 18px "Noto Sans JP",system-ui,sans-serif';
    ctx.fillText(currentList?.name || 'Gear List', px, 72);

    ctx.textBaseline = 'alphabetic';
    const weightY = 172;
    ctx.fillStyle = '#000';
    ctx.font = '600 58px "Google Sans",system-ui,sans-serif';
    ctx.fillText(kg, px, weightY);
    const kgNumW = ctx.measureText(kg).width;
    ctx.fillStyle = '#9a9dac';
    ctx.font = '300 20px "Google Sans",system-ui,sans-serif';
    ctx.fillText(' kg', px + kgNumW, weightY);

    ctx.textBaseline = 'top';
    ctx.fillStyle = '#6b6f80';
    ctx.font = '400 13px "Noto Sans JP",system-ui,sans-serif';
    ctx.fillText(gears.length + ' items', px, 184);

    const bycat: Record<string,number> = {};
    gears.forEach(g => { if(!bycat[g.cat]) bycat[g.cat]=0; bycat[g.cat]+=g.weight; });
    const catEntries = Object.entries(bycat).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const chipH=24, chipR=6, chipPadX=10, chipGapX=8, chipGapY=8;
    let cx=px, cy=220;
    ctx.font = '500 11px "Noto Sans JP",system-ui,sans-serif';
    const catLabels: Record<string,string> = {};
    categories.forEach(c => { catLabels[c.key] = c.label; });
    for (const [cat, w] of catEntries) {
      const lbl = (catLabels[cat]||cat) + '  ' + (w>=1000?(w/1000).toFixed(1)+'kg':w+'g');
      const tw = ctx.measureText(lbl).width;
      const chipW = tw + chipPadX*2;
      if (cx+chipW > W-px) { cx=px; cy+=chipH+chipGapY; }
      ctx.fillStyle = 'hsl(225,28%,93%)';
      _roundRect(ctx,cx,cy,chipW,chipH,chipR); ctx.fill();
      ctx.fillStyle = '#3a3d50';
      ctx.textBaseline = 'middle';
      ctx.fillText(lbl, cx+chipPadX, cy+chipH/2);
      ctx.textBaseline = 'top';
      cx += chipW+chipGapX;
    }

    const divY = cy+chipH+20;
    ctx.strokeStyle = 'hsl(225,28%,90%)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px,divY); ctx.lineTo(W-px,divY); ctx.stroke();

    const avR=18, avCx=px+avR, avCy=divY+14+avR;
    if (acc.image) {
      const img = new Image();
      await new Promise(res => { img.onload=res; img.onerror=res; img.src=acc.image!; });
      ctx.save();
      ctx.beginPath(); ctx.arc(avCx,avCy,avR,0,Math.PI*2); ctx.clip();
      ctx.drawImage(img,avCx-avR,avCy-avR,avR*2,avR*2);
      ctx.restore();
    } else {
      ctx.fillStyle = 'hsl(225,28%,88%)';
      ctx.beginPath(); ctx.arc(avCx,avCy,avR,0,Math.PI*2); ctx.fill();
    }

    const textX = avCx+avR+12;
    const nameStr = acc.name||'';
    const handleStr = acc.handle||'';
    const lineGap=4, nameSize=14, handleSize=12;
    const totalTextH=(nameStr?nameSize:0)+(nameStr&&handleStr?lineGap:0)+(handleStr?handleSize:0);
    let textY = avCy - totalTextH/2;
    ctx.textBaseline = 'top';
    if (nameStr) {
      ctx.fillStyle='#1a1a1a';
      ctx.font=`500 ${nameSize}px "Noto Sans JP",system-ui,sans-serif`;
      ctx.fillText(nameStr,textX,textY);
      textY += nameSize+lineGap;
    }
    if (handleStr) {
      ctx.fillStyle='#9a9dac';
      ctx.font=`400 ${handleSize}px system-ui,sans-serif`;
      ctx.fillText(handleStr,textX,textY);
    }
  }

  async function downloadShareCard() {
    await generateShareCard();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.download = 'mygear.png';
    a.href = canvas.toDataURL('image/png');
    a.click();
  }

  async function shareCard() {
    await generateShareCard();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], 'mygear.png', { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try { await nav.share({ files: [file], title: 'ULoG' }); return; } catch {}
      }
      downloadShareCard();
    }, 'image/png');
  }

  // ── Gear DnD ──
  const gearDragId = useRef<number|null>(null);
  const gearDragOver = useRef<{id:number,before:boolean}|null>(null);

  function onGearDragStart(e: React.DragEvent, id: number) {
    gearDragId.current = id;
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const el = document.querySelector(`[data-gear-id="${id}"]`);
      el?.classList.add('gear-row-dragging');
    }, 0);
  }

  function onGearDragOver(e: React.DragEvent, id: number) {
    e.preventDefault();
    document.querySelectorAll('.gear-row-drop-before,.gear-row-drop-after').forEach(el => {
      el.classList.remove('gear-row-drop-before','gear-row-drop-after');
    });
    const row = document.querySelector(`[data-gear-id="${id}"]`);
    if (!row) return;
    const rect = row.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height/2;
    row.classList.add(before ? 'gear-row-drop-before' : 'gear-row-drop-after');
    gearDragOver.current = { id, before };
  }

  function onGearDragEnd() {
    document.querySelectorAll('.gear-row-drop-before,.gear-row-drop-after,.gear-row-dragging').forEach(el => {
      el.classList.remove('gear-row-drop-before','gear-row-drop-after','gear-row-dragging');
    });
    gearDragId.current = null;
    gearDragOver.current = null;
  }

  function onGearDropOnRow(e: React.DragEvent, targetId: number, targetCat: string) {
    e.preventDefault();
    const dragId = gearDragId.current;
    if (!dragId) return;
    document.querySelectorAll('.gear-row-drop-before,.gear-row-drop-after,.gear-row-dragging').forEach(el => {
      el.classList.remove('gear-row-drop-before','gear-row-drop-after','gear-row-dragging');
    });
    if (dragId === targetId) return;

    const gear = gears.find(g => g.id === dragId);
    if (!gear) return;
    const oldCat = gear.cat;
    const newGears = [...gears];
    const fromIdx = newGears.findIndex(g => g.id === dragId);
    const [moved] = newGears.splice(fromIdx, 1);
    moved.cat = targetCat;
    const toIdx = newGears.findIndex(g => g.id === targetId);
    const row = document.querySelector(`[data-gear-id="${targetId}"]`);
    const rect = row?.getBoundingClientRect();
    const before = rect ? e.clientY < rect.top + rect.height/2 : true;
    newGears.splice(before ? toIdx : toIdx+1, 0, moved);
    updateCurrentGears(newGears);
    if (oldCat !== targetCat) {
      const catLabels: Record<string,string> = {};
      categories.forEach(c => { catLabels[c.key] = c.label; });
      snack(gear.name + ' を ' + (catLabels[targetCat]||targetCat) + ' に移動しました');
    }
    gearDragId.current = null;
    gearDragOver.current = null;
  }

  function onGearDropOnCat(e: React.DragEvent, cat: string) {
    e.preventDefault();
    const dragId = gearDragId.current;
    if (!dragId) return;
    const gear = gears.find(g => g.id === dragId);
    if (!gear) return;
    const oldCat = gear.cat;
    const newGears = [...gears];
    const fromIdx = newGears.findIndex(g => g.id === dragId);
    const [moved] = newGears.splice(fromIdx, 1);
    moved.cat = cat;
    let lastInCat = -1;
    newGears.forEach((g, i) => { if (g.cat === cat) lastInCat = i; });
    newGears.splice(lastInCat+1, 0, moved);
    updateCurrentGears(newGears);
    if (oldCat !== cat) {
      const catLabels: Record<string,string> = {};
      categories.forEach(c => { catLabels[c.key] = c.label; });
      snack(gear.name + ' を ' + (catLabels[cat]||cat) + ' に移動しました');
    }
    gearDragId.current = null;
    gearDragOver.current = null;
  }

  // ── Category DnD ──
  const catDragKey = useRef<string|null>(null);
  const [catDragActive, setCatDragActive] = useState(false);
  const [catDropPreview, setCatDropPreview] = useState<{targetKey:string,before:boolean}|null>(null);
  const [colDropPreview, setColDropPreview] = useState<{col:0|1|2,group:'base'|'consumable'}|null>(null);

  function onCatDragStart(e: React.DragEvent, key: string) {
    catDragKey.current = key;
    e.dataTransfer.setData('text/plain', 'cat:' + key);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => setCatDragActive(true), 0);
  }

  function onCatDragEnd() {
    setCatDragActive(false);
    setCatDropPreview(null);
    setColDropPreview(null);
    catDragKey.current = null;
  }

  function onCatDragOverCat(e: React.DragEvent, targetKey: string) {
    if (!catDragKey.current || catDragKey.current === targetKey) return;
    e.preventDefault();
    const el = document.querySelector(`[data-cat="${targetKey}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height/2;
    setCatDropPreview({ targetKey, before });
    setColDropPreview(null);
  }

  function onCatDragOverCol(e: React.DragEvent, col: 0|1|2, group: 'base'|'consumable') {
    if (!catDragKey.current) return;
    e.preventDefault();
    setCatDropPreview(null);
    setColDropPreview({ col, group });
  }

  function onCatDrop(e: React.DragEvent, targetKey: string) {
    e.preventDefault();
    const dragging = catDragKey.current;
    if (!dragging || dragging === targetKey) return;
    const el = document.querySelector(`[data-cat="${targetKey}"]`);
    const rect = el?.getBoundingClientRect();
    const before = rect ? e.clientY < rect.top + rect.height/2 : true;
    const newCats = [...categories];
    const movedIdx = newCats.findIndex(c => c.key === dragging);
    const [moved] = newCats.splice(movedIdx, 1);
    // determine target's section group
    const targetCat = categories.find(c => c.key === targetKey);
    if (targetCat) moved.group = targetCat.group;
    // determine col from target's col
    const targetColEl = document.querySelector(`[data-cat="${targetKey}"]`)?.closest('[data-col-idx]') as HTMLElement|null;
    if (targetColEl?.dataset.colIdx !== undefined) moved.col = parseInt(targetColEl.dataset.colIdx) as 0|1|2;
    const toIdx = newCats.findIndex(c => c.key === targetKey);
    newCats.splice(before ? toIdx : toIdx+1, 0, moved);
    setCategories(newCats);
    saveCategories(newCats);
    setCatDropPreview(null);
    setColDropPreview(null);
    setCatDragActive(false);
    catDragKey.current = null;
  }

  function onCatDropOnCol(e: React.DragEvent, col: 0|1|2, group: 'base'|'consumable') {
    e.preventDefault();
    const dragging = catDragKey.current;
    if (!dragging) return;
    const newCats = [...categories];
    const movedIdx = newCats.findIndex(c => c.key === dragging);
    const [moved] = newCats.splice(movedIdx, 1);
    moved.group = group;
    moved.col = col;
    const isCons = group === 'consumable';
    let lastIdx = -1;
    newCats.forEach((c, i) => {
      const inSec = isCons ? c.group === 'consumable' : c.group !== 'consumable';
      if (inSec) lastIdx = i;
    });
    newCats.splice(lastIdx+1, 0, moved);
    setCategories(newCats);
    saveCategories(newCats);
    setCatDropPreview(null);
    setColDropPreview(null);
    setCatDragActive(false);
    catDragKey.current = null;
  }

  // ── List tab DnD ──
  const listDragId = useRef<number|null>(null);
  const listDragInitialOrder = useRef<number[]|null>(null);
  const listDragDidDrop = useRef(false);
  const [listDropLine, setListDropLine] = useState<{x:number,y:number}|null>(null);

  function onListTabDragStart(e: React.DragEvent, id: number) {
    listDragId.current = id;
    listDragDidDrop.current = false;
    listDragInitialOrder.current = lists.map(l => l.id);
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
    const emptyImg = document.createElement('img');
    emptyImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    try { e.dataTransfer.setDragImage(emptyImg, 0, 0); } catch {}
  }

  function onListTabDragOver(e: React.DragEvent, id: number) {
    e.preventDefault();
    if (listDragId.current == null) return;
    const wrap = (e.target as HTMLElement).closest('[data-list-tab-id]') as HTMLElement|null;
    if (!wrap) { setListDropLine(null); return; }
    const rect = wrap.getBoundingClientRect();
    const before = e.clientX < rect.left + rect.width/2;
    const x = before ? rect.left - 1 : rect.right + 1;
    const y = rect.top + rect.height/2;
    setListDropLine({ x, y });

    const dragId = listDragId.current;
    const fromIdx = lists.findIndex(l => l.id === dragId);
    const toIdx = lists.findIndex(l => l.id === id);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const insertIdx = before
      ? (fromIdx < toIdx ? toIdx-1 : toIdx)
      : (fromIdx < toIdx ? toIdx : toIdx+1);
    if (insertIdx === fromIdx) return;
    const newLists = [...lists];
    const [item] = newLists.splice(fromIdx, 1);
    newLists.splice(insertIdx, 0, item);
    setLists(newLists);
  }

  function onListTabDrop(e: React.DragEvent) {
    e.preventDefault();
    listDragDidDrop.current = true;
    setListDropLine(null);
    saveGearData(lists, currentListId);
  }

  function onListTabDragEnd() {
    if (!listDragDidDrop.current && listDragInitialOrder.current) {
      const order = listDragInitialOrder.current;
      setLists(prev => {
        const restored = [...prev].sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id));
        return restored;
      });
    }
    setListDropLine(null);
    listDragId.current = null;
    listDragInitialOrder.current = null;
  }

  // ── Render helpers ──
  const catLabels: Record<string,string> = {};
  categories.forEach(c => { catLabels[c.key] = c.label; });

  function getColGroupsForCats(cats: Category[]) {
    return ([0,1,2] as (0|1|2)[]).map(col => ({
      col,
      cats: cats.filter(c => (c.col??0) === col)
    }));
  }

  function renderCatGroup(cat: Category, items: Gear[]) {
    const catTotal = items.reduce((s,g) => s+g.weight, 0);
    const label = catLabels[cat.key] || cat.key;
    const isDraggingThis = catDragKey.current === cat.key;
    return (
      <div
        key={cat.key}
        className={`cat-group${isDraggingThis && catDragActive ? ' cat-group-dragging' : ''}`}
        id={`catg-${cat.key}`}
        data-cat={cat.key}
        onDragOver={e => onCatDragOverCat(e, cat.key)}
        onDrop={e => onCatDrop(e, cat.key)}
      >
        {catDropPreview?.targetKey === cat.key && catDropPreview.before && (
          <div className="cat-drop-preview">{label}</div>
        )}
        <div
          className="cat-group-header"
          draggable
          data-cat-drag={cat.key}
          onDragStart={e => onCatDragStart(e, cat.key)}
          onDragEnd={onCatDragEnd}
        >
          <span className="cat-drag-handle material-icons-round">drag_indicator</span>
          <span className="cat-name">{label}</span>
          <span className="cat-total">{catTotal}g</span>
          <button className="cat-add-btn" onClick={() => openNewGearDialog({cat: cat.key})}>
            <span className="material-icons-round">add</span>
          </button>
        </div>
        <div
          className="gear-list-wrap"
          onDragOver={e => { e.preventDefault(); }}
          onDrop={e => onGearDropOnCat(e, cat.key)}
        >
          {items.map((g, idx) => (
            <div
              key={g.id}
              className="gear-row"
              draggable
              data-gear-id={String(g.id)}
              style={{ animationDelay: `${idx*30}ms`, cursor: 'pointer' }}
              onClick={() => openDetail(g.id)}
              onDragStart={e => onGearDragStart(e, g.id)}
              onDragOver={e => onGearDragOver(e, g.id)}
              onDragEnd={onGearDragEnd}
              onDrop={e => onGearDropOnRow(e, g.id, cat.key)}
            >
              {g.image && (
                <img src={g.image} style={{width:'28px',height:'28px',borderRadius:'5px',objectFit:'cover',flexShrink:0,border:'1px solid var(--outline-v)'}}
                  onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
              )}
              <div className="gear-row-body">
                <div className="gear-row-name">{g.name}</div>
                {g.note && <div className="gear-row-note">{g.note}</div>}
              </div>
              <div className="gear-row-right">
                {g.weight ? <span className="weight-pill">{g.weight}g</span> : null}
              </div>
            </div>
          ))}
        </div>
        {catDropPreview?.targetKey === cat.key && !catDropPreview.before && (
          <div className="cat-drop-preview">{label}</div>
        )}
      </div>
    );
  }

  function renderSection(sectionGroup: 'base'|'consumable', cats: Category[]) {
    const catsWithCols = [...cats];
    assignDefaultColsMut(catsWithCols);
    const colGroups = getColGroupsForCats(catsWithCols);
    const bycat: Record<string, Gear[]> = {};
    gears.forEach(g => { if (!bycat[g.cat]) bycat[g.cat]=[]; bycat[g.cat].push(g); });

    return (
      <div className="section-gear-block" data-section-group={sectionGroup}>
        {sectionGroup === 'consumable' && (
          <div className="section-label" style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <span>Food / Water / Fuel</span>
            {weightLabel(cats.reduce((s,c) => s + (bycat[c.key]||[]).reduce((ss,g)=>ss+g.weight,0), 0))}
          </div>
        )}
        <div className="gear-columns">
          {colGroups.map(cg => {
            const isEmpty = cg.cats.length === 0 || cg.cats.every(c => !bycat[c.key]?.length && catDragKey.current !== c.key);
            return (
              <div
                key={cg.col}
                className={`gear-column${catDragActive && isEmpty ? ' col-empty-drop' : ''}`}
                data-col-idx={String(cg.col)}
                onDragOver={e => onCatDragOverCol(e, cg.col, sectionGroup)}
                onDrop={e => onCatDropOnCol(e, cg.col, sectionGroup)}
              >
                {colDropPreview?.col === cg.col && colDropPreview.group === sectionGroup && (
                  <div className="cat-drop-preview">{catLabels[catDragKey.current||'']||catDragKey.current}</div>
                )}
                {cg.cats.map(c => renderCatGroup(c, bycat[c.key]||[]))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Main render ──
  const baseCats = categories.filter(c => !isConsumable(c));
  const consumeCats = categories.filter(c => isConsumable(c));
  const baseTotal = gears.filter(g => !isConsumableKey(g.cat)).reduce((s,g)=>s+g.weight,0);
  const detailGear = gears.find(g => g.id === detailGearId);
  const checkedGears = gears.filter(g => checkedIds.has(g.id));
  const tripTotal = checkedGears.reduce((s,g)=>s+g.weight,0);

  if (lists.length === 0) return null;

  return (
    <div className="app-root">
      {/* TopBar */}
      <header className="top-bar">
        <span className="app-logo">ULoG</span>
        <div style={{display:'flex',alignItems:'center',gap:'4px'}}>
          <button className="icon-btn" onClick={() => { setShareOpen(true); generateShareCard(); }}>
            <span className="material-icons-round">ios_share</span>
          </button>
          <button className="icon-btn" onClick={() => setAccountOpen(true)}>
            {account.image
              ? <img src={account.image} style={{width:'28px',height:'28px',borderRadius:'50%',objectFit:'cover'}} />
              : <span className="material-icons-round">account_circle</span>
            }
          </button>
          <button className="icon-btn add-btn" onClick={() => openNewGearDialog({})}>
            <span className="material-icons-round">add</span>
          </button>
        </div>
      </header>

      {/* List Tabs */}
      <div className="list-tabs" id="listTabs">
        {lists.map(l => (
          <div
            key={l.id}
            className="list-tab-wrap"
            draggable
            data-list-tab-id={String(l.id)}
            onDragStart={e => onListTabDragStart(e, l.id)}
            onDragOver={e => onListTabDragOver(e, l.id)}
            onDrop={onListTabDrop}
            onDragEnd={onListTabDragEnd}
          >
            <button
              className={`list-tab${l.id === currentListId ? ' active' : ''}`}
              onClick={() => switchList(l.id)}
            >
              {l.name || <span className="list-tab-unnamed">Untitled</span>}
              {lists.length > 1 && (
                <span className="list-tab-del" onClick={e => { e.stopPropagation(); deleteList(l.id); }} title="削除">
                  <span className="material-icons-round">close</span>
                </span>
              )}
            </button>
          </div>
        ))}
        <div className="list-add-wrap">
          <button className="list-tab-add" onClick={() => { setAddListMode('new'); setNewListName(''); setCopyFromId(currentListId); setAddListOpen(true); }}>
            <span className="material-icons-round">add</span>
          </button>
        </div>
      </div>

      {/* Drop line for list tabs */}
      {listDropLine && (
        <div className="list-tab-drop-line visible" style={{ left: listDropLine.x, top: listDropLine.y }} />
      )}

      {/* Nav */}
      <nav className="bottom-nav">
        <button id="nav-home" className={`nav-btn${activeTab==='home'?' active':''}`} onClick={() => setActiveTab('home')}>
          <span className="material-icons-round">backpack</span>
          <span>Gear</span>
        </button>
        <button id="nav-trip" className={`nav-btn${activeTab==='trip'?' active':''}`} onClick={() => setActiveTab('trip')}>
          <span className="material-icons-round">checklist</span>
          <span>Trip</span>
        </button>
      </nav>

      {/* Home Panel */}
      <div id="panel-home" className={`panel${activeTab==='home'?' active':''}`}>
        {/* List title + info */}
        <div className="list-title-row" style={{marginTop:'12px',marginBottom:'4px'}}>
          <div
            ref={listTitleRef}
            id="listTitle"
            className="list-title"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={listTitlePlaceholder}
            onBlur={saveListTitle}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); listTitleRef.current?.blur(); } }}
          >
            {currentList?.name || ''}
          </div>
          <button className="icon-btn" onClick={() => setCatManagerOpen(true)}>
            <span className="material-icons-round">tune</span>
          </button>
        </div>

        <div id="listInfo">
          <div className="list-info-grid" style={{marginTop:'8px'}}>
            <div className="list-info-field list-info-wide list-info-plain">
              <input
                className="list-info-input"
                placeholder="例）2026/3/7・北岳3193m・春・快晴"
                defaultValue={currentList?.info?.comment || ''}
                key={currentListId}
                onInput={e => saveListInfo('comment', (e.target as HTMLInputElement).value)}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="stat-bar">
          <span className="stat-total">
            <span id="statKg">{(gears.reduce((s,g)=>s+g.weight,0)/1000).toFixed(2)}</span>
            <span className="stat-unit">kg</span>
          </span>
          <div id="statBreakdown" style={{display:'none'}}></div>
        </div>

        {/* Gear by category */}
        <div
          ref={gearContainerRef}
          id="gearByCat"
          className={catDragActive ? 'cat-dnd-active' : ''}
        >
          <div className="section-label" style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
            <span>Base Weight</span>
            {weightLabel(baseTotal)}
          </div>
          {renderSection('base', baseCats)}
          {renderSection('consumable', consumeCats)}
        </div>
      </div>

      {/* Trip Panel */}
      <div id="panel-trip" className={`panel${activeTab==='trip'?' active':''}`}>
        <div className="trip-header">
          <div>
            <div className="trip-total-kg">
              <span id="tripTotalG">{tripTotal}</span>g
            </div>
          </div>
          <button className="btn-text" onClick={clearChecks}>すべてリセット</button>
        </div>
        <div className="bd-row" id="breakdown">
          {checkedGears.length === 0
            ? <div style={{color:'var(--on-surface-v)',fontSize:'13px'}}>まだ選択されていません</div>
            : Object.entries(
                checkedGears.reduce((acc,g) => { acc[g.cat]=(acc[g.cat]||0)+g.weight; return acc; }, {} as Record<string,number>)
              ).map(([cat,w]) => (
                <div key={cat} className="bd-chip">
                  {catLabels[cat]||cat} <span className="bd-wt">{w}g</span>
                </div>
              ))
          }
        </div>
        <div id="tripList">
          {gears.length === 0
            ? <div className="empty-state"><span className="material-icons-round">hiking</span><p>ギアが登録されていません</p></div>
            : Object.entries(
                gears.reduce((acc,g) => { if(!acc[g.cat]) acc[g.cat]=[]; acc[g.cat].push(g); return acc; }, {} as Record<string,Gear[]>)
              ).map(([cat,items]) => (
                <div key={cat} className="check-card">
                  <div className="check-cat-hdr">{catLabels[cat]||cat}</div>
                  {items.map(g => (
                    <div key={g.id} className={`check-row${checkedIds.has(g.id)?' checked':''}`} onClick={() => toggleCheck(g.id)}>
                      <div className="checkbox"><span className="material-icons-round">check</span></div>
                      <div className="check-name">{g.name}</div>
                      <div className="check-wt">{g.weight ? g.weight+'g' : '—'}</div>
                    </div>
                  ))}
                </div>
              ))
          }
        </div>
      </div>

      {/* Edit/Add Dialog */}
      {editOpen && (
        <div className="scrim open" id="editScrim" onClick={e => { if ((e.target as HTMLElement).id==='editScrim') closeEdit(); }}>
          <div className="dialog">
            <div className="dialog-title">{editMode==='add' ? 'ギアを追加' : 'ギアを編集'}</div>
            {editMode === 'add' && (
              <div className="tf" style={{marginBottom:'12px'}}>
                <label>URLから自動入力</label>
                <input
                  type="url"
                  value={editUrl}
                  onChange={e => setEditUrl(e.target.value)}
                  onPaste={e => {
                    setTimeout(() => {
                      const val = (e.target as HTMLInputElement).value;
                      if (/^https?:\/\//i.test(val.trim())) fetchGearUrl(val.trim());
                    }, 0);
                  }}
                  placeholder="https://..."
                />
                {editUrlStatus && <span style={{fontSize:'12px',color:'var(--primary)',marginTop:'4px'}}>{editUrlStatus}</span>}
              </div>
            )}
            <div className="tf">
              <label>ギア名</label>
              <input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="ギア名を入力" />
            </div>
            <div className="cat-chips-label">カテゴリ</div>
            <div className="cat-chips" id="catChips">
              {categories.map(c => (
                <button
                  key={c.key}
                  type="button"
                  className={`cat-chip${editCat===c.key?' active':''}`}
                  onClick={() => setEditCat(c.key)}
                >{c.label}</button>
              ))}
            </div>
            <div className="tf">
              <label>重量 (g)</label>
              <input type="number" value={editWeight} onChange={e => setEditWeight(e.target.value)} placeholder="0" />
            </div>
            <div className="tf">
              <label>メモ</label>
              <input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="メモを入力" />
            </div>
            <div className="dialog-actions">
              {editMode === 'edit' && (
                <button className="btn-text danger" onClick={() => { deleteGear(editGearId); setEditOpen(false); }}>削除</button>
              )}
              <button className="btn-text" onClick={closeEdit}>
                {editMode === 'add' ? 'キャンセル' : '完了'}
              </button>
              {editMode === 'add' && (
                <button className="btn-filled" onClick={confirmAddGear}>追加</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {detailOpen && detailGear && (
        <div className="scrim open" id="detailScrim" onClick={e => { if ((e.target as HTMLElement).id==='detailScrim') setDetailOpen(false); }}>
          <div className="detail-sheet">
            <div id="detailImgWrap" onClick={() => detailImgInputRef.current?.click()}>
              {detailGear.image
                ? <div className="detail-img-thumb">
                    <img src={detailGear.image} onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                    <div className="detail-img-edit-overlay"><span className="material-icons-round">photo_camera</span></div>
                  </div>
                : <div className="detail-img-placeholder">
                    <span className="material-icons-round">add_photo_alternate</span>
                    <span>画像を追加</span>
                  </div>
              }
            </div>
            <input ref={detailImgInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={onDetailImageChange} />
            <div id="detailCat" className="detail-cat">{catLabels[detailGear.cat]||detailGear.cat||''}</div>
            <div id="detailName" className="detail-name">{detailGear.name}</div>
            <div id="detailMeta" className="detail-meta">{detailGear.weight ? detailGear.weight+'g' : ''}</div>
            {detailGear.note && <div id="detailNote" className="detail-note">{detailGear.note}</div>}
            <div className="detail-actions">
              <button className="btn-text danger" onClick={() => { setDetailOpen(false); deleteGear(detailGear.id); }}>削除</button>
              <button className="btn-text" onClick={() => { setDetailOpen(false); openEditDialog(detailGear.id); }}>編集</button>
            </div>
          </div>
        </div>
      )}

      {/* Category Manager */}
      {catManagerOpen && (
        <div className="scrim open" id="catManagerScrim" onClick={e => { if ((e.target as HTMLElement).id==='catManagerScrim') setCatManagerOpen(false); }}>
          <div className="dialog">
            <div className="dialog-title">カテゴリ管理</div>
            <div id="catManagerList">
              {categories.map(c => (
                <div key={c.key} className="cat-mgr-row">
                  <input
                    className="cat-mgr-input"
                    defaultValue={c.label}
                    onBlur={e => renameCat(c.key, e.target.value)}
                    onKeyDown={e => { if (e.key==='Enter') (e.target as HTMLInputElement).blur(); }}
                  />
                  <div className="cat-mgr-groups">
                    <button
                      className={`cat-mgr-grp${c.group==='base'||!c.group?' active':''}`}
                      onClick={() => setCatGroup(c.key, 'base')}
                      title="ベースウェイト"
                    >Base</button>
                    <button
                      className={`cat-mgr-grp${c.group==='consumable'?' active':''}`}
                      onClick={() => setCatGroup(c.key, 'consumable')}
                      title="消耗品"
                    >消耗品</button>
                  </div>
                  {c.key !== 'Other' && (
                    <button className="cat-mgr-del" onClick={() => deleteCat(c.key)}>
                      <span className="material-icons-round">close</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div className="cat-add-row">
              <input
                className="cat-new-input"
                value={catNewInput}
                onChange={e => setCatNewInput(e.target.value)}
                placeholder="新しいカテゴリ名"
                onKeyDown={e => { if (e.key==='Enter') { addNewCategory(catNewInput); setCatNewInput(''); } }}
              />
              <button className="btn-filled" onClick={() => { addNewCategory(catNewInput); setCatNewInput(''); }}>追加</button>
            </div>
            <div className="dialog-actions">
              <button className="btn-text" onClick={() => setCatManagerOpen(false)}>完了</button>
            </div>
          </div>
        </div>
      )}

      {/* Add List Modal */}
      {addListOpen && (
        <div className="scrim open" id="addListScrim" onClick={e => { if ((e.target as HTMLElement).id==='addListScrim') setAddListOpen(false); }}>
          <div className="dialog">
            <div className="dialog-title">シートを追加</div>
            <div className="mode-btns">
              <button id="modeNewBtn" className={`mode-btn${addListMode==='new'?' active':''}`} onClick={() => setAddListMode('new')}>新規作成</button>
              <button id="modeCopyBtn" className={`mode-btn${addListMode==='copy'?' active':''}`} onClick={() => setAddListMode('copy')}>コピー</button>
            </div>
            {addListMode === 'new' && (
              <div id="addListNewSection">
                <div className="tf">
                  <label>シート名</label>
                  <input
                    type="text"
                    value={newListName}
                    onChange={e => setNewListName(e.target.value)}
                    placeholder="シート名を入力"
                    autoFocus
                    onKeyDown={e => { if (e.key==='Enter' && newListName.trim()) { addList(newListName.trim()); setAddListOpen(false); } }}
                  />
                </div>
              </div>
            )}
            {addListMode === 'copy' && (
              <div id="addListCopySection">
                <div id="addListCopyOptions">
                  {lists.map(l => (
                    <label key={l.id} className={`copy-option${copyFromId===l.id?' checked':''}`}>
                      <input
                        type="radio"
                        name="copyFrom"
                        value={String(l.id)}
                        checked={copyFromId===l.id}
                        onChange={() => setCopyFromId(l.id)}
                      />
                      <span>{l.name || 'Untitled'}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="dialog-actions">
              <button className="btn-text" onClick={() => setAddListOpen(false)}>キャンセル</button>
              <button className="btn-filled" onClick={() => {
                if (addListMode === 'copy') {
                  duplicateList(copyFromId);
                } else {
                  if (newListName.trim()) addList(newListName.trim());
                }
                setAddListOpen(false);
              }}>追加</button>
            </div>
          </div>
        </div>
      )}

      {/* Account Panel */}
      {accountOpen && (
        <div className="scrim open" id="accountScrim" onClick={e => { if ((e.target as HTMLElement).id==='accountScrim') { saveAccountData(); setAccountOpen(false); } }}>
          <div className="account-panel open" id="accountPanel">
            <div className="account-avatar" onClick={() => accountImgInputRef.current?.click()}>
              {accImage
                ? <img id="accountAvatarImg" src={accImage} style={{width:'64px',height:'64px',borderRadius:'50%',objectFit:'cover'}} />
                : <span id="accountAvatarIcon" className="material-icons-round" style={{fontSize:'64px'}}>account_circle</span>
              }
            </div>
            <input ref={accountImgInputRef} type="file" accept="image/*" style={{display:'none'}} onChange={onAccountImageChange} />
            <div className="tf">
              <label>名前</label>
              <input type="text" id="accName" value={accName} onChange={e => setAccName(e.target.value)} placeholder="名前を入力" />
            </div>
            <div className="tf">
              <label>ハンドル</label>
              <input type="text" id="accHandle" value={accHandle} onChange={e => setAccHandle(e.target.value)} placeholder="@handle" />
            </div>
            <div className="tf">
              <label>自己紹介</label>
              <input type="text" id="accBio" value={accBio} onChange={e => setAccBio(e.target.value)} placeholder="自己紹介を入力" />
            </div>
            <div className="dialog-actions">
              <button className="btn-filled" onClick={() => { saveAccountData(); setAccountOpen(false); }}>保存</button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareOpen && (
        <div className="scrim open" id="shareScrim" onClick={e => { if ((e.target as HTMLElement).id==='shareScrim') setShareOpen(false); }}>
          <div className="dialog share-dialog">
            <div className="dialog-title">シェア</div>
            <canvas ref={canvasRef} id="shareCanvas" style={{width:'100%',borderRadius:'12px',display:'block'}} />
            <div className="dialog-actions" style={{marginTop:'16px'}}>
              <button className="btn-text" onClick={() => setShareOpen(false)}>閉じる</button>
              <button className="btn-filled" onClick={shareCard}>
                <span className="material-icons-round" style={{fontSize:'16px',marginRight:'4px'}}>ios_share</span>
                シェア
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snackbar */}
      <div id="snackbar" className={`snackbar${snackVisible?' show':''}`}>{snackMsg}</div>
    </div>
  );
}
