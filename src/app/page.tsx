'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

function useCountUp(target: number, duration = 400) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  const run = useCallback((t: number) => {
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 4);
      setValue(t * ease);
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }, [duration]);
  useEffect(() => {
    cancelAnimationFrame(raf.current);
    run(target);
    return () => cancelAnimationFrame(raf.current);
  }, [target, run]);
  return value;
}

function AnimatedKg({ value, className }: { value: number; className?: string }) {
  const animated = useCountUp(value);
  return <span className={className}>{(animated / 1000).toFixed(2)}</span>;
}
import type { Gear, GearList, Category, Account } from '@/types';
import { loadGearData, saveGearData, loadCategories, saveCategories, loadAccount, saveAccount } from '@/lib/storage';
import { fetchFromUrl, guessCategory } from '@/lib/urlFetch';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  Plus, X, Share2, User2, SlidersHorizontal, GripVertical,
  ClipboardCheck, Check, Mountain, Camera, ImagePlus,
  Copy, Link2, Package, Loader2,
} from 'lucide-react';

const ACTIVITY_SUGGESTIONS = ['TrailRun','Hiking','Alpine','BackPacking','Camping','Trekking','ULHike'];
function randSuggestion() { return ACTIVITY_SUGGESTIONS[Math.floor(Math.random() * ACTIVITY_SUGGESTIONS.length)]; }


export default function HomePage() {
  const [lists, setLists] = useState<GearList[]>([]);
  const [currentListId, setCurrentListId] = useState<number>(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [account, setAccount] = useState<Account>({});
  const [activeTab, setActiveTab] = useState<'home'|'trip'>('home');
  const [checkedIds, setCheckedIds] = useState<Set<number>>(new Set());
  const [snackMsg, setSnackMsg] = useState('');
  const [snackVisible, setSnackVisible] = useState(false);

  // Preload gear DB on mount
  useEffect(() => { loadGearDb(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // URL search in header
  const [headerUrl, setHeaderUrl] = useState('');
  const [headerUrlLoading, setHeaderUrlLoading] = useState(false);
  const [headerSuggestOpen, setHeaderSuggestOpen] = useState(false);

  // Dialogs
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

  // Gear DB
  type DbProduct = { id: string; title: string; handle: string; url: string; shop: string; type: string; brand: string; price: number; weight: number; image: string };
  const [gearDbOpen, setGearDbOpen] = useState(false);
  const [gearDbProducts, setGearDbProducts] = useState<DbProduct[]>([]);
  const [gearDbLoading, setGearDbLoading] = useState(false);
  const [gearDbSearch, setGearDbSearch] = useState('');
  async function loadGearDb() {
    if (gearDbProducts.length > 0) return;
    setGearDbLoading(true);
    try {
      const res = await fetch('/moonlight-gear.json');
      const data = await res.json();
      setGearDbProducts(data.products || []);
    } catch { /* ignore */ } finally {
      setGearDbLoading(false);
    }
  }

  function addFromDb(product: DbProduct) {
    const cat = guessCategory(product.title + ' ' + product.type);
    addGear({ name: product.title, cat, weight: product.weight || 0, image: product.image || undefined });
    setGearDbOpen(false);
  }

  const [memoText, setMemoText] = useState('');
  const [, setListTitlePlaceholder] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const listTitleRef = useRef<HTMLDivElement>(null);
  const gearContainerRef = useRef<HTMLDivElement>(null);
  const memoRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const detailImgInputRef = useRef<HTMLInputElement>(null);
  const accountImgInputRef = useRef<HTMLInputElement>(null);
  const headerUrlRef = useRef<HTMLInputElement>(null);

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
    setMemoText(cl?.info?.comment || '');
  }, []);

  const currentList = lists.find(l => l.id === currentListId) || lists[0];
  const gears: Gear[] = currentList?.gears || [];

  function isConsumable(cat: Category | undefined) { return cat?.group === 'consumable'; }
  function isConsumableKey(key: string) { return isConsumable(categories.find(c => c.key === key)); }

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

  function snack(msg: string) {
    setSnackMsg(msg); setSnackVisible(true);
    setTimeout(() => setSnackVisible(false), 2800);
  }

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

  function addGear(gear: Omit<Gear,'id'>) {
    const newGear: Gear = { id: Date.now(), ...gear };
    updateCurrentGears([...gears, newGear]);
    snack('✓ ' + gear.name + ' を登録しました');
  }

  function deleteGear(id: number) {
    const g = gears.find(x => x.id === id);
    setCheckedIds(prev => { const s = new Set(prev); s.delete(id); return s; });
    updateCurrentGears(gears.filter(x => x.id !== id));
    if (g) snack(g.name + ' を削除しました');
  }

  function editGearFn(id: number, patch: Partial<Gear>) {
    updateCurrentGears(gears.map(g => g.id === id ? {...g, ...patch} : g));
  }

  function switchList(id: number) {
    setCurrentListId(id);
    const nl = lists.find(l => l.id === id);
    setCheckedIds(new Set(nl?.checkedIds || []));
    setListTitlePlaceholder(randSuggestion());
    setMemoText(nl?.info?.comment || '');
    saveGearData(lists, id);
  }

  function addList(name: string) {
    const id = Date.now();
    const newLists = [...lists, { id, name, gears: [], checkedIds: [] }];
    saveLists(newLists, id);
    setCheckedIds(new Set());
    setListTitlePlaceholder(randSuggestion());
    setMemoText('');
    snack('シートを追加しました');
  }

  function duplicateList(srcId: number) {
    const src = lists.find(l => l.id === srcId);
    if (!src) return;
    const newId = Date.now();
    const newGears = src.gears.map(g => ({...g, id: Date.now() + Math.random()}));
    saveLists([...lists, { id: newId, name: src.name + ' のコピー', gears: newGears, checkedIds: [] }], newId);
    setCheckedIds(new Set());
    setMemoText('');
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
      setMemoText(newLists[0]?.info?.comment || '');
    }
  }

  function saveListTitle() {
    if (!listTitleRef.current) return;
    const name = listTitleRef.current.textContent?.trim() || '';
    setIsEditingTitle(false);
    setLists(prev => {
      const next = prev.map(l => l.id === currentListId ? {...l, name} : l);
      saveGearData(next, currentListId);
      return next;
    });
  }

  function saveListInfo(key: string, value: string) {
    setLists(prev => {
      const next = prev.map(l => l.id !== currentListId ? l : {...l, info: {...(l.info||{}), [key]: value}});
      saveGearData(next, currentListId);
      return next;
    });
  }


  function renameCat(key: string, newLabel: string) {
    newLabel = newLabel.trim();
    if (!newLabel) return;
    const cat = categories.find(c => c.key === key);
    if (!cat || cat.label === newLabel) return;
    const newCats = categories.map(c => c.key === key ? {...c, label: newLabel} : c);
    setCategories(newCats); saveCategories(newCats);
  }

  function setCatGroup(key: string, group: 'base'|'consumable') {
    const newCats = categories.map(c => c.key === key ? {...c, group} : c);
    setCategories(newCats); saveCategories(newCats);
  }

  function addNewCategory(label: string) {
    if (!label) return;
    const key = 'cat_' + Date.now();
    const newCats = [...categories, { key, label, group: 'base' as const }];
    setCategories(newCats); saveCategories(newCats);
    snack(label + ' を追加しました');
  }

  function deleteCat(key: string) {
    const label = categories.find(c => c.key === key)?.label || key;
    const newCats = categories.filter(c => c.key !== key);
    const fallback = newCats[0]?.key || '';
    const newLists = lists.map(l => ({...l, gears: l.gears.map(g => g.cat === key ? {...g, cat: fallback} : g)}));
    setCategories(newCats); saveCategories(newCats);
    setLists(newLists); saveGearData(newLists, currentListId);
    snack(label + ' を削除しました' + (fallback ? `（ギアは ${newCats[0].label} に移動）` : ''));
  }

  function openNewGearDialog(prefill: Partial<Gear & {cat:string}> = {}) {
    setEditMode('add'); setEditGearId(-1);
    setEditName(prefill.name||''); setEditCat(prefill.cat||'');
    setEditWeight(prefill.weight ? String(prefill.weight) : '');
    setEditNote(prefill.note||''); setEditUrl(''); setEditUrlStatus('');
    setPendingImage(prefill.image||''); setEditOpen(true);
  }


  function closeEdit() {
    if (editMode === 'edit' && editGearId !== -1 && editName.trim()) {
      editGearFn(editGearId, { name: editName.trim(), cat: editCat, weight: parseInt(editWeight)||0, note: editNote.trim() });
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

  async function handleHeaderUrl(url: string) {
    if (!/^https?:\/\//i.test(url.trim())) return;
    setHeaderUrlLoading(true);
    try {
      const gear = await fetchFromUrl(url.trim());
      openNewGearDialog({ name: gear.name, cat: gear.cat, weight: gear.weight, image: gear.image });
    } catch {
      snack('URLの取得に失敗しました');
    } finally {
      setHeaderUrlLoading(false);
      setHeaderUrl('');
    }
  }

  function openDetail(id: number) { setDetailGearId(id); setDetailOpen(true); }

  function onDetailImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || detailGearId === -1) return;
    const reader = new FileReader();
    reader.onload = ev => editGearFn(detailGearId, { image: ev.target?.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  }

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

  function saveAccountData() {
    const acc: Account = { name: accName.trim(), handle: accHandle.trim(), bio: accBio.trim(), image: accImage||undefined };
    saveAccount(acc); setAccount(acc);
  }

  function onAccountImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataUrl = ev.target?.result as string;
      setAccImage(dataUrl);
      const acc: Account = { name: accName.trim(), handle: accHandle.trim(), bio: accBio.trim(), image: dataUrl };
      saveAccount(acc); setAccount(acc);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  function _roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r);
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r);
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
  }

  async function generateShareCard() {
    await document.fonts.ready;
    const canvas = canvasRef.current; if (!canvas) return;
    const W=600,H=400; canvas.width=W; canvas.height=H;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const total = gears.reduce((s,g)=>s+g.weight,0);
    const kg = (total/1000).toFixed(2); const px = 52;
    ctx.fillStyle='hsl(225,28%,92%)'; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#ffffff'; _roundRect(ctx,24,24,W-48,H-48,22); ctx.fill();
    ctx.textBaseline='top'; ctx.fillStyle='#9a9dac';
    ctx.font='500 12px system-ui,sans-serif'; ctx.fillText('ULoG',px,46);
    ctx.fillStyle='#1a1a1a'; ctx.font='500 18px system-ui,sans-serif';
    ctx.fillText(currentList?.name||'Gear List',px,72);
    ctx.textBaseline='alphabetic';
    ctx.fillStyle='#000'; ctx.font='600 58px system-ui,sans-serif'; ctx.fillText(kg,px,172);
    const kgNumW=ctx.measureText(kg).width;
    ctx.fillStyle='#9a9dac'; ctx.font='300 20px system-ui,sans-serif'; ctx.fillText(' kg',px+kgNumW,172);
    ctx.textBaseline='top'; ctx.fillStyle='#6b6f80';
    ctx.font='400 13px system-ui,sans-serif'; ctx.fillText(gears.length+' items',px,184);
    const bycat: Record<string,number>={};
    gears.forEach(g=>{if(!bycat[g.cat])bycat[g.cat]=0;bycat[g.cat]+=g.weight;});
    const catEntries=Object.entries(bycat).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const chipH=24,chipR=6,chipPadX=10,chipGapX=8,chipGapY=8;
    let cx=px,cy=220;
    ctx.font='500 11px system-ui,sans-serif';
    const catLbls: Record<string,string>={};
    categories.forEach(c=>{catLbls[c.key]=c.label;});
    for(const[cat,w]of catEntries){
      const lbl=(catLbls[cat]||cat)+'  '+(w>=1000?(w/1000).toFixed(1)+'kg':w+'g');
      const tw=ctx.measureText(lbl).width,chipW=tw+chipPadX*2;
      if(cx+chipW>W-px){cx=px;cy+=chipH+chipGapY;}
      ctx.fillStyle='hsl(225,28%,93%)'; _roundRect(ctx,cx,cy,chipW,chipH,chipR); ctx.fill();
      ctx.fillStyle='#3a3d50'; ctx.textBaseline='middle'; ctx.fillText(lbl,cx+chipPadX,cy+chipH/2);
      ctx.textBaseline='top'; cx+=chipW+chipGapX;
    }
    const divY=cy+chipH+20;
    ctx.strokeStyle='hsl(225,28%,90%)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(px,divY); ctx.lineTo(W-px,divY); ctx.stroke();
    const avR=18,avCx=px+avR,avCy=divY+14+avR;
    if(account.image){
      const img=new Image();
      await new Promise(res=>{img.onload=res;img.onerror=res;img.src=account.image!;});
      ctx.save(); ctx.beginPath(); ctx.arc(avCx,avCy,avR,0,Math.PI*2); ctx.clip();
      ctx.drawImage(img,avCx-avR,avCy-avR,avR*2,avR*2); ctx.restore();
    } else {
      ctx.fillStyle='hsl(225,28%,88%)'; ctx.beginPath(); ctx.arc(avCx,avCy,avR,0,Math.PI*2); ctx.fill();
    }
    const textX=avCx+avR+12,nameStr=account.name||'',handleStr=account.handle||'';
    const lineGap=4,nameSize=14,handleSize=12;
    const totalTextH=(nameStr?nameSize:0)+(nameStr&&handleStr?lineGap:0)+(handleStr?handleSize:0);
    let textY=avCy-totalTextH/2;
    ctx.textBaseline='top';
    if(nameStr){ctx.fillStyle='#1a1a1a';ctx.font=`500 ${nameSize}px system-ui,sans-serif`;ctx.fillText(nameStr,textX,textY);textY+=nameSize+lineGap;}
    if(handleStr){ctx.fillStyle='#9a9dac';ctx.font=`400 ${handleSize}px system-ui,sans-serif`;ctx.fillText(handleStr,textX,textY);}
  }

  async function downloadShareCard() {
    await generateShareCard();
    const canvas=canvasRef.current; if(!canvas) return;
    const a=document.createElement('a'); a.download='mygear.png'; a.href=canvas.toDataURL('image/png'); a.click();
  }

  async function shareCard() {
    await generateShareCard();
    const canvas=canvasRef.current; if(!canvas) return;
    canvas.toBlob(async blob=>{
      if(!blob) return;
      const file=new File([blob],'mygear.png',{type:'image/png'});
      const nav=navigator as Navigator & {canShare?:(d:ShareData)=>boolean};
      if(nav.share&&nav.canShare?.({files:[file]})){try{await nav.share({files:[file],title:'ULoG'});return;}catch{}}
      downloadShareCard();
    },'image/png');
  }

  // ── Gear DnD ──
  const gearDragId = useRef<number|null>(null);
  const gearDragOver = useRef<{id:number,before:boolean}|null>(null);

  function onGearDragStart(e: React.DragEvent, id: number) {
    gearDragId.current = id;
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => { document.querySelector(`[data-gear-id="${id}"]`)?.classList.add('gear-row-dragging'); }, 0);
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
    gearDragId.current = null; gearDragOver.current = null;
  }

  function onGearDropOnRow(e: React.DragEvent, targetId: number, targetCat: string) {
    e.preventDefault();
    const dragId = gearDragId.current; if (!dragId) return;
    document.querySelectorAll('.gear-row-drop-before,.gear-row-drop-after,.gear-row-dragging').forEach(el => {
      el.classList.remove('gear-row-drop-before','gear-row-drop-after','gear-row-dragging');
    });
    if (dragId === targetId) return;
    const gear = gears.find(g => g.id === dragId); if (!gear) return;
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
      const catLbls: Record<string,string>={};
      categories.forEach(c=>{catLbls[c.key]=c.label;});
      snack(gear.name + ' を ' + (catLbls[targetCat]||targetCat) + ' に移動しました');
    }
    gearDragId.current = null; gearDragOver.current = null;
  }

  function onGearDropOnCat(e: React.DragEvent, cat: string) {
    e.preventDefault();
    const dragId = gearDragId.current; if (!dragId) return;
    const gear = gears.find(g => g.id === dragId); if (!gear) return;
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
      const catLbls: Record<string,string>={};
      categories.forEach(c=>{catLbls[c.key]=c.label;});
      snack(gear.name + ' を ' + (catLbls[cat]||cat) + ' に移動しました');
    }
    gearDragId.current = null; gearDragOver.current = null;
  }

  // ── Category DnD ──
  const catDragKey = useRef<string|null>(null);
  const [catDragActive, setCatDragActive] = useState(false);
  const [catDropPreview, setCatDropPreview] = useState<{targetKey:string,before:boolean}|null>(null);
  const [colDropPreview, setColDropPreview] = useState<{col:0|1|2|3,group:'base'|'consumable'}|null>(null);

  function onCatDragStart(e: React.DragEvent, key: string) {
    catDragKey.current = key;
    e.dataTransfer.setData('text/plain', 'cat:' + key);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => setCatDragActive(true), 0);
  }

  function onCatDragEnd() {
    setCatDragActive(false); setCatDropPreview(null); setColDropPreview(null); catDragKey.current = null;
  }

  function onCatDragOverCat(e: React.DragEvent, targetKey: string) {
    if (!catDragKey.current || catDragKey.current === targetKey) return;
    e.preventDefault();
    const el = document.querySelector(`[data-cat="${targetKey}"]`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCatDropPreview({ targetKey, before: e.clientY < rect.top + rect.height/2 });
    setColDropPreview(null);
  }

  function onCatDragOverCol(e: React.DragEvent, col: 0|1|2|3, group: 'base'|'consumable') {
    if (!catDragKey.current) return;
    e.preventDefault();
    setCatDropPreview(null); setColDropPreview({ col, group });
  }

  function onCatDrop(e: React.DragEvent, targetKey: string) {
    e.preventDefault();
    const dragging = catDragKey.current; if (!dragging || dragging === targetKey) return;
    const before = catDropPreview?.targetKey === targetKey ? catDropPreview.before : true;
    const newCats = [...categories];
    const movedIdx = newCats.findIndex(c => c.key === dragging);
    const [moved] = newCats.splice(movedIdx, 1);
    const targetCat = categories.find(c => c.key === targetKey);
    if (targetCat) moved.group = targetCat.group;
    const targetColEl = document.querySelector(`[data-cat="${targetKey}"]`)?.closest('[data-col-idx]') as HTMLElement|null;
    if (targetColEl?.dataset.colIdx !== undefined) moved.col = parseInt(targetColEl.dataset.colIdx) as 0|1|2|3;
    const toIdx = newCats.findIndex(c => c.key === targetKey);
    newCats.splice(before ? toIdx : toIdx+1, 0, moved);
    setCategories(newCats); saveCategories(newCats);
    setCatDropPreview(null); setColDropPreview(null); setCatDragActive(false); catDragKey.current = null;
  }

  function onCatDropOnCol(e: React.DragEvent, col: 0|1|2, group: 'base'|'consumable') {
    e.preventDefault();
    const dragging = catDragKey.current; if (!dragging) return;
    const newCats = [...categories];
    const movedIdx = newCats.findIndex(c => c.key === dragging);
    const [moved] = newCats.splice(movedIdx, 1);
    moved.group = group; moved.col = col;
    const isCons = group === 'consumable';
    let lastIdx = -1;
    newCats.forEach((c, i) => { const inSec = isCons ? c.group==='consumable' : c.group!=='consumable'; if (inSec) lastIdx=i; });
    newCats.splice(lastIdx+1, 0, moved);
    setCategories(newCats); saveCategories(newCats);
    setCatDropPreview(null); setColDropPreview(null); setCatDragActive(false); catDragKey.current = null;
  }

  // ── List tab DnD ──
  const listDragId = useRef<number|null>(null);
  const listDragInitialOrder = useRef<number[]|null>(null);
  const listDragDidDrop = useRef(false);
  const [listDropLine, setListDropLine] = useState<{x:number,y:number}|null>(null);

  function onListTabDragStart(e: React.DragEvent, id: number) {
    listDragId.current = id; listDragDidDrop.current = false;
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
    setListDropLine({ x: before ? rect.left - 1 : rect.right + 1, y: rect.top + rect.height/2 });
    const dragId = listDragId.current;
    const fromIdx = lists.findIndex(l => l.id === dragId);
    const toIdx = lists.findIndex(l => l.id === id);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;
    const insertIdx = before ? (fromIdx<toIdx?toIdx-1:toIdx) : (fromIdx<toIdx?toIdx:toIdx+1);
    if (insertIdx === fromIdx) return;
    const newLists = [...lists]; const [item] = newLists.splice(fromIdx,1); newLists.splice(insertIdx,0,item); setLists(newLists);
  }

  function onListTabDrop(e: React.DragEvent) {
    e.preventDefault(); listDragDidDrop.current = true; setListDropLine(null); saveGearData(lists, currentListId);
  }

  function onListTabDragEnd() {
    if (!listDragDidDrop.current && listDragInitialOrder.current) {
      const order = listDragInitialOrder.current;
      setLists(prev => [...prev].sort((a,b) => order.indexOf(a.id) - order.indexOf(b.id)));
    }
    setListDropLine(null); listDragId.current = null; listDragInitialOrder.current = null;
  }

  // ── Render helpers ──
  const catLabels: Record<string,string> = {};
  categories.forEach(c => { catLabels[c.key] = c.label; });

  function getColGroupsForCats(cats: Category[]) {
    return ([0,1,2,3] as (0|1|2|3)[]).map(col => ({ col, cats: cats.filter(c => (c.col??0) === col) }));
  }

  function renderCatGroup(cat: Category, items: Gear[], idx = 0) {
    const catTotal = items.reduce((s,g)=>s+g.weight,0);
    const label = catLabels[cat.key] || cat.key;
    const isDraggingThis = catDragKey.current === cat.key;

    return (
      <div
        key={cat.key}
        style={{ animationDelay: `${idx * 120}ms` }}
        className={cn(
          'bg-white/50 backdrop-blur-md rounded-3xl overflow-hidden animate-fade-up',
          isDraggingThis && catDragActive && 'opacity-60 outline outline-2 outline-black outline-offset-2'
        )}
        data-cat={cat.key}
        onDrop={e => onCatDrop(e, cat.key)}
      >
        {/* Card header */}
        <div
          className="flex items-center justify-between px-5 py-3 cursor-grab select-none"
          draggable
          onDragStart={e => onCatDragStart(e, cat.key)}
          onDragEnd={onCatDragEnd}
          onDragOver={e => { e.preventDefault(); }}
          onDrop={e => onGearDropOnCat(e, cat.key)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
            <span className="font-light text-[17px] uppercase tracking-wide text-gray-900">{label}</span>
            <span className="text-sm text-gray-400 font-light ml-1">
              {(catTotal/1000).toFixed(2)} kg
            </span>
          </div>
          <button
            className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            onClick={e => { e.stopPropagation(); openNewGearDialog({cat: cat.key}); }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Items */}
        {items.length > 0 && (
          <div className="border-t border-gray-100">
            {items.map((g, idx) => (
              <div
                key={g.id}
                className="flex items-center gap-3 px-5 py-2 cursor-pointer hover:bg-white/30 transition-colors animate-slide-in"
                draggable
                data-gear-id={String(g.id)}
                style={{ animationDelay: `${idx*20}ms` }}
                onClick={() => openDetail(g.id)}
                onDragStart={e => onGearDragStart(e, g.id)}
                onDragOver={e => onGearDragOver(e, g.id)}
                onDragEnd={onGearDragEnd}
                onDrop={e => onGearDropOnRow(e, g.id, cat.key)}
              >
                {g.image
                  ? <img src={g.image} className="w-8 h-8 rounded-xl object-cover shrink-0 border border-gray-100" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                  : <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gray-50">
                      <Package className="w-4 h-4 text-gray-300" />
                    </div>
                }
                <span className="flex-1 text-sm text-gray-800 truncate">{g.name}</span>
                {g.note && <span className="text-xs text-gray-400 truncate shrink min-w-0 hidden sm:block">{g.note}</span>}
                <span className="text-sm font-light text-gray-500 shrink-0">{g.weight}g</span>
              </div>
            ))}
          </div>
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
      <div>
        {sectionGroup === 'consumable' && (
          <div className="flex justify-between items-center mb-3 mt-6">
            <span className="text-base font-light uppercase tracking-widest text-gray-600">Food / Water / Fuel</span>
            <span className="text-3xl font-light text-gray-900">
              <AnimatedKg value={cats.reduce((s,c)=>s+(bycat[c.key]||[]).reduce((ss,g)=>ss+g.weight,0),0)} />
              <span className="text-base font-light text-gray-500 ml-1">kg</span>
            </span>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-start">
          {colGroups.map(cg => {
            const isEmpty = cg.cats.length === 0 || cg.cats.every(c => !bycat[c.key]?.length && catDragKey.current !== c.key);
            return (
              <div
                key={cg.col}
                className={cn('min-w-0 w-full min-h-[40px] flex flex-col gap-3', catDragActive && isEmpty && 'border-2 border-dashed border-gray-200 rounded-3xl min-h-[80px]')}
                data-col-idx={String(cg.col)}
                onDragOver={e => onCatDragOverCol(e, cg.col, sectionGroup)}
                onDrop={e => onCatDropOnCol(e, cg.col, sectionGroup)}
              >
                {colDropPreview?.col === cg.col && colDropPreview.group === sectionGroup && (
                  <div className="h-0.5 bg-black/20 rounded-full" />
                )}
                {cg.cats.flatMap((c, i) => {
                  const items = [];
                  if (catDropPreview?.targetKey === c.key && catDropPreview.before)
                    items.push(<div key={`ind-before-${c.key}`} className="mx-3 my-1 h-0.5 bg-black/40 rounded-full" />);
                  items.push(<div key={c.key} onDragOver={e => onCatDragOverCat(e, c.key)}>{renderCatGroup(c, bycat[c.key]||[], i)}</div>);
                  if (catDropPreview?.targetKey === c.key && !catDropPreview.before)
                    items.push(<div key={`ind-after-${c.key}`} className="mx-3 my-1 h-0.5 bg-black/40 rounded-full" />);
                  return items;
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const baseCats = categories.filter(c => !isConsumable(c));
  const consumeCats = categories.filter(c => isConsumable(c));
  const baseTotal = gears.filter(g => !isConsumableKey(g.cat)).reduce((s,g)=>s+g.weight,0);
  const detailGear = gears.find(g => g.id === detailGearId);
  const checkedGears = gears.filter(g => checkedIds.has(g.id));
  const tripTotal = checkedGears.reduce((s,g)=>s+g.weight,0);

  if (lists.length === 0) return null;

  return (
    <div className="min-h-screen">
      {/* ── TopBar ── */}
      <header className="px-5 lg:px-8 h-20 flex items-center gap-4 pt-5">
        <span className="text-2xl font-light tracking-tight shrink-0" style={{ fontFamily: 'var(--font-numeric), system-ui, sans-serif' }}>ULog</span>

        {/* URL search */}
        <div className="flex-1 min-w-0">
          <div className="relative">
            <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 z-10" />
            {headerUrlLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 spin-icon z-10" />}
            <input
              ref={headerUrlRef}
              type="text"
              value={headerUrl}
              onChange={e => {
                const val = e.target.value;
                setHeaderUrl(val);
                if (val.trim() && !/^https?:\/\//i.test(val.trim())) {
                  loadGearDb();
                  setHeaderSuggestOpen(true);
                } else {
                  setHeaderSuggestOpen(false);
                }
              }}
              onPaste={e => {
                setTimeout(() => {
                  const val = (e.target as HTMLInputElement).value;
                  if (/^https?:\/\//i.test(val.trim())) { setHeaderSuggestOpen(false); handleHeaderUrl(val.trim()); }
                }, 0);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') { setHeaderSuggestOpen(false); handleHeaderUrl(headerUrl); }
                if (e.key === 'Escape') { setHeaderSuggestOpen(false); setHeaderUrl(''); }
              }}
              onFocus={() => { if (headerUrl.trim() && !/^https?:\/\//i.test(headerUrl)) setHeaderSuggestOpen(true); }}
              onBlur={() => setTimeout(() => setHeaderSuggestOpen(false), 150)}
              placeholder="ギア名 or 商品URLでギアを追加"
              className="w-full bg-white/70 backdrop-blur-sm rounded-2xl pl-9 pr-9 py-2.5 text-sm placeholder:text-gray-500 outline-none transition-colors"
            />
            {/* Suggestions dropdown */}
            {headerSuggestOpen && headerUrl.trim() && (() => {
              const q = headerUrl.trim().toLowerCase();
              const hits = gearDbProducts.filter(p => p.title.toLowerCase().includes(q) || p.type.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q)).slice(0, 7);
              if (hits.length === 0 && !gearDbLoading) return null;
              return (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white/95 backdrop-blur-md rounded-2xl shadow-lg overflow-hidden z-50 border border-gray-100">
                  {gearDbLoading && hits.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-400"><Loader2 className="w-3.5 h-3.5 animate-spin" />読み込み中...</div>
                  ) : hits.map(p => (
                    <button
                      key={p.id}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-left"
                      onMouseDown={() => { setHeaderSuggestOpen(false); setHeaderUrl(''); addFromDb(p); }}
                    >
                      {p.image
                        ? <img src={p.image} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        : <div className="w-8 h-8 rounded-lg bg-gray-100 shrink-0" />
                      }
                      {p.weight > 0 && <span className="text-xs text-gray-500 shrink-0 w-10 text-right">{p.weight}g</span>}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-light truncate">{p.title}</div>
                        {p.type && <div className="text-xs text-gray-400">{p.type}</div>}
                      </div>
                    </button>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center bg-black text-white hover:bg-black/85 transition-colors"
            onClick={() => openNewGearDialog({})}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center bg-white/40 backdrop-blur-sm hover:bg-white/60 transition-colors"
            onClick={() => setAccountOpen(true)}
          >
            {account.image
              ? <img src={account.image} className="w-7 h-7 rounded-full object-cover" />
              : <User2 className="w-4 h-4 text-gray-500" />
            }
          </button>
        </div>
      </header>

      {/* ── List Tabs ── */}
      <div className="px-5 lg:px-8 flex items-end gap-1 overflow-x-auto scrollbar-none">
        {lists.map(l => (
          <div
            key={l.id}
            className="relative shrink-0"
            draggable
            data-list-tab-id={String(l.id)}
            onDragStart={e => onListTabDragStart(e, l.id)}
            onDragOver={e => onListTabDragOver(e, l.id)}
            onDrop={onListTabDrop}
            onDragEnd={onListTabDragEnd}
          >
            <button
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-base transition-all cursor-pointer border-b-2 -mb-px',
                l.id === currentListId
                  ? 'font-light text-gray-900 border-gray-900'
                  : 'font-light text-gray-400 border-transparent hover:text-gray-600'
              )}
              onClick={() => switchList(l.id)}
            >
              {l.name || <span className="italic opacity-60">Untitled</span>}
              <span
                className="flex items-center justify-center w-4 h-4 opacity-60 hover:opacity-100 transition-opacity"
                onClick={e => { e.stopPropagation(); duplicateList(l.id); }}
              >
                <Copy className="w-3.5 h-3.5" />
              </span>
              {lists.length > 1 && (
                <span
                  className="flex items-center justify-center w-3.5 h-3.5 -mr-1 rounded-full hover:bg-gray-200"
                  onClick={e => { e.stopPropagation(); deleteList(l.id); }}
                >
                  <X className="w-2.5 h-2.5" />
                </span>
              )}
            </button>
          </div>
        ))}
        <button
          className="mb-1.5 ml-2 w-6 h-6 rounded-full flex items-center justify-center text-gray-900 border border-dashed border-gray-400 hover:border-gray-600 transition-colors shrink-0"
          onClick={() => { setAddListMode('new'); setNewListName(''); setCopyFromId(currentListId); setAddListOpen(true); }}
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>

      {/* Drop line for list tabs */}
      {listDropLine && (
        <div className="fixed w-1 h-8 bg-black rounded-sm z-[9999] pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow-[0_0_0_1px_white]"
          style={{ left: listDropLine.x, top: listDropLine.y }} />
      )}

      {/* ── Main Content ── */}
      <div className="max-w-[1600px] mx-auto px-5 lg:px-8 pb-16 mt-5">

        {/* Title area */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div
                ref={listTitleRef}
                className={cn(
                  'text-[28px] font-light text-gray-900 outline-none leading-tight cursor-text',
                  isEditingTitle && 'border-b-2 border-black'
                )}
                contentEditable={isEditingTitle}
                suppressContentEditableWarning
                onBlur={() => { setIsEditingTitle(false); saveListTitle(); }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); listTitleRef.current?.blur(); } }}
                onClick={() => {
                  if (!isEditingTitle) {
                    setIsEditingTitle(true);
                    setTimeout(() => {
                      listTitleRef.current?.focus();
                      const range = document.createRange();
                      const sel = window.getSelection();
                      if (listTitleRef.current) { range.selectNodeContents(listTitleRef.current); range.collapse(false); sel?.removeAllRanges(); sel?.addRange(range); }
                    }, 0);
                  }
                }}
              >
                {currentList?.name || ''}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
            <button
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm transition-colors',
                activeTab === 'trip'
                  ? 'bg-black text-white'
                  : 'bg-white/50 backdrop-blur-sm text-gray-600 hover:bg-white/70'
              )}
              onClick={() => setActiveTab(activeTab === 'trip' ? 'home' : 'trip')}
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">パッキングチェック</span>
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/50 backdrop-blur-sm text-sm text-gray-600 hover:bg-white/70 transition-colors"
              onClick={() => setCatManagerOpen(true)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-light">カテゴリ</span>
            </button>
            <button
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-white/50 backdrop-blur-sm text-sm text-gray-600 hover:bg-white/70 transition-colors"
              onClick={() => { setShareOpen(true); generateShareCard(); }}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">シェア</span>
            </button>
          </div>
        </div>

        {/* Memo area */}
        <textarea
          ref={memoRef}
          className="block w-full mb-5 text-sm text-gray-600 placeholder:text-gray-300 outline-none bg-transparent resize-none leading-relaxed transition-all overflow-hidden"
          placeholder="山行メモを追加..."
          value={memoText}
          rows={1}
          onChange={e => { setMemoText(e.target.value); if (memoRef.current) { memoRef.current.style.height = 'auto'; memoRef.current.style.height = memoRef.current.scrollHeight + 'px'; } }}
          onFocus={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
          onBlur={e => { saveListInfo('comment', memoText); e.currentTarget.style.height = ''; }}
        />

        {/* ── Gear tab ── */}
        {activeTab === 'home' && (
          <div ref={gearContainerRef}>
            {/* Base weight header */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-base font-light uppercase tracking-widest text-gray-600">Base Weight</span>
              <span className="text-3xl font-light text-gray-900">
                <AnimatedKg value={baseTotal} />
                <span className="text-base font-light text-gray-500 ml-1">kg</span>
              </span>
            </div>

            {renderSection('base', baseCats)}
            {renderSection('consumable', consumeCats)}
          </div>
        )}

        {/* ── Trip tab ── */}
        {activeTab === 'trip' && (
          <div className="animate-fade-up">
            <button
              className="flex items-center gap-1.5 mb-5 px-4 py-2 rounded-2xl bg-white/50 backdrop-blur-sm text-sm text-gray-700 hover:bg-white/70 transition-colors"
              onClick={() => setActiveTab('home')}
            >
              <X className="w-3.5 h-3.5" />
              パッキングチェックを閉じる
            </button>
            <div className="flex items-center justify-between mb-4">
              <span className="text-3xl font-light">{tripTotal}g</span>
              <Button variant="ghost" size="sm" className="text-gray-500" onClick={clearChecks}>すべてリセット</Button>
            </div>

            <div className="flex flex-wrap gap-2 mb-5">
              {checkedGears.length === 0
                ? <span className="text-sm text-gray-400">まだ選択されていません</span>
                : Object.entries(
                    checkedGears.reduce((acc,g) => { acc[g.cat]=(acc[g.cat]||0)+g.weight; return acc; }, {} as Record<string,number>)
                  ).map(([cat,w]) => (
                    <div key={cat} className="bg-white/50 backdrop-blur-sm rounded-xl px-3 py-1.5 text-xs flex items-center gap-1.5">
                      {catLabels[cat]||cat} <span className="font-light">{w}g</span>
                    </div>
                  ))
              }
            </div>

            {gears.length === 0
              ? <div className="text-center py-10 text-gray-400">
                  <Mountain className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm">ギアが登録されていません</p>
                </div>
              : Object.entries(
                  gears.reduce((acc,g) => { if(!acc[g.cat]) acc[g.cat]=[]; acc[g.cat].push(g); return acc; }, {} as Record<string,Gear[]>)
                ).map(([cat,items]) => (
                  <div key={cat} className="bg-white/50 backdrop-blur-md rounded-3xl overflow-hidden mb-3">
                    <div className="px-5 py-3 text-xs font-bold uppercase tracking-widest text-black bg-white/30">
                      {catLabels[cat]||cat}
                    </div>
                    {items.map(g => (
                      <div
                        key={g.id}
                        className={cn('flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors', checkedIds.has(g.id) ? 'bg-white/30' : 'hover:bg-white/30')}
                        onClick={() => toggleCheck(g.id)}
                      >
                        <div className={cn('w-[18px] h-[18px] rounded-sm border-2 flex items-center justify-center shrink-0 transition-all', checkedIds.has(g.id) ? 'bg-black border-black' : 'border-gray-300')}>
                          {checkedIds.has(g.id) && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <div className={cn('flex-1 text-sm transition-colors', checkedIds.has(g.id) && 'line-through text-gray-400')}>{g.name}</div>
                        <div className="text-sm text-gray-400">{g.weight ? g.weight+'g' : '—'}</div>
                      </div>
                    ))}
                  </div>
                ))
            }
          </div>
        )}
      </div>

      {/* ── Add/Edit Gear Dialog ── */}
      <Dialog open={editOpen} onOpenChange={open => { if (!open) closeEdit(); }}>
        <DialogContent className="max-w-[420px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-light">{editMode==='add' ? 'ギアを追加' : 'ギアを編集'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-1">
            {editMode === 'add' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">URLから自動入力</label>
                <Input type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)}
                  onPaste={e => { setTimeout(() => { const val = (e.target as HTMLInputElement).value; if (/^https?:\/\//i.test(val.trim())) fetchGearUrl(val.trim()); }, 0); }}
                  placeholder="https://..." />
                {editUrlStatus && <p className="text-xs text-black mt-1">{editUrlStatus}</p>}
              </div>
            )}
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">ギア名</label>
              <Input type="text" value={editName} onChange={e => setEditName(e.target.value)} placeholder="ギア名を入力" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">カテゴリ</label>
              <div className="flex flex-wrap gap-2">
                {categories.map(c => (
                  <button key={c.key} type="button"
                    className={cn('px-3 py-1.5 rounded-full border text-sm font-medium transition-all', editCat===c.key ? 'bg-black text-white border-black' : 'bg-transparent text-gray-500 border-gray-200 hover:border-gray-300')}
                    onClick={() => setEditCat(c.key)}
                  >{c.label}</button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">重量 (g)</label>
              <Input type="number" value={editWeight} onChange={e => setEditWeight(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">メモ</label>
              <Input type="text" value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="メモを入力" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            {editMode === 'edit' && <Button variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => { deleteGear(editGearId); setEditOpen(false); }}>削除</Button>}
            <Button variant="ghost" onClick={closeEdit}>{editMode === 'add' ? 'キャンセル' : '完了'}</Button>
            {editMode === 'add' && <Button onClick={confirmAddGear}>追加</Button>}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-[420px] rounded-3xl text-center">
          {detailGear && (
            <>
              <div className="cursor-pointer mb-4 mt-6" onClick={() => detailImgInputRef.current?.click()}>
                {detailGear.image
                  ? <div className="relative inline-block rounded-2xl overflow-hidden">
                      <img src={detailGear.image} className="max-h-[180px] max-w-full object-contain rounded-2xl block" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 hover:opacity-100 transition-opacity rounded-2xl"><Camera className="w-7 h-7 text-white" /></div>
                    </div>
                  : <div className="flex flex-col items-center justify-center gap-1.5 w-full h-[90px] rounded-2xl border-[1.5px] border-dashed border-gray-200 text-gray-400 text-xs hover:bg-gray-50 transition-colors">
                      <ImagePlus className="w-7 h-7" /><span>画像を追加</span>
                    </div>
                }
              </div>
              <input ref={detailImgInputRef} type="file" accept="image/*" className="hidden" onChange={onDetailImageChange} />
              <div className="flex flex-wrap justify-center gap-1.5 mb-3">
                {categories.map(c => (
                  <button
                    key={c.key}
                    className={cn('px-3 py-1 rounded-full text-xs transition-all', detailGear.cat === c.key ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                    onClick={() => editGearFn(detailGear.id, { cat: c.key })}
                  >{c.label}</button>
                ))}
              </div>
              <input
                className="text-xl font-medium mb-2 text-center w-full bg-transparent outline-none rounded-xl px-2 py-1 hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                defaultValue={detailGear.name}
                onBlur={e => { if (e.target.value.trim()) editGearFn(detailGear.id, { name: e.target.value.trim() }); }}
              />
              <div className="flex items-center justify-center gap-1 mb-1">
                <input
                  className="text-[15px] font-light text-center w-24 bg-transparent outline-none rounded-xl px-2 py-1 hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                  defaultValue={detailGear.weight || ''}
                  placeholder="0"
                  type="number"
                  onBlur={e => editGearFn(detailGear.id, { weight: parseInt(e.target.value) || 0 })}
                />
                <span className="text-[15px] font-light text-gray-400">g</span>
              </div>
              <input
                className="text-sm text-gray-400 text-center w-full bg-transparent outline-none rounded-xl px-2 py-1 hover:bg-gray-50 focus:bg-gray-50 transition-colors"
                defaultValue={detailGear.note || ''}
                placeholder="メモを追加..."
                onBlur={e => editGearFn(detailGear.id, { note: e.target.value.trim() })}
              />
              <div className="flex justify-center gap-2 mt-4">
                <Button variant="ghost" className="text-red-500 hover:text-red-600" onClick={() => { setDetailOpen(false); deleteGear(detailGear.id); }}>削除</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Category Manager ── */}
      <Dialog open={catManagerOpen} onOpenChange={setCatManagerOpen}>
        <DialogContent className="max-w-[420px] rounded-3xl">
          <DialogHeader><DialogTitle className="text-2xl font-light">カテゴリ管理</DialogTitle></DialogHeader>
          <div className="-mt-2">
            {categories.map(c => (
              <div key={c.key} className="flex items-center py-1.5 border-b border-gray-100 last:border-0">
                <input className="flex-1 text-[15px] font-light bg-transparent outline-none px-1 py-0.5 rounded border border-transparent focus:border-gray-300 focus:bg-gray-50 transition-colors"
                  defaultValue={c.label}
                  onBlur={e => renameCat(c.key, e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') (e.target as HTMLInputElement).blur(); }} />
                <div className="flex gap-1 shrink-0 ml-8">
                  <button className={cn('px-2 py-1 rounded-md text-[10px] font-bold border transition-all', c.group==='base' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-transparent border-gray-200 text-gray-400')} onClick={() => setCatGroup(c.key, 'base')}>Base</button>
                  <button className={cn('px-2 py-1 rounded-md text-[10px] font-bold border transition-all', c.group==='consumable' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-transparent border-gray-200 text-gray-400')} onClick={() => setCatGroup(c.key, 'consumable')}>消耗品</button>
                </div>
                <button className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors ml-1" onClick={() => deleteCat(c.key)}>
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-1">
            <Input value={catNewInput} onChange={e => setCatNewInput(e.target.value)} placeholder="新しいカテゴリ名"
              onKeyDown={e => { if (e.key==='Enter') { addNewCategory(catNewInput); setCatNewInput(''); } }} />
            <Button size="lg" onClick={() => { addNewCategory(catNewInput); setCatNewInput(''); }}>追加</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add List Modal ── */}
      <Dialog open={addListOpen} onOpenChange={setAddListOpen}>
        <DialogContent className="max-w-[420px] rounded-3xl">
          <DialogHeader><DialogTitle className="text-2xl font-light">シートを追加</DialogTitle></DialogHeader>
          <div className="flex border-b border-gray-200 mb-5">
            <button className={cn('flex-1 pb-2.5 text-sm transition-all border-b-2 -mb-px', addListMode==='new' ? 'font-medium text-gray-900 border-gray-900' : 'font-light text-gray-400 border-transparent hover:text-gray-600')} onClick={() => setAddListMode('new')}>新規作成</button>
            <button className={cn('flex-1 pb-2.5 text-sm transition-all border-b-2 -mb-px', addListMode==='copy' ? 'font-medium text-gray-900 border-gray-900' : 'font-light text-gray-400 border-transparent hover:text-gray-600')} onClick={() => setAddListMode('copy')}>コピー</button>
          </div>
          {addListMode === 'new' && (
            <Input type="text" value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="シート名を入力" autoFocus
              onKeyDown={e => { if (e.key==='Enter' && newListName.trim()) { addList(newListName.trim()); setAddListOpen(false); } }} />
          )}
          {addListMode === 'copy' && (
            <div className="space-y-1">
              {lists.map(l => (
                <label key={l.id} className={cn('flex items-center gap-2.5 px-3 py-2.5 rounded-2xl cursor-pointer transition-colors', copyFromId===l.id ? 'bg-gray-100' : 'hover:bg-gray-50')}>
                  <input type="radio" name="copyFrom" value={String(l.id)} checked={copyFromId===l.id} onChange={() => setCopyFromId(l.id)} className="accent-black" />
                  <span className="text-sm">{l.name || 'Untitled'}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setAddListOpen(false)}>キャンセル</Button>
            <Button onClick={() => { if (addListMode==='copy') duplicateList(copyFromId); else if (newListName.trim()) addList(newListName.trim()); setAddListOpen(false); }}>追加</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Account Sheet ── */}
      <Sheet open={accountOpen} onOpenChange={open => { if (!open) { saveAccountData(); setAccountOpen(false); } }}>
        <SheetContent side="right" className="w-84 p-0 flex flex-col">
          <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-4 border-b border-gray-100">
            <div className="relative w-24 h-24 cursor-pointer rounded-full" onClick={() => accountImgInputRef.current?.click()}>
              {accImage
                ? <img src={accImage} className="w-24 h-24 rounded-full object-cover" />
                : <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center"><User2 className="w-10 h-10 text-gray-300" /></div>
              }
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity"><Camera className="w-5 h-5 text-white" /></div>
            </div>
            <input ref={accountImgInputRef} type="file" accept="image/*" className="hidden" onChange={onAccountImageChange} />
            <div className="text-center">
              <p className="text-sm font-light text-gray-400">プロフィール画像をタップして変更</p>
            </div>
          </div>
          <div className="px-6 py-6 space-y-5 flex-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">名前</label>
              <Input type="text" value={accName} onChange={e => setAccName(e.target.value)} placeholder="名前を入力" className="rounded-2xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">ハンドル</label>
              <Input type="text" value={accHandle} onChange={e => setAccHandle(e.target.value)} placeholder="@handle" className="rounded-2xl" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-400">自己紹介</label>
              <Input type="text" value={accBio} onChange={e => setAccBio(e.target.value)} placeholder="自己紹介を入力" className="rounded-2xl" />
            </div>
          </div>
          <div className="px-6 pb-8">
            <Button className="w-full rounded-2xl" onClick={() => { saveAccountData(); setAccountOpen(false); }}>保存</Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* ── Gear DB Dialog ── */}
      <Dialog open={gearDbOpen} onOpenChange={setGearDbOpen}>
        <DialogContent className="max-w-[600px] rounded-3xl max-h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle className="text-2xl font-light">ギアDB <span className="text-sm text-gray-400 font-light ml-2">Moonlight Gear</span></DialogTitle></DialogHeader>
          <Input
            className="mt-2 shrink-0"
            placeholder="商品名・ブランドで検索..."
            value={gearDbSearch}
            onChange={e => setGearDbSearch(e.target.value)}
          />
          <div className="overflow-y-auto flex-1 mt-3 -mx-2 px-2">
            {gearDbLoading ? (
              <div className="flex items-center justify-center py-16 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin mr-2" />読み込み中...
              </div>
            ) : (
              gearDbProducts
                .filter(p => !gearDbSearch || p.title.toLowerCase().includes(gearDbSearch.toLowerCase()) || p.brand.toLowerCase().includes(gearDbSearch.toLowerCase()) || p.type.includes(gearDbSearch))
                .map(p => (
                  <div key={p.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0">
                    {p.image ? (
                      <img src={p.image} className="w-10 h-10 rounded-xl object-cover shrink-0 bg-gray-100" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gray-100 shrink-0 flex items-center justify-center">
                        <Package className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-light leading-snug truncate">{p.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {p.type}{p.weight > 0 ? ` · ${p.weight}g` : ''} · ¥{p.price.toLocaleString()}
                      </div>
                    </div>
                    <button
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl bg-black text-white text-xs hover:bg-gray-800 transition-colors"
                      onClick={() => addFromDb(p)}
                    >
                      <Plus className="w-3 h-3" />
                      追加
                    </button>
                  </div>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Share Dialog ── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-[520px] rounded-3xl">
          <DialogHeader><DialogTitle className="text-2xl font-light">シェア</DialogTitle></DialogHeader>
          <canvas ref={canvasRef} className="w-full rounded-2xl block" />
          <div className="flex justify-end gap-2 mt-2">
            <Button variant="ghost" onClick={() => setShareOpen(false)}>閉じる</Button>
            <Button onClick={shareCard}><Share2 className="w-4 h-4 mr-1.5" />シェア</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Snackbar */}
      <div className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-3 rounded-xl text-sm font-medium shadow-lg z-[100] transition-all pointer-events-none whitespace-nowrap',
        snackVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}>
        {snackMsg}
      </div>
    </div>
  );
}
