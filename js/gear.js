// ── Persistence ──
const STORAGE_KEY = 'ulgear_data';

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    gears,
    checkedIds: [...checkedIds],
  }));
}

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    gears = saved.gears || [];
    checkedIds = new Set(saved.checkedIds || []);
  } catch(e) {
    gears = [];
    checkedIds = new Set();
  }
}

// ── State ──
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
  document.getElementById('statKg').textContent = total;
  const cnt = document.getElementById('secCount');
  cnt.textContent = gears.length > 0 ? gears.length+'件' : '';
}

// 3カラムのグループ定義（Backpackは別途フルwidth表示）
const COL_GROUPS = [
  { label: 'Cook System',  cats: ['Cook', 'Food', 'Light'] },
  { label: 'Sleep System', cats: ['Sleep'] },
  { label: 'Clothing',     cats: ['Clothing', 'Footwear', 'Navigation', 'Safety', 'Other'] },
];
const ALL_GROUPED_CATS = [...COL_GROUPS.flatMap(g => g.cats), 'Backpack'];

function renderCatGroup(cat, items) {
  const catTotal = items.reduce((s,g)=>s+g.weight, 0);
  const icon = CAT_ICONS[cat] || '📦';
  const label = CAT_LABELS[cat] || cat;
  return `
  <div class="cat-group" id="catg-${cat}">
    <div class="cat-group-header">
      <span class="cat-badge">${icon}</span>
      <span class="cat-name">${label}</span>
      <span class="cat-total">${catTotal}g</span>
    </div>
    <div class="gear-list-wrap">
      ${items.map((g,idx) => `
        <div class="gear-row" style="animation-delay:${idx*30}ms">
          ${g.image ? `<img src="${g.image}" style="width:28px;height:28px;border-radius:5px;object-fit:cover;flex-shrink:0;border:1px solid var(--outline-v)" onerror="this.style.display='none'">` : ''}
          <div class="gear-row-body">
            <div class="gear-row-name">${g.name}</div>
            ${g.note ? `<div class="gear-row-note">${g.note}</div>` : ''}
          </div>
          <div class="gear-row-right">
            ${g.weight ? `<span class="weight-pill">${g.weight}g</span>` : ''}
            <div class="row-actions">
              <button class="sm-btn edit" onclick="openEdit(${g.id})"><span class="material-icons-round">edit</span></button>
              <button class="sm-btn del" onclick="deleteGear(${g.id})"><span class="material-icons-round">delete</span></button>
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

// ── Render gear list by category ──
function renderHome() {
  const container = document.getElementById('gearByCat');
  if (gears.length === 0) {
    container.innerHTML = `<div class="empty-state">
      <span class="material-icons-round">backpack</span>
      <p>まだギアが登録されていません<br>上の検索欄から追加しましょう</p>
    </div>`;
    return;
  }

  const bycat = {};
  gears.forEach(g => {
    if (!bycat[g.cat]) bycat[g.cat] = [];
    bycat[g.cat].push(g);
  });

  // Backpack: フルwidth・横一列
  const bpItems = bycat['Backpack'] || [];
  const backpackHtml = bpItems.length > 0 ? `
    <div class="backpack-section">
      <div class="cat-group-header">
        <span class="cat-badge">🎒</span>
        <span class="cat-name">Backpack</span>
        <span class="cat-total">${bpItems.reduce((s,g)=>s+g.weight,0)}g</span>
      </div>
      <div class="backpack-row">
        ${bpItems.map((g,idx) => `
          <div class="backpack-item" style="animation-delay:${idx*30}ms">
            ${g.image ? `<img src="${g.image}" style="width:28px;height:28px;border-radius:5px;object-fit:cover;flex-shrink:0;border:1px solid var(--outline-v)" onerror="this.style.display='none'">` : ''}
            <div class="gear-row-body">
              <div class="gear-row-name">${g.name}</div>
              ${g.note ? `<div class="gear-row-note">${g.note}</div>` : ''}
            </div>
            <div class="gear-row-right">
              ${g.weight ? `<span class="weight-pill">${g.weight}g</span>` : ''}
              <div class="row-actions">
                <button class="sm-btn edit" onclick="openEdit(${g.id})"><span class="material-icons-round">edit</span></button>
                <button class="sm-btn del" onclick="deleteGear(${g.id})"><span class="material-icons-round">delete</span></button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>` : '';

  // 3カラム
  const columnsHtml = `<div class="gear-columns">
    ${COL_GROUPS.map(group => {
      const html = group.cats
        .filter(c => bycat[c])
        .map(c => renderCatGroup(c, bycat[c]))
        .join('');
      return `<div class="gear-column">
        <div class="gear-col-title">${group.label}</div>
        ${html || '<div class="gear-col-empty">なし</div>'}
      </div>`;
    }).join('')}
  </div>`;

  const extras = Object.keys(bycat)
    .filter(c => !ALL_GROUPED_CATS.includes(c))
    .map(c => renderCatGroup(c, bycat[c]))
    .join('');

  container.innerHTML = backpackHtml + columnsHtml + extras;
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

// ── Edit dialog ──
let _editMode = 'edit';
let _pendingImage = '';

function openEdit(id) {
  const g = gears.find(x=>x.id===id);
  if (!g) return;
  _editMode = 'edit';
  document.getElementById('editDialogTitle').textContent = 'ギアを編集';
  document.getElementById('editId').value = id;
  const fields = { eName:g.name, eWeight:g.weight||'', eNote:g.note||'' };
  Object.entries(fields).forEach(([k,v]) => {
    const el = document.getElementById(k); el.value=v; tfInput(el);
  });
  const ec = document.getElementById('eCat'); ec.value=g.cat; tfInput(ec);
  document.getElementById('editScrim').classList.add('open');
}

function openNewGearDialog(prefill = {}) {
  _editMode = 'add';
  _pendingImage = prefill.image || '';
  document.getElementById('editDialogTitle').textContent = 'ギアを追加';
  document.getElementById('editId').value = '-1';
  const fields = { eName: prefill.name||'', eWeight: prefill.weight||'', eNote: prefill.note||'' };
  Object.entries(fields).forEach(([k,v]) => {
    const el = document.getElementById(k); el.value = v; tfInput(el);
  });
  const ec = document.getElementById('eCat'); ec.value = prefill.cat||''; tfInput(ec);
  document.getElementById('editScrim').classList.add('open');
}

function closeEdit() {
  document.getElementById('editScrim').classList.remove('open');
  _editMode = 'edit';
  _pendingImage = '';
  document.getElementById('editDialogTitle').textContent = 'ギアを編集';
}

function saveEdit() {
  const name   = document.getElementById('eName').value.trim();
  const cat    = document.getElementById('eCat').value;
  const weight = parseInt(document.getElementById('eWeight').value)||0;
  const note   = document.getElementById('eNote').value.trim();

  if (_editMode === 'add') {
    addGear({ name, cat, weight, note, image: _pendingImage });
    document.getElementById('searchInput').value = '';
    closeEdit();
    snack('✓ ' + name + ' を登録しました');
    return;
  }

  const id = parseInt(document.getElementById('editId').value);
  const g = gears.find(x=>x.id===id); if (!g) return;
  g.name = name; g.cat = cat; g.weight = weight; g.note = note;
  saveData(); closeEdit(); updateStats(); renderHome();
  snack('保存しました');
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
      <div class="check-cat-hdr">${CAT_ICONS[cat]||'📦'} ${CAT_LABELS[cat]||cat}</div>
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
        <div class="bd-chip">${CAT_ICONS[c]||'📦'} ${CAT_LABELS[c]||c} <span class="bd-wt">${w}g</span></div>
      `).join('');
}

// ── Snackbar ──
function snack(msg) {
  const el = document.getElementById('snackbar');
  el.textContent=msg; el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'), 2800);
}

// ── Init ──
loadData();
updateStats();
renderHome();
