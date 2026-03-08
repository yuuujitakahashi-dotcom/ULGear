// ── Persistence ──
const STORAGE_KEY = 'ulgear_data';

function saveData() {
  const cl = lists.find(l => l.id === currentListId);
  if (cl) { cl.gears = gears; cl.checkedIds = [...checkedIds]; }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ lists, currentListId }));
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    if (saved.lists && saved.lists.length > 0) {
      lists = saved.lists;
      currentListId = saved.currentListId || lists[0].id;
    } else {
      // migrate old single-list data
      lists = [{ id: Date.now(), name: 'ALL My Gear', gears: saved.gears || [], checkedIds: saved.checkedIds || [] }];
      currentListId = lists[0].id;
    }
    const cl = lists.find(l => l.id === currentListId) || lists[0];
    currentListId = cl.id;
    gears = cl.gears || [];
    checkedIds = new Set(cl.checkedIds || []);
  } catch(e) {
    lists = [{ id: Date.now(), name: 'ALL My Gear', gears: [], checkedIds: [] }];
    currentListId = lists[0].id;
    gears = [];
    checkedIds = new Set();
  }
}

// ── State ──
let lists = [];
let currentListId = null;
let gears = [];
let checkedIds = new Set();
let collapsedCats = new Set();

// ── Text field helpers ──
function tfInput(el) {
  el.closest('.tf').classList.toggle('hv', el.value !== '');
}
document.querySelectorAll('.tf input,.tf select').forEach(el => {
  el.addEventListener('focus', () => el.closest('.tf').classList.add('focused'));
  el.addEventListener('blur',  () => el.closest('.tf').classList.remove('focused'));
});

// ── Tab switch ──
function switchTab(tab) {
  ['home','trip'].forEach(t => {
    document.getElementById('panel-'+t).classList.toggle('active', t===tab);
    document.getElementById('nav-'+t).classList.toggle('active', t===tab);
  });
  if (tab==='trip') renderTrip();
}

// ── Stats ──
function updateStats() {
  const total = gears.reduce((s,g)=>s+g.weight, 0);
  document.getElementById('statKg').textContent = (total / 1000).toFixed(2);
}

// ── Categories ──
const CAT_STORAGE_KEY = 'ulgear_cats';
const DEFAULT_CATEGORIES = [
  { key:'Sleep',    label:'Sleep' },
  { key:'Cook',     label:'Cook' },
  { key:'Backpack', label:'Backpack' },
  { key:'Clothing', label:'Wear' },
  { key:'Safety',   label:'Safety' },
  { key:'Food',     label:'Food' },
  { key:'Light',    label:'Light' },
  { key:'Other',    label:'Other' },
];
let categories = [];

function loadCategories() {
  try {
    const saved = JSON.parse(localStorage.getItem(CAT_STORAGE_KEY));
    categories = Array.isArray(saved) && saved.length ? saved : DEFAULT_CATEGORIES.map(c => ({...c}));
  } catch { categories = DEFAULT_CATEGORIES.map(c => ({...c})); }
  syncCatLabels();
}

function saveCategories() {
  localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(categories));
  syncCatLabels();
}

function syncCatLabels() {
  Object.keys(CAT_LABELS).forEach(k => delete CAT_LABELS[k]);
  categories.forEach(c => CAT_LABELS[c.key] = c.label);
}

function assignDefaultCols() {
  const nonBp = categories.filter(c => c.key !== 'Backpack');
  const unassigned = nonBp.filter(c => c.col === undefined);
  if (unassigned.length === 0) return;
  if (unassigned.length === nonBp.length) {
    const t = Math.ceil(nonBp.length / 3);
    nonBp.forEach((c, i) => { c.col = i < t ? 0 : i < t * 2 ? 1 : 2; });
  } else {
    unassigned.forEach(c => { c.col = 0; });
  }
}

function getColGroups() {
  assignDefaultCols();
  const nonBp = categories.filter(c => c.key !== 'Backpack');
  return [0, 1, 2].map(col => ({
    cats: nonBp.filter(c => c.col === col).map(c => c.key)
  }));
}

function getAllGroupedCats() {
  return [...categories.map(c => c.key)];
}

function renderCatGroup(cat, items) {
  const catTotal = items.reduce((s,g)=>s+g.weight, 0);
  const label = CAT_LABELS[cat] || cat;
  return `
  <div class="cat-group" id="catg-${cat}" data-cat="${cat}">
    <div class="cat-group-header" draggable="true" data-cat-drag="${cat}">
      <span class="cat-drag-handle material-icons-round">drag_indicator</span>
      <span class="cat-name">${label}</span>
      <span class="cat-total">${catTotal}g</span>
      <button class="cat-add-btn" onclick="openNewGearDialog({cat:'${cat}'})"><span class="material-icons-round">add</span></button>
    </div>
    <div class="gear-list-wrap">
      ${items.map((g,idx) => `
        <div class="gear-row" draggable="true" data-gear-id="${g.id}" style="animation-delay:${idx*30}ms;cursor:pointer" onclick="openDetail(${g.id})">
          ${g.image ? `<img src="${g.image}" style="width:28px;height:28px;border-radius:5px;object-fit:cover;flex-shrink:0;border:1px solid var(--outline-v)" onerror="this.style.display='none'">` : ''}
          <div class="gear-row-body">
            <div class="gear-row-name">${g.name}</div>
            ${g.note ? `<div class="gear-row-note">${g.note}</div>` : ''}
          </div>
          <div class="gear-row-right">
            ${g.weight ? `<span class="weight-pill">${g.weight}g</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ── Render gear list by category ──
function renderHome() {
  const container = document.getElementById('gearByCat');

  const bycat = {};
  gears.forEach(g => {
    if (!bycat[g.cat]) bycat[g.cat] = [];
    bycat[g.cat].push(g);
  });

  const bpItems = bycat['Backpack'] || [];
  const bpTotal = bpItems.reduce((s,g)=>s+g.weight,0);
  const backpackHtml = `
    <div class="cat-group backpack-section" id="catg-Backpack" data-cat="Backpack">
      <div class="cat-group-header" draggable="false">
        <span class="cat-name">${CAT_LABELS['Backpack'] || 'Backpack'}</span>
        <span class="cat-total">${bpTotal ? bpTotal+'g' : ''}</span>
        <button class="cat-add-btn" onclick="openNewGearDialog({cat:'Backpack'})"><span class="material-icons-round">add</span></button>
      </div>
      <div class="gear-list-wrap">
        ${bpItems.map((g,idx) => `
          <div class="gear-row" draggable="true" data-gear-id="${g.id}" style="animation-delay:${idx*30}ms;cursor:pointer" onclick="openDetail(${g.id})">
            ${g.image ? `<img src="${g.image}" style="width:28px;height:28px;border-radius:5px;object-fit:cover;flex-shrink:0;border:1px solid var(--outline-v)" onerror="this.style.display='none'">` : ''}
            <div class="gear-row-body">
              <div class="gear-row-name">${g.name}</div>
              ${g.note ? `<div class="gear-row-note">${g.note}</div>` : ''}
            </div>
            <div class="gear-row-right">
              ${g.weight ? `<span class="weight-pill">${g.weight}g</span>` : ''}
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;

  const colGroups = getColGroups();
  const allGroupedCats = getAllGroupedCats();
  const columnsHtml = `<div class="gear-columns">
    ${colGroups.map(group => {
      const html = group.cats
        .map(c => renderCatGroup(c, bycat[c] || []))
        .join('');
      return `<div class="gear-column">${html}</div>`;
    }).join('')}
  </div>`;

  const extras = Object.keys(bycat)
    .filter(c => !allGroupedCats.includes(c))
    .map(c => renderCatGroup(c, bycat[c]))
    .join('');

  container.innerHTML = backpackHtml + columnsHtml + extras;
  const sk = document.getElementById('skeleton');
  if (sk) { sk.remove(); container.style.display = ''; }
}

function clearGearDropIndicators() {
  document.querySelectorAll('.gear-row-drop-before, .gear-row-drop-after, .gear-row-dragging').forEach(el => {
    el.classList.remove('gear-row-drop-before', 'gear-row-drop-after', 'gear-row-dragging');
  });
}

function setupGearDnD() {
  const container = document.getElementById('gearByCat');
  if (!container) return;
  let _dragging = false;
  container.addEventListener('dragstart', e => {
    const row = e.target.closest('.gear-row, .backpack-item');
    if (!row || !row.dataset.gearId) return;
    _dragging = true;
    e.dataTransfer.setData('text/plain', row.dataset.gearId);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => row.classList.add('gear-row-dragging'), 0);
  });
  container.addEventListener('click', e => {
    if (_dragging) { _dragging = false; e.stopImmediatePropagation(); }
  }, true);
  container.addEventListener('dragend', () => clearGearDropIndicators());
  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    clearGearDropIndicators();
    const row = e.target.closest('.gear-row, .backpack-item');
    if (!row || !row.dataset.gearId) return;
    const rect = row.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;
    row.classList.add(before ? 'gear-row-drop-before' : 'gear-row-drop-after');
  });
  container.addEventListener('drop', e => {
    e.preventDefault();
    const gearId = Number(e.dataTransfer.getData('text/plain'));
    const targetRow = e.target.closest('.gear-row, .backpack-item');
    const dropZone = e.target.closest('.cat-group, .backpack-section');
    clearGearDropIndicators();
    if (!gearId) return;

    const gear = gears.find(g => g.id === gearId);
    if (!gear) return;
    const fromIndex = gears.findIndex(g => g.id === gearId);
    const [moved] = gears.splice(fromIndex, 1);

    if (targetRow && targetRow.dataset.gearId) {
      const targetId = Number(targetRow.dataset.gearId);
      if (targetId === gearId) { gears.splice(fromIndex, 0, moved); return; }
      const rect = targetRow.getBoundingClientRect();
      const before = e.clientY < rect.top + rect.height / 2;
      const newCat = dropZone?.dataset.cat || moved.cat;
      moved.cat = newCat;
      const toIndex = gears.findIndex(g => g.id === targetId);
      gears.splice(before ? toIndex : toIndex + 1, 0, moved);
    } else if (dropZone) {
      const newCat = dropZone.dataset.cat || moved.cat;
      moved.cat = newCat;
      let lastInCat = -1;
      gears.forEach((g, i) => { if (g.cat === newCat) lastInCat = i; });
      gears.splice(lastInCat + 1, 0, moved);
    } else {
      gears.splice(fromIndex, 0, moved);
      return;
    }

    saveData();
    updateStats();
    renderHome();
    if (moved.cat !== gear.cat) snack(gear.name + ' を ' + (CAT_LABELS[moved.cat] || moved.cat) + ' に移動しました');
  });
}

function toggleCat(cat) {
  if (collapsedCats.has(cat)) collapsedCats.delete(cat);
  else collapsedCats.add(cat);
  renderHome();
}

// ── Add / Delete ──
function addGear(gear) {
  gears.push({ id: Date.now(), ...gear });
  saveData();
  updateStats();
  renderHome();
}

function deleteGear(id) {
  const g = gears.find(x=>x.id===id);
  gears = gears.filter(x=>x.id!==id);
  checkedIds.delete(id);
  saveData();
  updateStats();
  renderHome();
  if (g) snack(g.name+' を削除しました');
}

// ── Gear Detail ──
function openDetail(id) {
  const g = gears.find(x => x.id === id);
  if (!g) return;
  const imgWrap = document.getElementById('detailImgWrap');
  imgWrap.innerHTML = g.image
    ? `<img src="${g.image}" onerror="this.style.display='none'">`
    : '';
  imgWrap.style.display = g.image ? '' : 'none';
  document.getElementById('detailCat').textContent = CAT_LABELS[g.cat] || g.cat || '';
  document.getElementById('detailName').textContent = g.name;
  document.getElementById('detailMeta').textContent = g.weight ? g.weight + 'g' : '';
  const noteEl = document.getElementById('detailNote');
  noteEl.textContent = g.note || '';
  noteEl.style.display = g.note ? '' : 'none';
  document.getElementById('detailDelBtn').onclick = () => { closeDetail(); deleteGear(id); };
  document.getElementById('detailEditBtn').onclick = () => { closeDetail(); openEdit(id); };
  document.getElementById('detailScrim').classList.add('open');
}

function closeDetail() {
  document.getElementById('detailScrim').classList.remove('open');
}

// ── Edit dialog ──
let _editMode = 'edit';
let _pendingImage = '';

function renderCatChips(selected) {
  const container = document.getElementById('catChips');
  if (!container) return;
  container.innerHTML = categories.map(c => `
    <button type="button" class="cat-chip ${selected === c.key ? 'active' : ''}"
      data-cat="${c.key}" onclick="selectCat('${c.key}')">${c.label}</button>
  `).join('');
}

function selectCat(cat) {
  document.getElementById('eCat').value = cat;
  document.querySelectorAll('.cat-chip').forEach(el => {
    el.classList.toggle('active', el.dataset.cat === cat);
  });
}

// ── Category Manager ──
function openCatManager() {
  renderCatManagerList();
  document.getElementById('catManagerScrim').classList.add('open');
}

function closeCatManager() {
  document.getElementById('catManagerScrim').classList.remove('open');
}

function renderCatManagerList() {
  document.getElementById('catManagerList').innerHTML = categories.map(c => `
    <div class="cat-mgr-row">
      <input class="cat-mgr-input" value="${c.label}"
        onblur="renameCat('${c.key}', this.value)"
        onkeydown="if(event.key==='Enter')this.blur()">
      ${c.key !== 'Other' ? `
        <button class="cat-mgr-del" onclick="deleteCategory('${c.key}')">
          <span class="material-icons-round">close</span>
        </button>` : ''}
    </div>
  `).join('');
}

function renameCat(key, newLabel) {
  newLabel = newLabel.trim();
  if (!newLabel) return;
  const cat = categories.find(c => c.key === key);
  if (!cat || cat.label === newLabel) return;
  cat.label = newLabel;
  saveCategories();
  renderCatChips(document.getElementById('eCat')?.value || '');
  renderHome();
}

function addNewCategory() {
  const input = document.getElementById('catNewInput');
  const label = input.value.trim();
  if (!label) return;
  const key = 'cat_' + Date.now();
  categories.push({ key, label });
  saveCategories();
  renderCatManagerList();
  renderCatChips(document.getElementById('eCat').value);
  input.value = '';
  snack(label + ' を追加しました');
}

function deleteCategory(key) {
  if (key === 'Other') return;
  const label = categories.find(c => c.key === key)?.label || key;
  lists.forEach(l => { l.gears?.forEach(g => { if (g.cat === key) g.cat = 'Other'; }); });
  gears.forEach(g => { if (g.cat === key) g.cat = 'Other'; });
  categories = categories.filter(c => c.key !== key);
  saveCategories();
  saveData();
  renderCatManagerList();
  renderCatChips(document.getElementById('eCat')?.value || '');
  renderHome();
  snack(label + ' を削除しました（ギアは Other に移動）');
}

function openEdit(id) {
  const g = gears.find(x=>x.id===id);
  if (!g) return;
  _editMode = 'edit';
  document.getElementById('editDialogTitle').textContent = 'ギアを編集';
  document.getElementById('editId').value = id;
  document.getElementById('editDialogAddBtn').style.display = 'none';
  document.getElementById('etf-url').style.display = 'none';
  const fields = { eName:g.name, eWeight:g.weight||'', eNote:g.note||'' };
  Object.entries(fields).forEach(([k,v]) => {
    const el = document.getElementById(k); el.value=v; tfInput(el);
  });
  renderCatChips(g.cat);
  selectCat(g.cat);
  document.getElementById('editScrim').classList.add('open');
}

function openNewGearDialog(prefill = {}) {
  _editMode = 'add';
  _pendingImage = prefill.image || '';
  document.getElementById('editDialogTitle').textContent = 'ギアを追加';
  document.getElementById('editId').value = '-1';
  document.getElementById('editDialogAddBtn').style.display = 'inline-flex';
  const fields = { eName: prefill.name||'', eWeight: prefill.weight||'', eNote: prefill.note||'' };
  Object.entries(fields).forEach(([k,v]) => {
    const el = document.getElementById(k); el.value = v; tfInput(el);
  });
  renderCatChips(prefill.cat || '');
  selectCat(prefill.cat || '');
  const urlTf = document.getElementById('etf-url');
  const urlEl = document.getElementById('eUrl');
  urlTf.style.display = 'block';
  urlEl.value = ''; tfInput(urlEl);
  document.getElementById('eUrlStatus').textContent = '';
  document.getElementById('editScrim').classList.add('open');
}

function closeEdit() {
  saveEdit();
  document.getElementById('editScrim').classList.remove('open');
  _editMode = 'edit';
  _pendingImage = '';
  document.getElementById('editDialogTitle').textContent = 'ギアを編集';
  document.getElementById('editDialogAddBtn').style.display = 'none';
}

function confirmAddGear() {
  const name = document.getElementById('eName').value.trim();
  if (!name) { snack('ギア名を入力してください'); return; }
  saveEdit();
  closeEdit();
}

function saveEdit() {
  const name   = document.getElementById('eName').value.trim();
  const cat    = document.getElementById('eCat').value;
  const weight = parseInt(document.getElementById('eWeight').value)||0;
  const note   = document.getElementById('eNote').value.trim();

  if (_editMode === 'add') {
    if (!name) return;
    _editMode = 'done';
    addGear({ name, cat, weight, note, image: _pendingImage });
    document.getElementById('searchInput').value = '';
    snack('✓ ' + name + ' を登録しました');
    return;
  }

  if (_editMode === 'done') return;

  const id = parseInt(document.getElementById('editId').value);
  const g = gears.find(x=>x.id===id); if (!g) return;
  g.name = name; g.cat = cat; g.weight = weight; g.note = note;
  saveData(); updateStats(); renderHome();
}

document.getElementById('editScrim').addEventListener('click', e => {
  if (e.target===document.getElementById('editScrim')) closeEdit();
});

// ── Trip ──
function renderTrip() {
  const container = document.getElementById('tripList');
  if (gears.length===0) {
    container.innerHTML = `<div class="empty-state"><span class="material-icons-round">hiking</span><p>ギアが登録されていません</p></div>`;
    updateTripWeight(); return;
  }
  const bycat = {};
  gears.forEach(g => { if(!bycat[g.cat]) bycat[g.cat]=[]; bycat[g.cat].push(g); });
  container.innerHTML = Object.entries(bycat).map(([cat,items]) => `
    <div class="check-card">
      <div class="check-cat-hdr">${CAT_LABELS[cat]||cat}</div>
      ${items.map(g => `
        <div class="check-row ${checkedIds.has(g.id)?'checked':''}" onclick="toggleCheck(${g.id})">
          <div class="checkbox"><span class="material-icons-round">check</span></div>
          <div class="check-name">${g.name}</div>
          <div class="check-wt">${g.weight?g.weight+'g':'—'}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
  updateTripWeight();
}

function toggleCheck(id) {
  checkedIds.has(id) ? checkedIds.delete(id) : checkedIds.add(id);
  saveData();
  renderTrip();
}

function clearChecks() { checkedIds.clear(); saveData(); renderTrip(); }

function updateTripWeight() {
  const checked = gears.filter(g=>checkedIds.has(g.id));
  const total = checked.reduce((s,g)=>s+g.weight, 0);
  document.getElementById('tripTotalG').textContent = total;
  document.getElementById('tripTotalKg').textContent = '';
  const bd = {};
  checked.forEach(g => { if(!bd[g.cat]) bd[g.cat]=0; bd[g.cat]+=g.weight; });
  document.getElementById('breakdown').innerHTML = Object.entries(bd).length===0
    ? '<div style="color:var(--on-surface-v);font-size:13px">まだ選択されていません</div>'
    : Object.entries(bd).map(([c,w])=>`
        <div class="bd-chip">${CAT_LABELS[c]||c} <span class="bd-wt">${w}g</span></div>
      `).join('');
}

// ── Snackbar ──
function snack(msg) {
  const el = document.getElementById('snackbar');
  el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2800);
}

// ── List management ──
const ACTIVITY_SUGGESTIONS = ['TrailRun','Hiking','Alpine','BackPacking','Camping','Trekking','ULHike'];

function generateListSuggestion() {
  const act = ACTIVITY_SUGGESTIONS[Math.floor(Math.random() * ACTIVITY_SUGGESTIONS.length)];
  return act;
}

function saveListTitle() {
  const cl = lists.find(l => l.id === currentListId);
  if (cl) cl.name = document.getElementById('listTitle').textContent.trim();
  saveData();
  renderListTabs();
}

function loadListTitle() {
  const cl = lists.find(l => l.id === currentListId);
  const el = document.getElementById('listTitle');
  el.textContent = cl ? cl.name : '';
  el.dataset.placeholder = generateListSuggestion();
}

// ── List info ──
const INFO_FIELDS = [
  { key:'comment', icon:'', label:'例）2026/3/7・北岳3193m・春・快晴', wide:true, plain:true },
];

function renderListInfo() {
  const cl = lists.find(l => l.id === currentListId);
  const info = cl?.info || {};
  const container = document.getElementById('listInfo');
  container.innerHTML = `
    <div class="list-info-grid">
      ${INFO_FIELDS.map(f => `
        <div class="list-info-field ${f.wide ? 'list-info-wide' : ''} ${f.plain ? 'list-info-plain' : ''}">
          ${f.icon ? `<span class="material-icons-round list-info-icon">${f.icon}</span>` : ''}
          <input
            class="list-info-input"
            data-key="${f.key}"
            placeholder="${f.label}"
            value="${info[f.key] || ''}"
            oninput="saveListInfo()"
          >
        </div>
      `).join('')}
    </div>
  `;
}

function saveListInfo() {
  const cl = lists.find(l => l.id === currentListId);
  if (!cl) return;
  if (!cl.info) cl.info = {};
  document.querySelectorAll('.list-info-input').forEach(el => {
    cl.info[el.dataset.key] = el.value;
  });
  saveData();
}


function renderListTabs() {
  const container = document.getElementById('listTabs');
  container.innerHTML = lists.map(l => `
    <div class="list-tab-wrap" draggable="true" data-list-id="${l.id}">
      <button class="list-tab ${l.id === currentListId ? 'active' : ''}" onclick="switchList(${l.id})">
        ${l.name || '<span class="list-tab-unnamed">Untitled</span>'}
        ${lists.length > 1 ? `<span class="list-tab-del" onclick="event.stopPropagation();deleteList(${l.id})" title="削除"><span class="material-icons-round">close</span></span>` : ''}
      </button>
    </div>
  `).join('') + `
    <div class="list-add-wrap" id="listAddWrap">
      <button class="list-tab-add" onclick="openAddListModal()"><span class="material-icons-round">add</span></button>
    </div>`;
}


// List tab drag & drop（落ちる位置に黒い線・ドラッグ中にリアルタイムで並び替え）
let _listDropBefore = true;
let _listDragId = null;
let _listDragInitialOrder = null;
let _listDragDidDrop = false;

const LIST_TAB_GAP = 2; // .list-tabs の gap と合わせる

function ensureListTabDropLine() {
  let line = document.getElementById('listTabDropLine');
  if (!line) {
    line = document.createElement('div');
    line.id = 'listTabDropLine';
    line.className = 'list-tab-drop-line';
    line.setAttribute('aria-hidden', 'true');
    document.body.appendChild(line);
  }
  return line;
}

function updateListTabDropLine(wrap, before) {
  const line = ensureListTabDropLine();
  if (!wrap) {
    line.style.display = 'none';
    line.classList.remove('visible');
    return;
  }
  const rect = wrap.getBoundingClientRect();
  const halfGap = LIST_TAB_GAP / 2;
  const x = before ? rect.left - halfGap : rect.right + halfGap;
  const y = rect.top + rect.height / 2;
  line.style.left = x + 'px';
  line.style.top = y + 'px';
  line.style.display = 'block';
  line.style.visibility = 'visible';
  line.classList.add('visible');
}

function setupListTabDnD() {
  const container = document.getElementById('listTabs');
  if (!container) return;
  // 透明なドラッグ用画像（ブラウザのゴーストで線が隠れないように）
  let emptyDragImg = document.createElement('img');
  emptyDragImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

  container.addEventListener('dragstart', e => {
    const wrap = e.target.closest('.list-tab-wrap[data-list-id]');
    if (!wrap) return;
    const id = Number(wrap.dataset.listId);
    e.dataTransfer.setData('text/plain', String(id));
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setDragImage(emptyDragImg, 0, 0); } catch (_) {}
    wrap.classList.add('list-tab-dragging');
    _listDragId = id;
    _listDragInitialOrder = lists.map(l => l.id);
    _listDragDidDrop = false;
    _listDropBefore = false;
    requestAnimationFrame(() => updateListTabDropLine(wrap, false));
  });
  container.addEventListener('dragend', e => {
    container.querySelectorAll('.list-tab-wrap[data-list-id]').forEach(w => {
      w.classList.remove('list-tab-dragging', 'list-tab-drag-over', 'list-tab-drop-before', 'list-tab-drop-after');
    });
    const line = document.getElementById('listTabDropLine');
    if (line) { line.style.display = 'none'; line.classList.remove('visible'); }
    if (!_listDragDidDrop && _listDragInitialOrder && _listDragInitialOrder.length > 0) {
      const order = _listDragInitialOrder;
      lists.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
      renderListTabs();
    }
    _listDragId = null;
    _listDragInitialOrder = null;
  });
  container.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const wrap = e.target.closest('.list-tab-wrap[data-list-id]');
    container.querySelectorAll('.list-tab-wrap[data-list-id]').forEach(w => {
      w.classList.remove('list-tab-drag-over', 'list-tab-drop-before', 'list-tab-drop-after');
    });
    if (wrap && _listDragId != null) {
      const rect = wrap.getBoundingClientRect();
      const mid = rect.left + rect.width / 2;
      _listDropBefore = e.clientX < mid;
      const targetId = Number(wrap.dataset.listId);
      const fromIndex = lists.findIndex(l => l.id === _listDragId);
      const toIndex = lists.findIndex(l => l.id === targetId);
      if (fromIndex !== -1 && toIndex !== -1) {
        const insertIndex = _listDropBefore
          ? (fromIndex < toIndex ? toIndex - 1 : toIndex)
          : (fromIndex < toIndex ? toIndex : toIndex + 1);
        if (insertIndex !== fromIndex) {
          const [item] = lists.splice(fromIndex, 1);
          lists.splice(insertIndex, 0, item);
          renderListTabs();
          const newWrap = container.querySelector(`.list-tab-wrap[data-list-id="${targetId}"]`);
          if (newWrap) updateListTabDropLine(newWrap, _listDropBefore);
          return;
        }
      }
      wrap.classList.add(_listDropBefore ? 'list-tab-drop-before' : 'list-tab-drop-after');
      updateListTabDropLine(wrap, _listDropBefore);
    } else {
      updateListTabDropLine(null);
    }
  });
  container.addEventListener('drop', e => {
    e.preventDefault();
    _listDragDidDrop = true;
    const line = document.getElementById('listTabDropLine');
    if (line) { line.style.display = 'none'; line.classList.remove('visible'); }
    saveData();
  });
}
setupListTabDnD();

function switchList(id) {
  const cl = lists.find(l => l.id === currentListId);
  if (cl) { cl.gears = gears; cl.checkedIds = [...checkedIds]; }
  currentListId = id;
  const nl = lists.find(l => l.id === id);
  gears = nl.gears || [];
  checkedIds = new Set(nl.checkedIds || []);
  saveData();
  loadListTitle();
  renderListInfo();
  updateStats();
  renderHome();
  renderListTabs();
}

function openAddListModal() {
  setAddListMode('new');
  const input = document.getElementById('newListName');
  input.value = '';
  tfInput(input);
  document.getElementById('addListScrim').classList.add('open');
  setTimeout(() => input.focus(), 100);
}

function setAddListMode(mode) {
  const isNew = mode === 'new';
  document.getElementById('modeNewBtn').classList.toggle('active', isNew);
  document.getElementById('modeCopyBtn').classList.toggle('active', !isNew);
  document.getElementById('addListNewSection').style.display = isNew ? '' : 'none';
  document.getElementById('addListCopySection').style.display = isNew ? 'none' : '';
  if (!isNew) {
    const cl = lists.find(l => l.id === currentListId);
    document.getElementById('addListCopyOptions').innerHTML = lists.map(l => `
      <label class="copy-option ${l.id === currentListId ? 'checked' : ''}">
        <input type="radio" name="copyFrom" value="${l.id}" ${l.id === currentListId ? 'checked' : ''} onchange="document.querySelectorAll('.copy-option').forEach(el=>el.classList.remove('checked'));this.closest('.copy-option').classList.add('checked')">
        <span>${l.name || 'Untitled'}</span>
      </label>
    `).join('');
  }
}

function closeAddListModal() {
  document.getElementById('addListScrim').classList.remove('open');
}

function confirmAddList() {
  const isCopy = document.getElementById('modeCopyBtn').classList.contains('active');
  if (isCopy) {
    const radio = document.querySelector('input[name="copyFrom"]:checked');
    const srcId = radio ? Number(radio.value) : currentListId;
    duplicateList(srcId);
    closeAddListModal();
    return;
  }
  const input = document.getElementById('newListName');
  const name = (input.value || '').trim();
  const id = Date.now();
  lists.push({ id, name, gears: [], checkedIds: [] });
  switchList(id);
  saveData();
  renderListTabs();
  closeAddListModal();
  snack('シートを追加しました');
}

document.getElementById('addListScrim')?.addEventListener('click', e => {
  if (e.target === document.getElementById('addListScrim')) closeAddListModal();
});

function duplicateList(id) {
  const src = lists.find(l => l.id === id);
  if (!src) return;
  // 現在のリストのデータを先に保存
  const cl = lists.find(l => l.id === currentListId);
  if (cl) { cl.gears = gears; cl.checkedIds = [...checkedIds]; }
  const newId = Date.now();
  const newGears = src.gears.map(g => ({ ...g, id: Date.now() + Math.random() }));
  lists.push({ id: newId, name: src.name + ' のコピー', gears: newGears, checkedIds: [] });
  switchList(newId);
  snack(src.name + ' をコピーしました');
}

function deleteList(id) {
  if (lists.length <= 1) return;
  if (!confirm(lists.find(l=>l.id===id)?.name + ' を削除しますか？')) return;
  lists = lists.filter(l => l.id !== id);
  if (currentListId === id) {
    currentListId = lists[0].id;
    const cl = lists[0];
    gears = cl.gears || [];
    checkedIds = new Set(cl.checkedIds || []);
    loadListTitle();
    renderListInfo();
    updateStats();
    renderHome();
  }
  saveData();
  renderListTabs();
}

// ── Dialog URL fetch ──
function onDialogUrlPaste(e) {
  setTimeout(() => {
    const val = document.getElementById('eUrl').value;
    if (/^https?:\/\//i.test(val.trim())) fetchDialogUrl(val.trim());
  }, 0);
}

async function fetchDialogUrl(url) {
  if (!/^https?:\/\//i.test(url)) return;
  const status = document.getElementById('eUrlStatus');
  status.textContent = '読み込み中…';
  try {
    const gear = await fetchFromUrl(url);
    if (gear.name) {
      const nameEl = document.getElementById('eName');
      nameEl.value = gear.name; tfInput(nameEl);
    }
    if (gear.weight) {
      const wEl = document.getElementById('eWeight');
      wEl.value = gear.weight; tfInput(wEl);
    }
    if (gear.cat) selectCat(gear.cat);
    if (gear.image) _pendingImage = gear.image;
    status.textContent = '✓';
    setTimeout(() => { status.textContent = ''; }, 2000);
  } catch {
    status.textContent = '取得失敗';
    setTimeout(() => { status.textContent = ''; }, 2000);
  }
}

// ── Account ──
const ACCOUNT_KEY = 'ulgear_account';

function applyAccountImage(dataUrl) {
  // panel avatar
  const img = document.getElementById('accountAvatarImg');
  const icon = document.getElementById('accountAvatarIcon');
  if (dataUrl) {
    img.src = dataUrl; img.style.display = ''; icon.style.display = 'none';
  } else {
    img.style.display = 'none'; icon.style.display = '';
  }
  // header icon
  const hImg = document.getElementById('accountIconImg');
  const hIcon = document.getElementById('accountIcon');
  if (dataUrl) {
    hImg.src = dataUrl; hImg.style.display = ''; hIcon.style.display = 'none';
  } else {
    hImg.style.display = 'none'; hIcon.style.display = '';
  }
}

function openAccount() {
  const acc = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || '{}');
  ['accName','accHandle','accBio'].forEach(id => {
    const key = id.replace('acc','').toLowerCase();
    const el = document.getElementById(id);
    el.value = acc[key] || '';
    tfInput(el);
  });
  applyAccountImage(acc.image || '');
  document.getElementById('accountScrim').classList.add('open');
  document.getElementById('accountPanel').classList.add('open');
}

function onAccountImageChange(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const dataUrl = e.target.result;
    const acc = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || '{}');
    acc.image = dataUrl;
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acc));
    applyAccountImage(dataUrl);
  };
  reader.readAsDataURL(file);
}

function closeAccount() {
  document.getElementById('accountScrim').classList.remove('open');
  document.getElementById('accountPanel').classList.remove('open');
}

function saveAccount() {
  const acc = {
    name:   document.getElementById('accName').value.trim(),
    handle: document.getElementById('accHandle').value.trim(),
    bio:    document.getElementById('accBio').value.trim(),
  };
  localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acc));
}

// ── Category DnD ──
function setupCatDnD() {
  const container = document.getElementById('gearByCat');
  if (!container) return;
  let draggingCat = null;

  container.addEventListener('dragstart', e => {
    const header = e.target.closest('[data-cat-drag]');
    if (!header) return;
    draggingCat = header.dataset.catDrag;
    e.dataTransfer.setData('text/plain', 'cat:' + draggingCat);
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => header.closest('.cat-group')?.classList.add('cat-group-dragging'), 0);
  });

  container.addEventListener('dragend', () => {
    container.querySelectorAll('.cat-group-dragging,.cat-group-drop-before,.cat-group-drop-after')
      .forEach(el => el.classList.remove('cat-group-dragging','cat-group-drop-before','cat-group-drop-after'));
    draggingCat = null;
  });

  container.addEventListener('dragover', e => {
    if (!draggingCat) return;
    const group = e.target.closest('.cat-group');
    container.querySelectorAll('.cat-group-drop-before,.cat-group-drop-after')
      .forEach(el => el.classList.remove('cat-group-drop-before','cat-group-drop-after'));
    if (!group || group.dataset.cat === draggingCat) return;
    e.preventDefault();
    const rect = group.getBoundingClientRect();
    group.classList.add(e.clientY < rect.top + rect.height / 2 ? 'cat-group-drop-before' : 'cat-group-drop-after');
  });

  container.addEventListener('drop', e => {
    if (!draggingCat) return;
    const group = e.target.closest('.cat-group');
    if (!group || group.dataset.cat === draggingCat) return;
    e.preventDefault();
    const targetCat = group.dataset.cat;
    const rect = group.getBoundingClientRect();
    const before = e.clientY < rect.top + rect.height / 2;

    const movedObj = categories.find(c => c.key === draggingCat);
    const targetObj = categories.find(c => c.key === targetCat);
    if (!movedObj || !targetObj) return;

    // assign to target's column
    const colEls = [...container.querySelectorAll('.gear-column')];
    const targetColEl = group.closest('.gear-column');
    const newCol = colEls.indexOf(targetColEl);
    if (newCol >= 0) movedObj.col = newCol;

    // reorder in flat array
    categories.splice(categories.indexOf(movedObj), 1);
    const toIdx = categories.indexOf(targetObj);
    categories.splice(before ? toIdx : toIdx + 1, 0, movedObj);

    saveCategories();
    renderHome();
  });
}

// ── Column layout animation ──
const _mq860 = window.matchMedia('(min-width:860px)');
_mq860.addEventListener('change', () => {
  const cols = document.getElementById('gearByCat');
  if (!cols) return;
  cols.classList.add('relayout');
  cols.addEventListener('animationend', () => cols.classList.remove('relayout'), { once: true });
});

// ── Init ──
(function initAccount() {
  const acc = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || '{}');
  if (acc.image) applyAccountImage(acc.image);
})();
loadCategories();
loadData();
loadListTitle();
renderListInfo();
updateStats();
renderHome();
renderListTabs();
setupGearDnD();
setupCatDnD();
