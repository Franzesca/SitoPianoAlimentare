/* ==========================================================================
   UI
   ========================================================================== */
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const BASE_BY_ID = {}; BASI.forEach(b => BASE_BY_ID[b.id] = b);
let PASTO_BY_ID = {};
const TIPO_LABEL = Object.fromEntries(TIPI);
// PASTO_BY_ID/tuttiIPasti() contengono sempre i pasti già fusi con le loro
// eventuali modifiche (pastoEffettivo) — così calcola(), la ricerca nel
// catalogo, pastoFattibile() ecc. vedono automaticamente ingredienti e
// procedura modificati, invece di dover richiamare pastoEffettivo() ovunque
const tuttiIPasti = () => Object.values(PASTO_BY_ID);
function ricostruisciPastoById(){
  const out = {};
  PASTI.forEach(p => { out[p.id] = pastoEffettivo(p); });
  stato.ricetteExtra.forEach(p => { out[p.id] = pastoEffettivo(p); });
  PASTO_BY_ID = out;
}

/* ---------- stato + persistenza ---------- */
const CHIAVE_UI = 'dietacosi.ui.v1';
let stato = {
  grp:'tipo', filtro:'tutti', passo:'dispensa',
  sel:{}, modiBase:{}, hoGia:{}, preso:{}, pesi:[], pesoUid:null, aperti:{}, extra:[],
  scorte:{ingredienti:{}, basi:{}}, importanza:{ingredienti:{}, basi:{}}, pastiExtra:{},
  mostraArchiviati:false, wishlist:[], ricetteExtra:[]
};
ricostruisciPastoById();
let modificaAperta = null; // id del pasto in modifica, solo locale, non sincronizzato
function salvaLocale(){
  try {
    const { grp, filtro, passo, aperti, pesoUid } = stato;
    localStorage.setItem(CHIAVE_UI, JSON.stringify({ grp, filtro, passo, aperti, pesoUid }));
  } catch(e){}
}
function caricaLocale(){
  try {
    const r = localStorage.getItem(CHIAVE_UI);
    if (r) Object.assign(stato, JSON.parse(r));
  } catch(e){}
  if (stato.grp === 'giorno') stato.grp = 'tipo';
}

/* ---------- tema chiaro/scuro ---------- */
const CHIAVE_TEMA = 'dietacosi.tema';
const ICONA_SOLE = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const ICONA_LUNA = '<svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
function temaCorrente(){ return document.documentElement.dataset.tema === 'chiaro' ? 'chiaro' : 'scuro'; }
function impostaTema(t){
  document.documentElement.setAttribute('data-tema', t);
  try { localStorage.setItem(CHIAVE_TEMA, t); } catch(e){}
  const mc = document.querySelector('meta[name=theme-color]');
  if (mc) mc.setAttribute('content', t === 'chiaro' ? '#FAF5EC' : '#1B1416');
  aggiornaBottoneTema();
}
function aggiornaBottoneTema(){
  const b = $('#tema-switch');
  if (!b) return;
  const chiaro = temaCorrente() === 'chiaro';
  b.innerHTML = chiaro ? ICONA_LUNA : ICONA_SOLE;
  b.setAttribute('aria-label', chiaro ? 'Passa al tema scuro' : 'Passa al tema chiaro');
}

function erroreSync(dove, err){
  console.error('Errore di sincronizzazione:', dove, err);
  toast('Errore di sincronizzazione (' + dove + '): ' + ((err && err.code) || err));
}

/* ---------- sincronizzazione granulare: scrive solo i campi cambiati (mai l'intero
   documento), altrimenti un salvataggio in corso da un telefono può sovrascrivere
   una modifica appena fatta dall'altra persona sullo stesso household ---------- */
function creaSincronizzatore(collezione, dove, ritardo){
  let sporchi = {};
  let timer = null;
  return function(campo, valore){
    if (!HOUSEHOLD_ID) return;
    sporchi[campo] = valore;
    clearTimeout(timer);
    timer = setTimeout(() => {
      const payload = sporchi; sporchi = {};
      updateDoc(doc(db, 'households', HOUSEHOLD_ID, collezione, 'corrente'), payload)
        .catch(err => erroreSync(dove, err));
    }, ritardo);
  };
}
const syncStato = creaSincronizzatore('stato', 'stato condiviso', 400);
const syncScorte = creaSincronizzatore('scorte', 'scorte', 400);
const syncImportanza = creaSincronizzatore('importanza', 'importanza', 400);

function osservaCondiviso(){
  onSnapshot(doc(db, 'households', HOUSEHOLD_ID, 'stato', 'corrente'), snap => {
    const r = snap.exists() ? snap.data() : {};
    stato.sel = r.sel || {};
    stato.modiBase = r.modiBase || {};
    stato.hoGia = r.hoGia || {};
    stato.preso = r.preso || {};
    stato.extra = r.extra || [];
    renderTutto();
    controllaMigrazione();
  }, err => erroreSync('stato condiviso', err));
}

function osservaPesi(){
  const q = query(collection(db, 'households', HOUSEHOLD_ID, 'pesi'), orderBy('data'));
  onSnapshot(q, snap => {
    stato.pesi = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPeso();
  }, err => erroreSync('pesi', err));
}

function osservaScorte(){
  onSnapshot(doc(db, 'households', HOUSEHOLD_ID, 'scorte', 'corrente'), snap => {
    const r = snap.exists() ? snap.data() : {};
    stato.scorte.ingredienti = r.ingredienti || {};
    stato.scorte.basi = r.basi || {};
    renderTutto();
  }, err => erroreSync('scorte', err));
}

function osservaImportanza(){
  onSnapshot(doc(db, 'households', HOUSEHOLD_ID, 'importanza', 'corrente'), snap => {
    const r = snap.exists() ? snap.data() : {};
    stato.importanza.ingredienti = r.ingredienti || {};
    stato.importanza.basi = r.basi || {};
    renderTutto();
  }, err => erroreSync('importanza', err));
}

function osservaRicetteExtra(){
  onSnapshot(collection(db, 'households', HOUSEHOLD_ID, 'ricetteExtra'), snap => {
    stato.ricetteExtra = snap.docs.map(d => Object.assign({ id: d.id, mia: true }, d.data()));
    ricostruisciPastoById();
    renderTutto();
  }, err => erroreSync('ricette extra', err));
}
function aggiungiRicetta(ricetta){
  return addDoc(collection(db, 'households', HOUSEHOLD_ID, 'ricetteExtra'), Object.assign({ creatoDa: UID, creatoIl: Date.now() }, ricetta));
}
function eliminaRicetta(id){
  deleteDoc(doc(db, 'households', HOUSEHOLD_ID, 'ricetteExtra', id));
}

function osservaWishlist(){
  const q = query(collection(db, 'households', HOUSEHOLD_ID, 'wishlist'), orderBy('creatoIl'));
  onSnapshot(q, snap => {
    stato.wishlist = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderWishlist();
  }, err => erroreSync('wishlist', err));
}
function aggiungiWishlist(nome, link, nota){
  addDoc(collection(db, 'households', HOUSEHOLD_ID, 'wishlist'), { nome, link, nota, creatoIl: Date.now(), creatoDa: UID });
}
function rimuoviWishlist(id){
  deleteDoc(doc(db, 'households', HOUSEHOLD_ID, 'wishlist', id));
}

function impostaPastoExtra(pastoId, campi){
  setDoc(doc(db, 'households', HOUSEHOLD_ID, 'pastiExtra', pastoId), campi, { merge: true });
}
function osservaPastiExtra(){
  onSnapshot(collection(db, 'households', HOUSEHOLD_ID, 'pastiExtra'), snap => {
    const out = {};
    snap.forEach(d => { out[d.id] = d.data(); });
    stato.pastiExtra = out;
    ricostruisciPastoById();
    renderTutto();
  }, err => erroreSync('pasti extra', err));
}

/* ---------- pasto effettivo (dati.js + eventuali override) ---------- */
function pastoEffettivo(p){
  const ex = stato.pastiExtra[p.id] || {};
  return Object.assign({}, p, {
    nome: ex.nome || p.nome,
    tempo: ex.tempo != null ? ex.tempo : p.tempo,
    difficolta: ex.difficolta || p.difficolta,
    ing: ex.ing || p.ing,
    proc: ex.proc != null ? ex.proc : p.proc,
    notaMia: ex.nota || '',
    archiviato: !!ex.archiviato
  });
}

/* ---------- scorte: importanza, presenza, fattibilità ---------- */
function importanzaDefault(nome, isBase){
  if (isBase) return 'fondamentale';
  const m = ING[nome] || {};
  return (m.r === 'spezie' || m.r === 'dispensa') ? 'opzionale' : 'fondamentale';
}
function importanzaDi(nome, isBase){
  const over = isBase ? stato.importanza.basi[nome] : stato.importanza.ingredienti[nome];
  return over || importanzaDefault(nome, isBase);
}
function ceLho(nome, isBase){
  return isBase ? !!stato.scorte.basi[nome] : !!stato.scorte.ingredienti[nome];
}
function impostaScorta(nome, isBase, val){
  const cat = isBase ? stato.scorte.basi : stato.scorte.ingredienti;
  if (val) cat[nome] = true; else delete cat[nome];
  syncScorte((isBase ? 'basi.' : 'ingredienti.') + nome, val ? true : deleteField());
}
// null = non fattibile (manca qualcosa di fondamentale); altrimenti array di nomi "medio" mancanti
function pastoFattibile(p){
  const mancano = [];
  for (const i of (p.ing||[])){
    const isBase = !!i.b, nome = isBase ? i.b : i.n;
    if (!nome || i.qb) continue;
    const imp = importanzaDi(nome, isBase);
    if (imp === 'opzionale') continue;
    if (!ceLho(nome, isBase)){
      if (imp === 'fondamentale') return null;
      mancano.push(isBase ? BASE_BY_ID[nome].breve : nome);
    }
  }
  return mancano;
}
function segnaCucinato(pastoId){
  const p = PASTO_BY_ID[pastoId];
  if (!p) return;
  (p.ing||[]).forEach(i => {
    const isBase = !!i.b, nome = isBase ? i.b : i.n;
    if (!nome || i.qb) return;
    if (importanzaDi(nome, isBase) === 'opzionale') return;
    impostaScorta(nome, isBase, false);
  });
  renderTutto();
  toast('Scorte aggiornate');
}
function segnaBasePreparata(baseId){
  const b = BASE_BY_ID[baseId];
  if (!b) return;
  impostaScorta(baseId, true, true);
  b.ing.forEach(([n]) => {
    if (n[0] === '@') return;
    if (importanzaDi(n, false) === 'opzionale') return;
    impostaScorta(n, false, false);
  });
  renderTutto();
  toast('Scorte aggiornate');
}

let migrazioneControllata = false;
function controllaMigrazione(){
  if (migrazioneControllata) return;
  migrazioneControllata = true;
  let vecchio = null;
  try { const r = localStorage.getItem('dietacosi.v1'); if (r) vecchio = JSON.parse(r); } catch(e){}
  const vuoto = !Object.keys(stato.sel).length && !Object.keys(stato.hoGia).length && !Object.keys(stato.preso).length;
  if (vecchio && vuoto) $('#migra-banner').hidden = false;
}
function importaDatiVecchi(){
  let vecchio = null;
  try { const r = localStorage.getItem('dietacosi.v1'); if (r) vecchio = JSON.parse(r); } catch(e){}
  if (!vecchio) return;
  let sel = vecchio.sel || {};
  Object.keys(sel).forEach(id => { const s = sel[id]; if (s && typeof s === 'object') sel[id] = (s.lei||0)+(s.lui||0); });
  stato.sel = sel; stato.modiBase = vecchio.modiBase||{}; stato.hoGia = vecchio.hoGia||{};
  stato.preso = vecchio.preso||{}; stato.extra = vecchio.extra||[];
  renderTutto();
  syncStato('sel', stato.sel); syncStato('modiBase', stato.modiBase);
  syncStato('hoGia', stato.hoGia); syncStato('preso', stato.preso); syncStato('extra', stato.extra);
  $('#migra-banner').hidden = true;
  toast('Dati importati');
}
function toast(m){
  const t = $('#toast'); t.textContent = m; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2200);
}

/* ---------- helpers di formato ---------- */
const nf = n => {
  const r = Math.round(n * 10) / 10;
  return String(r % 1 === 0 ? r : r.toFixed(1)).replace('.', ',');
};
const fmtG = g => g >= 1000 ? nf(Math.round(g/100)/10) + ' kg' : nf(Math.round(g)) + ' g';
function fmtQ(i){
  if (i.qb) return 'q.b.';
  const v = i.q || 0;
  if (!v) return '—';
  if (i.b) return nf(v) + ' g';
  const m = ING[i.n] || {u:'g'};
  if (m.u === 'pz') return v === 0.5 ? '½' : nf(v);
  if (m.comeSucco) return nf(v) + ' g succo';
  return nf(v) + ' g';
}
function nomeIng(i){
  if (i.b) return esc(BASE_BY_ID[i.b].nome) + '<em>base</em>';
  let s = esc(i.n);
  if (i.soloLei) s += '<em>solo lei</em>';
  if (i.soloLui) s += '<em>solo lui</em>';
  return s;
}
const nPorzioni = () => Object.values(stato.sel).reduce((a,n) => a + (n||0), 0);
const nPasti    = () => Object.values(stato.sel).filter(n => (n||0) > 0).length;

/* ---------- calcolo corrente ---------- */
let CALC = null;
function ricalcola(){
  CALC = calcola(stato.sel, stato.modiBase, {ING, BASI, PASTI: tuttiIPasti()});
  return CALC;
}
function vociSpesa(){                     // ingredienti ordinati per reparto
  const out = [];
  REPARTI.forEach(([k, label]) => {
    const righe = Object.entries(CALC.ing)
      .filter(([n]) => (ING[n]||{r:'dispensa'}).r === k)
      .sort((a,b) => a[0].localeCompare(b[0], 'it'));
    if (righe.length) out.push([k, label, righe]);
  });
  return out;
}

/* ==========================================================================
   VISTA · CATALOGO
   ========================================================================== */
function schedaPasto(p){
  const n = stato.sel[p.id] || 0;
  const attivo = n > 0;
  const aperto = !!stato.aperti[p.id];
  const basi = [...new Set((p.ing||[]).filter(i => i.b).map(i => i.b))];
  const inModifica = modificaAperta === p.id;

  const stepper = () => `<div class="step${n?' on':''}">
      <button data-step="${p.id}|-1" aria-label="Togli una porzione">−</button>
      <span>${n}</span>
      <button data-step="${p.id}|1" aria-label="Aggiungi una porzione">+</button>
    </div>`;

  const righe = (p.ing||[]).map(i => `<div class="riga">
      <span class="ing">${nomeIng(i)}</span>
      <span class="q${(i.q||i.qb)?'':' zero'}">${fmtQ(i)}</span>
    </div>`).join('');

  const vincolo = p.vincolo ? `<div class="vincolo">
      <span class="eyebrow" style="color:var(--harissa)">Il vincolo · lei</span>
      <p>${esc(p.vincolo.lei)}</p>
      <span class="eyebrow" style="color:var(--harissa)">Lui</span>
      <p>${esc(p.vincolo.lui)}</p>
    </div>` : '';
  const nota = p.nota ? `<div class="nota">${esc(p.nota)}</div>` : '';
  const notaMia = p.notaMia ? `<div class="nota">📌 ${esc(p.notaMia)}</div>` : '';

  const modificaForm = !inModifica ? '' : `<div class="modifica-form">
      <input type="text" id="mo-nome" placeholder="Nome" value="${esc(p.nome)}">
      <div style="display:flex;gap:8px;margin-top:8px">
        <input type="number" id="mo-tempo" placeholder="Minuti" value="${p.tempo||''}" style="flex:1">
        <select id="mo-difficolta" style="flex:1;background:var(--pentola);border:1px solid var(--bordo);color:var(--panna);border-radius:9px;padding:10px;font-family:inherit;font-size:15px">
          <option value="">Difficoltà…</option>
          <option value="facile"${p.difficolta==='facile'?' selected':''}>Facile</option>
          <option value="media"${p.difficolta==='media'?' selected':''}>Media</option>
          <option value="difficile"${p.difficolta==='difficile'?' selected':''}>Difficile</option>
        </select>
      </div>
      <textarea id="mo-nota" placeholder="Nota tua (es. senza piccante)" style="margin-top:8px;width:100%;min-height:60px;background:var(--pentola);border:1px solid var(--bordo);color:var(--panna);border-radius:9px;padding:10px;font-family:inherit;font-size:15px">${esc(p.notaMia)}</textarea>

      <div class="eyebrow" style="margin-top:14px">Modalità di cottura</div>
      <textarea id="mo-proc" placeholder="Procedura" style="margin-top:8px;width:100%;min-height:80px;background:var(--pentola);border:1px solid var(--bordo);color:var(--panna);border-radius:9px;padding:10px;font-family:inherit;font-size:15px">${esc(p.proc||'')}</textarea>

      <div class="eyebrow" style="margin-top:14px">Ingredienti</div>
      <div id="mo-ingredienti" style="margin-top:8px">${(p.ing||[]).map(htmlRigaIngrediente).join('')}</div>
      <button type="button" class="btn ghost" id="mo-add-riga" style="margin-top:8px">+ INGREDIENTE</button>

      <div class="riga-btn">
        <button class="btn" data-salva-modifica="${p.id}">SALVA</button>
        <button class="btn ghost" data-annulla-modifica>ANNULLA</button>
      </div>
    </div>`;

  return `<article class="pasto${attivo?' sel':''}${aperto?' aperto':''}" data-id="${p.id}">
    <div class="p-h" data-apri="${p.id}">
      <div class="p-top">
        <div class="p-nome">${esc(p.nome)}</div>
        <svg class="chev" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg>
      </div>
      <div class="p-info">
        <span class="pill"><b>${p.val[0]}</b> kcal · <b>${p.val[1]}</b> g P</span>
        ${stepper()}
      </div>
      <div class="p-meta">
        ${p.tempo ? `<span class="tag tempo">${p.tempo} min</span>` : ''}
        ${p.difficolta ? `<span class="tag diff-${p.difficolta}">${esc(p.difficolta)}</span>` : ''}
        <span class="tag t-${p.tipo}">${TIPO_LABEL[p.tipo]}</span>
        ${p.mia ? '<span class="tag" style="background:rgba(var(--pistacchio-rgb),.16);color:var(--pistacchio)">tua</span>' : ''}
        ${p.nuovo ? '<span class="tag" style="background:rgba(var(--curcuma-rgb),.16);color:var(--curcuma)">nuovo</span>' : ''}
        ${basi.map(b => `<span class="tag base">${esc(BASE_BY_ID[b].breve)}</span>`).join('')}
      </div>
    </div>
    <div class="p-corpo">
      ${p.desc ? `<p class="p-desc">${esc(p.desc)}</p>` : ''}
      ${righe ? `<div class="gram">
        <div class="intest"><span></span><span>Porzione</span></div>
        ${righe}</div>` : ''}
      ${p.proc ? `<div class="proc">${esc(p.proc)}</div>` : ''}
      ${vincolo}${nota}${notaMia}
      ${modificaForm}
      <div class="riga-btn">
        <button class="btn ghost" data-cucinato="${p.id}">L'HO CUCINATO</button>
        ${p.mia
          ? `<button class="btn ghost" data-elimina-ricetta="${p.id}">ELIMINA</button>`
          : `<button class="btn ghost" data-archivia="${p.id}">${p.archiviato ? 'DISARCHIVIA' : 'ARCHIVIA'}</button>`}
        <button class="btn ghost" data-modifica="${p.id}">${inModifica ? 'CHIUDI' : 'MODIFICA'}</button>
      </div>
    </div>
  </article>`;
}

function renderCatalogo(){
  const q = ($('#cerca').value || '').trim().toLowerCase();
  const tutti = tuttiIPasti();
  let lista = tutti.filter(p => {
    if (!!p.archiviato !== !!stato.mostraArchiviati) return false;
    if (stato.filtro !== 'tutti' && p.tipo !== stato.filtro) return false;
    if (!q) return true;
    const testo = [p.nome, p.desc||'', p.proc||'',
      ...(p.ing||[]).map(i => i.b ? BASE_BY_ID[i.b].nome : i.n)].join(' ').toLowerCase();
    return testo.includes(q);
  });

  let gruppi;
  if (stato.grp === 'base'){
    const m = new Map();
    BASI.forEach(b => m.set(b.nome, []));
    m.set('Senza basi', []);
    lista.forEach(p => {
      const basi = [...new Set((p.ing||[]).filter(i => i.b).map(i => BASE_BY_ID[i.b].nome))];
      if (!basi.length) m.get('Senza basi').push(p);
      else basi.forEach(b => m.get(b).push(p));
    });
    gruppi = [...m.entries()];
  } else {
    gruppi = TIPI.map(([k,label]) => [label, lista.filter(p => p.tipo === k)]);
  }

  const html = gruppi.filter(([,ps]) => ps.length).map(([label, ps]) => `
    <div class="sez">
      <div class="sez-h">
        <h2 class="display">${esc(label)}</h2>
        <span class="eyebrow">${ps.length} pasti</span>
      </div>
      ${ps.map(schedaPasto).join('')}
    </div>`).join('');

  $('#pasti-sub').textContent = stato.mostraArchiviati
    ? `${lista.length} pasti archiviati: disarchivia quello che vuoi rifare.`
    : (lista.length === tutti.length
      ? `${tutti.length} pasti, nessun giorno obbligato`
      : `${lista.length} pasti su ${tutti.length}`)
      + ': scegli quelli che vuoi cucinare e la lista fa il resto.';
  $('#vedi-archiviati').textContent = stato.mostraArchiviati ? 'Torna al catalogo' : 'Vedi archiviati';
  $('#catalogo').innerHTML = html || `<div class="vuoto">
    <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
    <p>Nessun pasto trovato.</p></div>`;
}

/* ==========================================================================
   VISTA · LISTA
   ========================================================================== */
function renderLista(){
  const c = $('#lista-corpo');
  if (!nPasti()){
    c.innerHTML = `<div class="vuoto">
      <svg viewBox="0 0 24 24"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/></svg>
      <p>La lista è vuota.<br>Vai su <b>Pasti</b> e aggiungi quello che vuoi cucinare.</p>
      <div class="riga-btn" style="justify-content:center"><button class="btn" data-vai="pasti">SCEGLI I PASTI</button></div>
    </div>`;
    return;
  }
  const v = CALC.val;
  const colazioni = tuttiIPasti().filter(p => p.tipo === 'colazione')
    .reduce((a,p) => a + (stato.sel[p.id]||0), 0);

  const mediaBlocco = () => {
    const gg = colazioni;
    if (!gg) return '';
    const k = Math.round(v[0]/gg), p = Math.round(v[1]/gg);
    const d = k - TARGET.kcal, dp = p - TARGET.p;
    const col = x => x > 0 ? 'var(--harissa)' : 'var(--pistacchio)';
    return `<div style="margin-top:9px">
      <div class="eyebrow">Media su ${gg} giorn${gg===1?'o':'i'}</div>
      <div class="mono" style="font-size:14px;margin-top:4px">
        <b style="font-size:19px">${k}</b> kcal
        <span style="color:${col(d)}">(${d>0?'+':''}${d} vs target)</span>
        · <b style="font-size:19px">${p}</b> g P
        <span style="color:${col(-dp)}">(${dp>0?'+':''}${dp})</span>
      </div></div>`;
  };

  const gruppi = TIPI.map(([k,label]) => [label, tuttiIPasti().filter(p => {
    return !p.archiviato && p.tipo === k && (stato.sel[p.id]||0) > 0;
  })]).filter(([,ps]) => ps.length);

  c.innerHTML = `
    <div class="card">
      <div class="eyebrow">Totale della lista</div>
      <div class="mono" style="margin-top:7px;font-size:14px">
        <span style="color:var(--curcuma)">${Math.round(v[0]).toLocaleString('it')} kcal · ${Math.round(v[1])} g P</span>
      </div>
      ${mediaBlocco()}
      <p class="sub" style="font-size:12.5px;margin-top:11px">La media giornaliera conta una colazione = un giorno. Target: ${TARGET.kcal} kcal / ${TARGET.p} g P.</p>
      <div class="riga-btn">
        <button class="btn" data-vai="spesa">VAI ALLA DISPENSA</button>
        <button class="btn ghost" id="svuota-sel-2">SVUOTA</button>
      </div>
    </div>
    ${gruppi.map(([label, ps]) => `<div class="sez">
      <div class="sez-h"><h2 class="display">${label}</h2><span class="eyebrow">${ps.length}</span></div>
      ${ps.map(schedaPasto).join('')}
    </div>`).join('')}`;
}

/* ==========================================================================
   VISTA · DISPENSA / SPESA
   ========================================================================== */
function renderSpesa(){
  const c = $('#spesa-corpo'), dispensa = stato.passo === 'dispensa';
  $('#spesa-eyebrow').textContent = dispensa ? 'Passo 2' : 'Passo 3';
  $('#spesa-titolo').textContent = dispensa ? 'Dispensa' : 'Spesa';
  $('#spesa-sub').textContent = dispensa
    ? 'Tutto quello che serve per i pasti scelti, basi comprese. Spunta quello che hai già in casa: il resto diventa la lista della spesa.'
    : 'Quello che non hai spuntato nella dispensa. Spunta mano a mano che lo metti nel carrello.';

  if (!nPasti()){
    $('#spesa-azioni').hidden = true;
    $('#barra').style.width = '0%';
    c.innerHTML = `<div class="vuoto">
      <svg viewBox="0 0 24 24"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6L5 3H2"/></svg>
      <p>Prima scegli i pasti.</p>
      <div class="riga-btn" style="justify-content:center"><button class="btn" data-vai="pasti">SCEGLI I PASTI</button></div>
    </div>`;
    return;
  }
  $('#spesa-azioni').hidden = false;

  let tot = 0, fatti = 0;
  const blocchi = vociSpesa().map(([k, label, righe]) => {
    const vis = dispensa ? righe : righe.filter(([n]) => !stato.hoGia[n]);
    if (!vis.length) return '';
    const conta = k !== 'nc';
    const voci = vis.map(([n, q]) => {
      const spuntato = dispensa ? !!stato.hoGia[n] : !!stato.preso[n];
      if (conta){ tot++; if (spuntato) fatti++; }
      const m = ING[n] || {};
      return `<label class="voce${spuntato?' fatta':''}">
        <input type="checkbox" data-sp="${esc(n)}"${spuntato?' checked':''}>
        <span class="n">${esc(n)}${m.nota ? `<small>${esc(m.nota)}</small>` : ''}</span>
        <span class="q">${formatta(n, q, ING)}</span>
      </label>`;
    }).join('');
    return `<div class="rep">
      <div class="rep-h"><h2 class="display">${esc(label)}</h2><span class="eyebrow">${vis.length}</span></div>
      ${voci}</div>`;
  }).join('');

  // voci fuori piano: solo nella lista della spesa
  let extraHtml = '';
  if (!dispensa){
    const voci = stato.extra.map((x, i) => {
      const k = '+' + x;
      const spuntato = !!stato.preso[k];
      tot++; if (spuntato) fatti++;
      return `<label class="voce${spuntato?' fatta':''}">
        <input type="checkbox" data-sp="${esc(k)}"${spuntato?' checked':''}>
        <span class="n">${esc(x)}</span>
        <button class="q" data-delx="${i}" style="background:none;border:0;cursor:pointer;font-size:17px;color:var(--fumo)" aria-label="Togli">×</button>
      </label>`;
    }).join('');
    extraHtml = `<div class="rep">
      <div class="rep-h"><h2 class="display">Fuori piano</h2><span class="eyebrow">${stato.extra.length}</span></div>
      ${voci}
      <div style="display:flex;gap:8px;margin-top:12px">
        <input type="search" id="extra-n" placeholder="Aggiungi (caffè, detersivo…)" aria-label="Voce fuori piano">
        <button class="btn" id="extra-add" style="flex-shrink:0">AGGIUNGI</button>
      </div></div>`;
  }

  c.innerHTML = (blocchi || `<div class="vuoto"><p>Niente da comprare: hai già tutto in dispensa.</p></div>`) + extraHtml;
  const pct = tot ? Math.round(fatti / tot * 100) : 0;
  $('#barra').style.width = pct + '%';
  $('#b-spesa').textContent = dispensa ? '' : String(tot - fatti || '');
}

function testoLista(){
  const d = new Date().toLocaleDateString('it-IT');
  let out = (stato.passo === 'dispensa' ? 'DISPENSA' : 'LISTA DELLA SPESA') + ' — ' + d + '\n';
  vociSpesa().forEach(([k, label, righe]) => {
    const vis = stato.passo === 'dispensa' ? righe : righe.filter(([n]) => !stato.hoGia[n]);
    if (!vis.length || k === 'nc') return;
    out += '\n' + label.toUpperCase() + '\n';
    vis.forEach(([n, q]) => {
      const done = stato.passo === 'dispensa' ? stato.hoGia[n] : stato.preso[n];
      out += (done ? '[x] ' : '[ ] ') + n + ' — ' + formatta(n, q, ING) + '\n';
    });
  });
  if (stato.passo === 'spesa' && stato.extra.length){
    out += '\nFUORI PIANO\n';
    stato.extra.forEach(x => { out += (stato.preso['+'+x] ? '[x] ' : '[ ] ') + x + '\n'; });
  }
  return out;
}

/* ==========================================================================
   VISTA · BASI
   ========================================================================== */
function renderBasi(){
  const c = $('#basi-corpo');
  const attive = BASI.filter(b => CALC.basi[b.id]).sort((a,b) => a.ordine - b.ordine);
  if (!attive.length){
    c.innerHTML = `<div class="vuoto">
      <svg viewBox="0 0 24 24"><path d="M4 11h16v3a6 6 0 01-6 6h-4a6 6 0 01-6-6z"/><path d="M20 12h1.5a2 2 0 010 4H20"/></svg>
      <p>Nessuna base da preparare: i pasti che hai scelto non ne usano.</p>
      <div class="riga-btn" style="justify-content:center"><button class="btn" data-vai="pasti">SCEGLI I PASTI</button></div>
    </div>`;
    return;
  }
  const attMin = attive.reduce((a,b) => a + b.tempoAtt, 0);

  c.innerHTML = `<div class="card">
      <div class="eyebrow">Domenica</div>
      <div class="mono" style="margin-top:6px;font-size:14px"><b style="font-size:22px">${attive.length}</b> preparazioni · <b style="font-size:22px">${attMin}</b> min di lavoro attivo</div>
      <p class="sub" style="font-size:13px">Fai partire il sofrito per primo: è il collo di bottiglia. Legumi e pollo cuociono in parallelo mentre il sofrito riduce.</p>
    </div>` +
    attive.map(b => {
      const v = CALC.basi[b.id];
      const f = v.produci / b.resa;
      const scarso = v.serve > b.resa;
      return `<div class="card">
        <div class="base-h">
          <div style="flex:1;min-width:0">
            <div class="eyebrow">${b.ordine} · ${b.tempoTot} min</div>
            <div class="card-t" style="margin-top:4px">${esc(b.nome)}</div>
            <div class="qta-base">ti servono <b>${fmtG(v.serve)}</b> · produci <b>${fmtG(v.produci)}</b>${v.avanzo > 5 ? ` · avanzano ${fmtG(v.avanzo)}` : ''}${b.pezzi ? ` · ~${Math.ceil(v.produci/(b.resa/b.pezzi))} pezzi` : ''}</div>
          </div>
        </div>
        <div class="seg" style="margin-top:11px;max-width:300px">
          <button data-modo="${b.id}|esatto" aria-pressed="${v.modo==='esatto'}">Quantità esatta</button>
          <button data-modo="${b.id}|intero" aria-pressed="${v.modo==='intero'}">${v.ricette>1?v.ricette+' ricette':'Ricetta intera'}</button>
        </div>
        ${scarso && v.modo === 'esatto' ? `<div class="avviso">Ti serve più di una dose piena (la ricetta base rende ${b.resa} g). Le quantità qui sotto sono già riscalate: verifica che ti stiano in pentola.</div>` : ''}
        <div class="gram" style="margin-top:12px">
          ${b.ing.map(([n,q]) => {
            const nome = n[0] === '@' ? BASE_BY_ID[n.slice(1)].nome + '<em>base</em>' : esc(n);
            const m = n[0] === '@' ? {u:'g'} : (ING[n] || {u:'g'});
            const qq = q * f;
            const testo = m.u === 'pz' ? nf(Math.ceil(qq - 1e-9)) + ' pz' : formatta(n[0]==='@' ? 'x' : n, qq, ING).replace(/ \(.*\)/,'');
            return `<div class="riga" style="grid-template-columns:1fr auto">
              <span class="ing">${nome}</span><span class="q">${testo}</span></div>`;
          }).join('')}
        </div>
        ${b.proc ? `<ol class="passi">${b.proc.map(p => `<li>${esc(p)}</li>`).join('')}</ol>` : ''}
        ${(b.timer||[]).map(([nome,min], i) => {
          const chiave = b.id + '|' + i;
          const att = timersAttivi[chiave];
          const rimasti = att ? Math.max(0, Math.round((att.fine - Date.now())/1000)) : null;
          const testo = att ? esc(nome) + ' · ' + fmtMinSec(rimasti) : esc(nome) + ' · ' + min + '′';
          return `<button class="timer${att?' attivo':''}" data-timer-key="${chiave}" data-timer="${min}" data-nome="${esc(nome)}">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/></svg>
          <span class="timer-testo">${testo}</span></button>`;
        }).join('')}
        ${b.nota ? `<div class="nota">${esc(b.nota)}</div>` : ''}
        <div class="qta-base" style="margin-top:11px">Frigo ${b.conserva[0]} · Freezer ${b.conserva[1]}</div>
        <div class="riga-btn"><button class="btn ghost" data-base-fatta="${b.id}">HO PREPARATO QUESTA BASE</button></div>
      </div>`;
    }).join('');
}

/* più timer possono girare insieme (es. sofritto + pollo + legumi in parallelo);
   sono tenuti per scadenza assoluta (non per un conto alla rovescia su un nodo DOM
   preciso) così sopravvivono a un renderBasi() che ridisegna i pulsanti da zero */
const timersAttivi = {};   // chiave (baseId|indice) -> {nome, min, fine: epoch ms}
let timerInterval = null;
const fmtMinSec = sec => Math.floor(sec/60) + ':' + String(sec % 60).padStart(2,'0');
function trovaBottoneTimer(chiave){
  return $$('.timer[data-timer-key]').find(b => b.dataset.timerKey === chiave);
}
function aggiornaTimerDOM(){
  let ancoraAttivi = false;
  Object.keys(timersAttivi).forEach(chiave => {
    const att = timersAttivi[chiave];
    const rimasti = Math.round((att.fine - Date.now())/1000);
    const btn = trovaBottoneTimer(chiave);
    if (rimasti <= 0){
      delete timersAttivi[chiave];
      toast('Tempo scaduto: ' + att.nome);
      if (btn){ btn.classList.remove('attivo'); const t = btn.querySelector('.timer-testo'); if (t) t.textContent = att.nome + ' · ' + att.min + '′'; }
      return;
    }
    ancoraAttivi = true;
    if (btn){ const t = btn.querySelector('.timer-testo'); if (t) t.textContent = att.nome + ' · ' + fmtMinSec(rimasti); }
  });
  if (!ancoraAttivi && timerInterval){ clearInterval(timerInterval); timerInterval = null; }
}
function avviaTimer(btn){
  const chiave = btn.dataset.timerKey;
  if (timersAttivi[chiave]){ delete timersAttivi[chiave]; aggiornaTimerDOM(); return; }
  const min = +btn.dataset.timer, nome = btn.dataset.nome;
  timersAttivi[chiave] = {nome, min, fine: Date.now() + min * 60000};
  btn.classList.add('attivo');
  if (!timerInterval) timerInterval = setInterval(aggiornaTimerDOM, 1000);
  aggiornaTimerDOM();
}

/* ==========================================================================
   VISTA · SCORTE
   ========================================================================== */
function rigaScorta(nome, isBase){
  const acceso = ceLho(nome, isBase);
  const imp = importanzaDi(nome, isBase);
  const label = isBase ? BASE_BY_ID[nome].nome : nome;
  const chiave = (isBase?'b':'i') + '|' + nome;
  return `<label class="voce${acceso?' fatta':''}">
      <input type="checkbox" data-scorta="${esc(chiave)}"${acceso?' checked':''}>
      <span class="n">${esc(label)}</span>
      <span class="imp-pills">
        <button data-imp="${esc(chiave)}|fondamentale" aria-pressed="${imp==='fondamentale'}" title="Fondamentale">F</button>
        <button data-imp="${esc(chiave)}|medio" aria-pressed="${imp==='medio'}" title="Se manca poco male">M</button>
        <button data-imp="${esc(chiave)}|opzionale" aria-pressed="${imp==='opzionale'}" title="Opzionale">O</button>
      </span>
    </label>`;
}

function renderScorte(){
  const c = $('#scorte-corpo');
  if (!c) return;
  const puoi = [], quasi = [];
  tuttiIPasti().forEach(p => {
    if (p.archiviato) return;
    const mancano = pastoFattibile(p);
    if (mancano === null) return;
    (mancano.length ? quasi : puoi).push([p, mancano]);
  });

  const riga = ([p, mancano]) => `<div class="voce" style="cursor:default">
      <span class="n">${esc(p.nome)}${mancano.length ? `<small>ti manca: ${mancano.map(esc).join(', ')}</small>` : ''}</span>
    </div>`;

  let html = `<div class="card">
    <div class="card-t">Puoi cucinare adesso</div>
    ${(puoi.length || quasi.length) ? '' : '<p class="sub" style="margin-top:6px">Accendi qualche voce qui sotto per vedere cosa ti viene suggerito.</p>'}
    ${puoi.length ? `<div class="rep" style="margin-top:10px">${puoi.map(riga).join('')}</div>` : ''}
    ${quasi.length ? `<div class="rep" style="margin-top:10px"><div class="eyebrow">Quasi — manca poco</div>${quasi.map(riga).join('')}</div>` : ''}
  </div>`;

  REPARTI.forEach(([k,label]) => {
    if (k === 'nc') return;
    const nomi = Object.keys(ING).filter(n => ING[n].r === k).sort((a,b)=>a.localeCompare(b,'it'));
    if (!nomi.length) return;
    html += `<div class="rep"><div class="rep-h"><h2 class="display">${esc(label)}</h2></div>
      ${nomi.map(n => rigaScorta(n, false)).join('')}</div>`;
  });
  html += `<div class="rep"><div class="rep-h"><h2 class="display">Basi</h2></div>
    ${BASI.slice().sort((a,b)=>a.nome.localeCompare(b.nome,'it')).map(b => rigaScorta(b.id, true)).join('')}</div>`;

  c.innerHTML = html;
}

/* ==========================================================================
   FORM · NUOVA RICETTA
   ========================================================================== */
function htmlRigaIngrediente(ing){
  const isBase = !!(ing && ing.b);
  const campo = isBase
    ? `<select class="ing-base">${BASI.map(b => `<option value="${esc(b.id)}"${b.id===ing.b?' selected':''}>${esc(b.nome)}</option>`).join('')}</select>`
    : `<input type="text" class="ing-nome" list="lista-ingredienti" placeholder="Nome" value="${ing&&ing.n?esc(ing.n):''}">`;
  return `<div class="ing-riga">
    <select class="ing-tipo">
      <option value="n"${isBase?'':' selected'}>Ingrediente</option>
      <option value="b"${isBase?' selected':''}>Base</option>
    </select>
    <span class="ing-campo">${campo}</span>
    <input type="number" class="ing-q" placeholder="g" value="${ing&&ing.q?ing.q:''}">
    <button type="button" class="ing-rimuovi" aria-label="Rimuovi">×</button>
  </div>`;
}
function svuotaFormRicetta(){
  $('#nuova-ricetta').hidden = true;
  $('#nr-ingredienti').innerHTML = '';
  ['nr-nome','nr-tempo','nr-kcal','nr-prot','nr-proc','nr-nota'].forEach(id => { $('#'+id).value = ''; });
  $('#nr-difficolta').value = ''; $('#nr-tipo').value = 'colazione';
}

/* ==========================================================================
   VISTA · WISHLIST (pasti da provare)
   ========================================================================== */
function renderWishlist(){
  const c = $('#wishlist-corpo');
  if (!c) return;
  if (!stato.wishlist.length){
    c.innerHTML = `<div class="vuoto">
      <svg viewBox="0 0 24 24"><path d="M12 21s-7-4.35-9.5-8.8C1 8.5 3 5 6.5 5c2 0 3.5 1.3 4 2.7C11 6.3 12.5 5 14.5 5 18 5 20 8.5 18.5 12.2 16 16.65 12 21 12 21z"/></svg>
      <p>Ancora vuota. Aggiungi qui le ricette che vuoi provare.</p></div>`;
  } else {
    c.innerHTML = `<div class="rep">${stato.wishlist.map(w => `<div class="voce" style="cursor:default;align-items:flex-start">
      <span class="n">${esc(w.nome)}
        ${w.link ? `<br><a href="${esc(w.link)}" target="_blank" rel="noopener">${esc(w.link)}</a>` : ''}
        ${w.nota ? `<small>${esc(w.nota)}</small>` : ''}
      </span>
      <button class="q" data-del-wish="${w.id}" style="background:none;border:0;cursor:pointer;font-size:17px;color:var(--fumo)" aria-label="Rimuovi">×</button>
    </div>`).join('')}</div>`;
  }
}

/* ==========================================================================
   VISTA · PESO
   ========================================================================== */
function renderPeso(){
  const membri = {};
  stato.pesi.forEach(x => { membri[x.uid] = x.nome || 'Utente'; });
  membri[UID] = MIO_NOME || 'Tu';
  if (!stato.pesoUid || !(stato.pesoUid in membri)) stato.pesoUid = UID;
  const uid = stato.pesoUid;

  $('#peso-chi').innerHTML = 'Nuova misura · ' + Object.keys(membri).map(u =>
    `<button class="lnk-chi" data-pchi="${u}" style="background:none;border:0;cursor:pointer;font:inherit;letter-spacing:inherit;color:${u===uid?'var(--curcuma)':'var(--fumo)'}">${esc(membri[u].toUpperCase())}</button>`
  ).join(' / ');

  const p = stato.pesi.filter(x => x.uid === uid).sort((a,b) => a.data.localeCompare(b.data));
  const c = $('#p-contenuto');
  if (!p.length){ c.innerHTML = `<div class="vuoto"><p>Nessuna misura ancora.</p></div>`; return; }

  c.innerHTML = `<div class="card">${grafico(p)}${verdetto(p)}</div>
    <div class="card pesi-l">
      <div class="eyebrow" style="border:0">Storico</div>
      ${p.slice().reverse().map(x => `<div>
        <span>${new Date(x.data).toLocaleDateString('it-IT',{day:'2-digit',month:'short'})}</span>
        <span><b>${nf(x.kg)}</b> kg <button data-del-peso="${x.id}" aria-label="Elimina">×</button></span>
      </div>`).join('')}
    </div>`;
}
function grafico(p){
  const W = 700, H = 190, m = {t:16, r:14, b:26, l:40};
  const kg = p.map(x => x.kg);
  let min = Math.min(...kg), max = Math.max(...kg);
  if (max - min < 2){ const c = (max+min)/2; min = c-1; max = c+1; }
  const X = i => m.l + (p.length < 2 ? (W-m.l-m.r)/2 : i*(W-m.l-m.r)/(p.length-1));
  const Y = v => m.t + (max-v)/(max-min)*(H-m.t-m.b);
  const linea = p.map((x,i) => `${i?'L':'M'}${X(i).toFixed(1)},${Y(x.kg).toFixed(1)}`).join('');
  const area = p.length > 1 ? `${linea}L${X(p.length-1).toFixed(1)},${H-m.b}L${X(0).toFixed(1)},${H-m.b}Z` : '';
  const col = 'var(--curcuma)';
  const griglia = [0,.5,1].map(f => {
    const v = min+(max-min)*f, y = Y(v);
    return `<line x1="${m.l}" y1="${y}" x2="${W-m.r}" y2="${y}" stroke="var(--bordo)" stroke-dasharray="3 4"/>
      <text x="${m.l-7}" y="${y+4}" fill="var(--fumo)" font-size="11" text-anchor="end" font-family="monospace">${v.toFixed(1)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto">
    <defs><linearGradient id="gr" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${col}" stop-opacity=".26"/><stop offset="1" stop-color="${col}" stop-opacity="0"/>
    </linearGradient></defs>
    ${griglia}
    ${area ? `<path d="${area}" fill="url(#gr)"/>` : ''}
    <path d="${linea}" fill="none" stroke="${col}" stroke-width="2.2" stroke-linejoin="round"/>
    ${p.map((x,i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(x.kg).toFixed(1)}" r="3.4" fill="var(--pepe)" stroke="${col}" stroke-width="2"/>`).join('')}
  </svg>`;
}
function verdetto(p){
  if (p.length < 4) return `<p class="sub" style="margin-top:10px">Servono almeno 4 misure su due settimane prima che la media dica qualcosa.</p>`;
  // regressione lineare (minimi quadrati) su (giorni trascorsi, kg): una media
  // "prima metà / seconda metà" per numero di misure si disallinea dalla vera
  // finestra temporale se le pesate non sono equispaziate (es. un buco di
  // qualche settimana), producendo un kg/settimana impreciso proprio nel
  // momento in cui guida il consiglio "togli/aggiungi 150 kcal"
  const t0 = new Date(p[0].data).getTime();
  const xs = p.map(x => (new Date(x.data).getTime() - t0) / 86400000);
  const ys = p.map(x => x.kg);
  const n = p.length;
  const mx = xs.reduce((s,x) => s+x, 0)/n, my = ys.reduce((s,y) => s+y, 0)/n;
  let num = 0, den = 0;
  for (let i = 0; i < n; i++){ num += (xs[i]-mx)*(ys[i]-my); den += (xs[i]-mx)**2; }
  const sett = (den ? num/den : 0) * 7;
  let t;
  if (sett > -0.1) t = 'La media non sta calando. Togli ~150 kcal al giorno: 40 g di riso o 20 g di pane.';
  else if (sett < -1.2) t = 'Stai calando troppo in fretta. Aggiungi ~150 kcal: un calo rapido costa massa magra.';
  else t = 'Sei nel range previsto. Non toccare niente.';
  return `<div class="nota" style="margin-top:12px"><b class="mono">${sett > 0 ? '+' : ''}${sett.toFixed(2).replace('.', ',')} kg/settimana</b> — ${t}</div>`;
}

/* ==========================================================================
   ORCHESTRAZIONE
   ========================================================================== */
function renderTutto(){
  ricalcola();
  renderCatalogo(); renderLista(); renderSpesa(); renderBasi(); renderPeso(); renderScorte(); renderWishlist();
  const n = nPorzioni();
  $('#b-lista').textContent = n ? String(n) : '';
}
function vaiA(v){
  $$('nav button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.v === v)));
  $$('.vista').forEach(x => x.classList.toggle('on', x.id === 'v-' + v));
  window.scrollTo({top:0, behavior:'smooth'});
}

/* ---------- eventi ---------- */
document.addEventListener('click', e => {
  const t = e.target;

  const nav = t.closest('nav button');        if (nav){ vaiA(nav.dataset.v); return; }
  const vai = t.closest('[data-vai]');        if (vai){ vaiA(vai.dataset.vai); return; }
  if (t.closest('#tema-switch')){ impostaTema(temaCorrente() === 'chiaro' ? 'scuro' : 'chiaro'); return; }

  const step = t.closest('[data-step]');
  if (step){
    e.preventDefault(); e.stopPropagation();
    const [id, d] = step.dataset.step.split('|');
    const n = Math.max(0, Math.min(28, (stato.sel[id]||0) + (+d)));
    if (n) stato.sel[id] = n; else delete stato.sel[id];
    renderTutto(); syncStato('sel.' + id, n || deleteField()); return;
  }

  const apri = t.closest('[data-apri]');
  if (apri && !t.closest('.step-box')){
    const id = apri.dataset.apri;
    stato.aperti[id] = !stato.aperti[id];
    $$(`.pasto[data-id="${id}"]`).forEach(el => el.classList.toggle('aperto', !!stato.aperti[id]));
    salvaLocale(); return;
  }

  const ft = t.closest('#filtro-tipo button');
  if (ft){ stato.filtro = ft.dataset.f;
    $$('#filtro-tipo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === stato.filtro)));
    renderCatalogo(); salvaLocale(); return; }

  const fv = t.closest('#filtro-vista button');
  if (fv){ stato.grp = fv.dataset.grp;
    $$('#filtro-vista button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.grp === stato.grp)));
    renderCatalogo(); salvaLocale(); return; }

  const ps = t.closest('#passo button');
  if (ps){ stato.passo = ps.dataset.passo;
    $$('#passo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.passo === stato.passo)));
    renderSpesa(); salvaLocale(); return; }

  const modo = t.closest('[data-modo]');
  if (modo){ const [id, m] = modo.dataset.modo.split('|'); stato.modiBase[id] = m; renderTutto(); syncStato('modiBase.' + id, m); return; }

  const tim = t.closest('.timer'); if (tim){ avviaTimer(tim); return; }

  const delPeso = t.closest('[data-del-peso]');
  if (delPeso){ deleteDoc(doc(db, 'households', HOUSEHOLD_ID, 'pesi', delPeso.dataset.delPeso)); return; }

  const pchi = t.closest('[data-pchi]'); if (pchi){ stato.pesoUid = pchi.dataset.pchi; renderPeso(); salvaLocale(); return; }

  const migra = t.closest('[data-migra]');
  if (migra){
    if (migra.dataset.migra === 'si') importaDatiVecchi();
    else $('#migra-banner').hidden = true;
    return;
  }

  const cucinato = t.closest('[data-cucinato]');
  if (cucinato){ segnaCucinato(cucinato.dataset.cucinato); return; }

  const baseFatta = t.closest('[data-base-fatta]');
  if (baseFatta){ segnaBasePreparata(baseFatta.dataset.baseFatta); return; }

  const archivia = t.closest('[data-archivia]');
  if (archivia){
    const id = archivia.dataset.archivia;
    const attuale = PASTO_BY_ID[id].archiviato;
    impostaPastoExtra(id, { archiviato: !attuale });
    toast(attuale ? 'Pasto disarchiviato' : 'Pasto archiviato');
    return;
  }

  const modifica = t.closest('[data-modifica]');
  if (modifica){
    modificaAperta = modificaAperta === modifica.dataset.modifica ? null : modifica.dataset.modifica;
    renderTutto(); return;
  }
  if (t.closest('[data-annulla-modifica]')){ modificaAperta = null; renderTutto(); return; }
  const salvaModifica = t.closest('[data-salva-modifica]');
  if (salvaModifica){
    const id = salvaModifica.dataset.salvaModifica;
    const nome = ($('#mo-nome').value || '').trim();
    const tempo = parseInt($('#mo-tempo').value, 10);
    const difficolta = $('#mo-difficolta').value;
    const nota = ($('#mo-nota').value || '').trim();
    const proc = ($('#mo-proc').value || '').trim();
    const ing = [];
    $$('#mo-ingredienti .ing-riga').forEach(riga => {
      const tipoRiga = riga.querySelector('.ing-tipo').value;
      const q = parseFloat(riga.querySelector('.ing-q').value) || 0;
      if (!q) return;
      if (tipoRiga === 'b'){
        const bSel = riga.querySelector('.ing-base');
        if (bSel) ing.push({ b: bSel.value, q });
      } else {
        const nSel = riga.querySelector('.ing-nome');
        const nomeIngRiga = nSel ? nSel.value.trim() : '';
        if (nomeIngRiga) ing.push({ n: nomeIngRiga, q });
      }
    });
    if (!ing.length){ toast('Serve almeno un ingrediente con quantità'); return; }
    const campi = { ing };
    if (nome) campi.nome = nome;
    if (!isNaN(tempo)) campi.tempo = tempo;
    if (difficolta) campi.difficolta = difficolta;
    if (nota) campi.nota = nota;
    if (proc) campi.proc = proc;
    impostaPastoExtra(id, campi);
    modificaAperta = null;
    toast('Modifiche salvate');
    return;
  }

  const imp = t.closest('[data-imp]');
  if (imp){
    const [tipo, nome, livello] = imp.dataset.imp.split('|');
    const isBase = tipo === 'b';
    const cat = isBase ? stato.importanza.basi : stato.importanza.ingredienti;
    const campo = (isBase ? 'basi.' : 'ingredienti.') + nome;
    if (livello === importanzaDefault(nome, isBase)) { delete cat[nome]; syncImportanza(campo, deleteField()); }
    else { cat[nome] = livello; syncImportanza(campo, livello); }
    renderScorte(); return;
  }

  if (t.closest('#vedi-archiviati')){
    stato.mostraArchiviati = !stato.mostraArchiviati;
    renderCatalogo(); salvaLocale(); return;
  }

  if (t.closest('#nuova-ricetta-toggle')){
    const el = $('#nuova-ricetta');
    el.hidden = !el.hidden;
    if (!el.hidden && !$('#nr-ingredienti').children.length) $('#nr-ingredienti').insertAdjacentHTML('beforeend', htmlRigaIngrediente());
    return;
  }
  if (t.closest('#nr-annulla')){ svuotaFormRicetta(); return; }
  if (t.closest('#nr-add-riga')){
    $('#nr-ingredienti').insertAdjacentHTML('beforeend', htmlRigaIngrediente());
    return;
  }
  if (t.closest('#mo-add-riga')){
    $('#mo-ingredienti').insertAdjacentHTML('beforeend', htmlRigaIngrediente());
    return;
  }
  const rimuoviRiga = t.closest('.ing-rimuovi');
  if (rimuoviRiga){ rimuoviRiga.closest('.ing-riga').remove(); return; }
  if (t.closest('#nr-salva')){
    const nome = ($('#nr-nome').value || '').trim();
    if (!nome){ toast('Serve almeno un nome'); return; }
    const tipo = $('#nr-tipo').value;
    const tempo = parseInt($('#nr-tempo').value, 10);
    const difficolta = $('#nr-difficolta').value;
    const kcal = parseFloat($('#nr-kcal').value) || 0;
    if (!kcal){ toast('Serve una stima delle kcal'); return; }
    const prot = parseFloat($('#nr-prot').value) || 0;
    const proc = ($('#nr-proc').value || '').trim();
    const nota = ($('#nr-nota').value || '').trim();
    const ing = [];
    $$('#nr-ingredienti .ing-riga').forEach(riga => {
      const tipoRiga = riga.querySelector('.ing-tipo').value;
      const q = parseFloat(riga.querySelector('.ing-q').value) || 0;
      if (!q) return;
      if (tipoRiga === 'b'){
        const bSel = riga.querySelector('.ing-base');
        if (bSel) ing.push({ b: bSel.value, q });
      } else {
        const nSel = riga.querySelector('.ing-nome');
        const nomeIngRiga = nSel ? nSel.value.trim() : '';
        if (nomeIngRiga) ing.push({ n: nomeIngRiga, q });
      }
    });
    if (!ing.length){ toast('Aggiungi almeno un ingrediente con quantità'); return; }
    const ricetta = { nome, tipo, val: [kcal, prot], ing };
    if (!isNaN(tempo)) ricetta.tempo = tempo;
    if (difficolta) ricetta.difficolta = difficolta;
    if (proc) ricetta.proc = proc;
    if (nota) ricetta.nota = nota;
    aggiungiRicetta(ricetta);
    svuotaFormRicetta();
    toast('Ricetta aggiunta');
    return;
  }
  const eliminaRic = t.closest('[data-elimina-ricetta]');
  if (eliminaRic){ eliminaRicetta(eliminaRic.dataset.eliminaRicetta); return; }

  if (t.closest('#wish-add')){
    const nome = ($('#wish-nome').value || '').trim();
    if (!nome) { toast('Serve almeno un nome'); return; }
    let link = ($('#wish-link').value || '').trim();
    if (link && !/^https?:\/\//i.test(link)) link = 'https://' + link;
    const nota = ($('#wish-nota').value || '').trim();
    aggiungiWishlist(nome, link, nota);
    $('#wish-nome').value = ''; $('#wish-link').value = ''; $('#wish-nota').value = '';
    return;
  }
  const delWish = t.closest('[data-del-wish]');
  if (delWish){ rimuoviWishlist(delWish.dataset.delWish); return; }

  if (t.closest('#carica-settimana')){
    PASTI.forEach(p => stato.sel[p.id] = 2);
    renderTutto(); syncStato('sel', stato.sel); toast('Settimana intera caricata: 27 pasti'); vaiA('lista'); return;
  }
  if (t.closest('#svuota-sel') || t.closest('#svuota-sel-2')){
    stato.sel = {}; stato.hoGia = {}; stato.preso = {}; renderTutto();
    syncStato('sel', {}); syncStato('hoGia', {}); syncStato('preso', {});
    toast('Lista svuotata'); return;
  }
  if (t.closest('#extra-add')){
    const v = ($('#extra-n').value || '').trim();
    if (!v) return;
    if (!stato.extra.includes(v)) stato.extra.push(v);
    $('#extra-n').value = ''; renderSpesa();
    if (HOUSEHOLD_ID) updateDoc(doc(db, 'households', HOUSEHOLD_ID, 'stato', 'corrente'), { extra: arrayUnion(v) })
      .catch(err => erroreSync('stato condiviso', err));
    return;
  }
  const dx = t.closest('[data-delx]');
  if (dx){ const i = +dx.dataset.delx; const v = stato.extra[i];
    delete stato.preso['+' + v];
    stato.extra.splice(i,1); renderSpesa();
    if (HOUSEHOLD_ID) updateDoc(doc(db, 'households', HOUSEHOLD_ID, 'stato', 'corrente'),
      'extra', arrayRemove(v), new FieldPath('preso', '+' + v), deleteField())
      .catch(err => erroreSync('stato condiviso', err));
    return; }

  if (t.closest('#reset-spunte')){
    const campo = stato.passo === 'dispensa' ? 'hoGia' : 'preso';
    if (stato.passo === 'dispensa') stato.hoGia = {}; else stato.preso = {};
    renderSpesa(); syncStato(campo, {}); toast('Spunte azzerate'); return;
  }
  if (t.closest('#copia')){
    const testo = testoLista();
    (navigator.clipboard ? navigator.clipboard.writeText(testo) : Promise.reject())
      .then(() => toast('Lista copiata negli appunti'))
      .catch(() => { const ta = document.createElement('textarea'); ta.value = testo;
        document.body.appendChild(ta); ta.select();
        try{ document.execCommand('copy'); toast('Lista copiata'); }catch(_){ toast('Copia non riuscita'); }
        ta.remove(); });
    return;
  }
  if (t.closest('#stampa')){ window.print(); return; }

  if (t.closest('#p-salva')){
    const d = $('#p-data').value, kg = parseFloat($('#p-kg').value);
    if (!d || !kg){ toast('Serve data e peso'); return; }
    addDoc(collection(db, 'households', HOUSEHOLD_ID, 'pesi'), { uid: UID, nome: MIO_NOME, data: d, kg });
    $('#p-kg').value = ''; toast('Misura salvata'); return;
  }
});

document.addEventListener('change', e => {
  if (e.target.classList.contains('ing-tipo')){
    const riga = e.target.closest('.ing-riga');
    const campo = riga.querySelector('.ing-campo');
    campo.innerHTML = e.target.value === 'b'
      ? `<select class="ing-base">${BASI.map(b => `<option value="${esc(b.id)}">${esc(b.nome)}</option>`).join('')}</select>`
      : `<input type="text" class="ing-nome" list="lista-ingredienti" placeholder="Nome">`;
    return;
  }

  const scorta = e.target.closest('[data-scorta]');
  if (scorta){
    const [tipo, nome] = scorta.dataset.scorta.split('|');
    impostaScorta(nome, tipo === 'b', scorta.checked);
    scorta.closest('.voce').classList.toggle('fatta', scorta.checked);
    return;
  }

  const sp = e.target.closest('[data-sp]');
  if (!sp) return;
  const n = sp.dataset.sp;
  const extra = n[0] === '+';
  const campoMappa = stato.passo === 'dispensa' ? 'hoGia' : 'preso';
  const mappa = stato.passo === 'dispensa' ? stato.hoGia : stato.preso;
  if (sp.checked) mappa[n] = true; else delete mappa[n];
  if (stato.passo === 'dispensa' && sp.checked) delete stato.preso[n];
  if (stato.passo === 'spesa' && sp.checked && !extra) impostaScorta(n, false, true);
  sp.closest('.voce').classList.toggle('fatta', sp.checked);
  // ricalcola solo la barra, senza ridisegnare (per non perdere lo scroll)
  let tot = 0, fatti = 0;
  const mp = stato.passo === 'dispensa' ? stato.hoGia : stato.preso;
  vociSpesa().forEach(([k, , righe]) => {
    if (k === 'nc') return;
    (stato.passo === 'dispensa' ? righe : righe.filter(([x]) => !stato.hoGia[x]))
      .forEach(([x]) => { tot++; if (mp[x]) fatti++; });
  });
  if (stato.passo === 'spesa') stato.extra.forEach(x => { tot++; if (stato.preso['+'+x]) fatti++; });
  $('#barra').style.width = (tot ? Math.round(fatti/tot*100) : 0) + '%';
  $('#b-spesa').textContent = stato.passo === 'dispensa' ? '' : String(tot - fatti || '');
  // le voci "fuori piano" sono testo libero: il nome può contenere un punto, che
  // in un percorso puntato verrebbe letto come una chiave annidata, quindi qui
  // serve FieldPath invece della stringa 'preso.'+n usata per gli ingredienti normali
  if (extra){
    if (HOUSEHOLD_ID) updateDoc(doc(db, 'households', HOUSEHOLD_ID, 'stato', 'corrente'), new FieldPath('preso', n), sp.checked ? true : deleteField())
      .catch(err => erroreSync('stato condiviso', err));
  } else {
    syncStato(campoMappa + '.' + n, sp.checked ? true : deleteField());
    if (stato.passo === 'dispensa' && sp.checked) syncStato('preso.' + n, deleteField());
  }
});

$('#cerca').addEventListener('input', () => renderCatalogo());
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.id === 'extra-n'){ e.preventDefault(); $('#extra-add').click(); }
});

/* ---------- avvio ---------- */
if (window.self !== window.top) {
  const a = document.createElement('a');
  a.href = location.href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = 'Apri a schermo intero ↗';
  a.style.cssText = 'display:block;text-align:center;font-family:JetBrains Mono,monospace;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--curcuma);background:var(--pentola);border-bottom:1px solid var(--bordo);padding:8px;text-decoration:none';
  document.body.insertBefore(a, document.body.firstChild);
}
quandoPronto(() => {
  caricaLocale();
  aggiornaBottoneTema();
  $('#filtro-tipo').innerHTML = [['tutti','Tutti'], ...TIPI]
    .map(([k,l]) => `<button data-f="${k}" aria-pressed="${stato.filtro===k}">${l}</button>`).join('');
  $$('#filtro-tipo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === stato.filtro)));
  $$('#filtro-vista button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.grp === stato.grp)));
  $$('#passo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.passo === stato.passo)));
  $('#p-data').value = new Date().toISOString().slice(0,10);
  $('#lista-ingredienti').innerHTML = Object.keys(ING).sort((a,b)=>a.localeCompare(b,'it'))
    .map(n => `<option value="${esc(n)}">`).join('');
  osservaCondiviso();
  osservaPesi();
  osservaScorte();
  osservaImportanza();
  osservaPastiExtra();
  osservaWishlist();
  osservaRicetteExtra();
});
