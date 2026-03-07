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
  document.getElementById('statKg').textContent = (total/1000).toFixed(3);
  const cnt = document.getElementById('secCount');
  cnt.textContent = gears.length > 0 ? gears.length+'件' : '';
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

  container.innerHTML = Object.entries(bycat).map(([cat, items]) => {
    const catTotal = items.reduce((s,g)=>s+g.weight, 0);
    const icon = CAT_ICONS[cat] || '📦';
    const label = CAT_LABELS[cat] || cat;
    const collapsed = collapsedCats.has(cat);

    return `
    <div class="cat-group" id="catg-${cat}">
      <div class="cat-group-header ${collapsed?'collapsed':''}" onclick="toggleCat('${cat}')">
        <div class="cat-badge">${icon}</div>
        <div class="cat-info">
          <div class="cat-name">${label}</div>
          <div class="cat-sub">${items.length}件</div>
        </div>
        <div class="cat-total">${catTotal}g</div>
        <span class="material-icons-round cat-chevron">expand_more</span>
      </div>
      ${collapsed ? '' : `
      <div class="gear-list-wrap">
        ${items.map((g,idx) => `
          <div class="gear-row" style="animation-delay:${idx*30}ms">
            ${g.image ? `<img src="${g.image}" style="width:44px;height:44px;border-radius:8px;object-fit:cover;flex-shrink:0;border:1px solid var(--outline-v)" onerror="this.style.display='none'">` : ''}
            <div class="gear-row-body">
              <div class="gear-row-name">${g.name}</div>
              ${g.note ? `<div class="gear-row-note">${g.note}</div>` : ''}
            </div>
            <div class="gear-row-right">
              ${g.weight ? `<span class="weight-pill">${g.weight}g</span>` : ''}
              <div class="row-actions">
                <button class="sm-btn edit" onclick="openEdit(${g.id})">編集</button>
                <button class="sm-btn del" onclick="deleteGear(${g.id})">削除</button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`}
    </div>`;
  }).join('');
}

function toggleCat(cat) {
  if (collapsedCats.has(cat)) collapsedCats.delete(cat);
  else collapsedCats.add(cat);
  renderHome();
}

// ── Add / Delete ──
function addGear(gear) {
  gears.push({ id: Date.now(), ...gear });
  updateStats();
  renderHome();
}

function deleteGear(id) {
  const g = gears.find(x=>x.id===id);
  gears = gears.filter(x=>x.id!==id);
  checkedIds.delete(id);
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
  closeEdit(); updateStats(); renderHome();
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
  renderTrip();
}

function clearChecks() { checkedIds.clear(); renderTrip(); }

function updateTripWeight() {
  const checked = gears.filter(g=>checkedIds.has(g.id));
  const total = checked.reduce((s,g)=>s+g.weight, 0);
  document.getElementById('tripTotalG').textContent = total;
  document.getElementById('tripTotalKg').textContent = total>0?`(${(total/1000).toFixed(3)} kg)`:'';
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
updateStats();
renderHome();
