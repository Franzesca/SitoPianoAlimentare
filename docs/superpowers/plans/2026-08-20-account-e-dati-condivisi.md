# Account e dati condivisi (Firebase) — Implementation Plan

> **For agentic workers:** eseguito inline, come il piano precedente — tocca
> shell.html/build.js/app.js in modo interdipendente.

**Goal:** sostituire `localStorage` con Firebase (Auth + Firestore) per lei e il suo
ragazzo: login vero, dati di pianificazione condivisi in tempo reale, peso personale
attribuito automaticamente a chi è loggato.

**Architecture:** l'app resta file statici. Un unico `<script type="module">`
concatena (in ordine) `firebase-config.js` + `auth.js` + `dati.js` + `motore.js` +
`app.js` — stessa filosofia "tutto nello stesso scope" già usata oggi, solo con
`import` degli SDK Firebase da CDN in testa. `auth.js` gestisce login/registrazione/
collegamento famiglia e nasconde/mostra l'app; `app.js` scrive su Firestore invece che
`localStorage` per i dati condivisi, mantiene `localStorage` solo per le preferenze
di visualizzazione locali.

**Tech Stack:** Firebase JS SDK 10.14.1 (moduli ES da `www.gstatic.com`, nessun
bundler). Progetto Firebase reale già creato dall'utente (config fornita).

## Global Constraints

- Le chiavi Firebase in `firebase-config.js` sono pubbliche per design — la
  sicurezza è nelle regole Firestore, non vanno protette come un segreto.
- Nessun dato condiviso deve essere leggibile/scrivibile da un utente che non
  appartiene allo stesso household — verificato dalle regole in `firestore.rules`.
- Non toccare `PASTI`/`BASI`/`ING`/`calcola()` in questo lavoro: restano statici da
  `dati.js`, `node sorgenti/test.js` deve continuare a passare invariato.
- Config Firebase reale dell'utente:
  ```
  apiKey: "AIzaSyD-F0SxPfxUEjani2Ut6SVMWiQlFzingRw"
  authDomain: "pianoalimentarecosi.firebaseapp.com"
  projectId: "pianoalimentarecosi"
  storageBucket: "pianoalimentarecosi.firebasestorage.app"
  messagingSenderId: "329656659620"
  appId: "1:329656659620:web:ed92e49adff650c3970031"
  ```

---

## Task 1 — `sorgenti/firebase-config.js` (nuovo)

**Files:** Create: `sorgenti/firebase-config.js`

- [ ] **Step 1: scrivere il file**

```js
/* Chiavi del progetto Firebase — pubbliche per design: la sicurezza vera è nelle
   regole di Firestore (firestore.rules), non nel nasconderle. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD-F0SxPfxUEjani2Ut6SVMWiQlFzingRw",
  authDomain: "pianoalimentarecosi.firebaseapp.com",
  projectId: "pianoalimentarecosi",
  storageBucket: "pianoalimentarecosi.firebasestorage.app",
  messagingSenderId: "329656659620",
  appId: "1:329656659620:web:ed92e49adff650c3970031"
};
```

---

## Task 2 — `firestore.rules` (nuovo, alla radice del progetto)

**Files:** Create: `firestore.rules`

- [ ] **Step 1: scrivere le regole**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function ilMioHousehold() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.householdId;
    }
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /households/{hid} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && ilMioHousehold() == hid;
    }
    match /households/{hid}/stato/{doc} {
      allow read, write: if request.auth != null && ilMioHousehold() == hid;
    }
    match /households/{hid}/pesi/{doc} {
      allow read: if request.auth != null && ilMioHousehold() == hid;
      allow create: if request.auth != null && ilMioHousehold() == hid
        && request.resource.data.uid == request.auth.uid;
      allow delete: if request.auth != null && ilMioHousehold() == hid
        && resource.data.uid == request.auth.uid;
    }
  }
}
```

- [ ] **Step 2: pubblicarle (azione manuale utente)**

Console Firebase → Firestore Database → scheda **Rules** → incolla il contenuto di
`firestore.rules` → **Pubblica**. Non posso farlo da qui: richiede la vostra
console. Segnalo questo step come bloccante per la Task 10 (verifica dal vivo).

---

## Task 3 — `sorgenti/auth.js` (nuovo)

**Files:** Create: `sorgenti/auth.js`

**Interfaces:**
- Produce: variabili di modulo `UID`, `HOUSEHOLD_ID`, `MIO_NOME`, `db` (istanza
  Firestore), oggetti Firestore importati (`doc`, `setDoc`, `getDoc`, `deleteDoc`,
  `collection`, `addDoc`, `onSnapshot`, `query`, `orderBy`) — tutti riferibili per
  nome da `app.js` perché concatenati nello stesso modulo. Funzione
  `quandoPronto(cb)` che `app.js` usa per rimandare il proprio avvio a dopo che
  login + household sono risolti.
- Consuma: `FIREBASE_CONFIG` da `firebase-config.js` (Task 1, stesso scope);
  elementi DOM `#gate`, `#gate-carica`, `#gate-login`, `#gate-registrati`,
  `#gate-famiglia`, `#gate-codice`, `#app-shell` e i relativi campi (Task 4).

- [ ] **Step 1: scrivere il file**

```js
/* ==========================================================================
   Autenticazione e household condiviso (Firebase)
   ========================================================================== */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, deleteDoc, addDoc, collection,
  onSnapshot, query, orderBy
} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';

const fbApp = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);

let UID = null;
let HOUSEHOLD_ID = null;
let MIO_NOME = '';
let _onPronto = null;
let _pronto = false;
function quandoPronto(cb){ _onPronto = cb; }
function segnalaPronto(){
  document.getElementById('gate').hidden = true;
  document.getElementById('app-shell').hidden = false;
  if (_pronto) return;
  _pronto = true;
  if (_onPronto) _onPronto();
}

function mostraGate(id){
  ['gate-carica','gate-login','gate-registrati','gate-famiglia','gate-codice'].forEach(g => {
    document.getElementById(g).hidden = (g !== id);
  });
  document.getElementById('gate').hidden = false;
  document.getElementById('app-shell').hidden = true;
}
function mostraErrore(id, msg){
  const el = document.getElementById(id);
  el.textContent = msg; el.hidden = false;
}
function erroreLeggibile(err){
  const c = (err && err.code) || '';
  if (c === 'auth/invalid-email') return 'Email non valida.';
  if (c === 'auth/email-already-in-use') return 'Questa email ha già un account: prova ad accedere.';
  if (c === 'auth/weak-password') return 'La password deve avere almeno 6 caratteri.';
  if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found') return 'Email o password sbagliate.';
  return 'Qualcosa non ha funzionato: ' + ((err && err.message) || err);
}

async function dopoLogin(user){
  UID = user.uid;
  const s = await getDoc(doc(db, 'users', UID));
  const dati = s.exists() ? s.data() : null;
  MIO_NOME = (dati && dati.nome) || '';
  if (dati && dati.householdId){
    HOUSEHOLD_ID = dati.householdId;
    segnalaPronto();
  } else {
    mostraGate('gate-famiglia');
  }
}

onAuthStateChanged(auth, user => { if (user) dopoLogin(user); else mostraGate('gate-login'); });

document.getElementById('gate-login').addEventListener('submit', async e => {
  e.preventDefault();
  document.getElementById('li-errore').hidden = true;
  try {
    await signInWithEmailAndPassword(auth, document.getElementById('li-email').value.trim(), document.getElementById('li-pw').value);
  } catch(err){ mostraErrore('li-errore', erroreLeggibile(err)); }
});

document.getElementById('gate-registrati').addEventListener('submit', async e => {
  e.preventDefault();
  document.getElementById('re-errore').hidden = true;
  const nome = document.getElementById('re-nome').value.trim();
  const email = document.getElementById('re-email').value.trim();
  const pw = document.getElementById('re-pw').value;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, pw);
    await setDoc(doc(db, 'users', cred.user.uid), { email, nome, householdId: null });
  } catch(err){ mostraErrore('re-errore', erroreLeggibile(err)); }
});

document.getElementById('vai-registrati').addEventListener('click', e => { e.preventDefault(); mostraGate('gate-registrati'); });
document.getElementById('vai-login').addEventListener('click', e => { e.preventDefault(); mostraGate('gate-login'); });

document.getElementById('crea-famiglia').addEventListener('click', async () => {
  const ref = doc(collection(db, 'households'));
  await setDoc(ref, { creatoDa: UID, creatoIl: Date.now() });
  await setDoc(doc(db, 'users', UID), { householdId: ref.id }, { merge: true });
  HOUSEHOLD_ID = ref.id;
  document.getElementById('codice-testo').textContent = ref.id;
  mostraGate('gate-codice');
});

document.getElementById('unisci-famiglia').addEventListener('click', async () => {
  document.getElementById('fa-errore').hidden = true;
  const codice = document.getElementById('fa-codice').value.trim();
  if (!codice) return;
  try {
    const s = await getDoc(doc(db, 'households', codice));
    if (!s.exists()) throw new Error('Codice non valido: controlla di averlo copiato tutto.');
    await setDoc(doc(db, 'users', UID), { householdId: codice }, { merge: true });
    HOUSEHOLD_ID = codice;
    segnalaPronto();
  } catch(err){ mostraErrore('fa-errore', err.message || erroreLeggibile(err)); }
});

document.getElementById('copia-codice').addEventListener('click', () => {
  const codice = document.getElementById('codice-testo').textContent;
  (navigator.clipboard ? navigator.clipboard.writeText(codice) : Promise.reject()).catch(()=>{});
});
document.getElementById('continua-app').addEventListener('click', segnalaPronto);

document.getElementById('esci').addEventListener('click', () => { signOut(auth); location.reload(); });
```

> Nota: `location.reload()` dopo il logout è deliberato — è il modo più semplice e
> sicuro di azzerare i listener Firestore attivi e lo stato in memoria senza dover
> gestire manualmente l'unsubscribe di ogni `onSnapshot`.

- [ ] **Step 2: verifica sintattica**

`node --check` non gestisce bene i moduli ES con estensione `.js` senza contesto —
verificalo invece con:
Run: `node -e "require('vm').Script(require('fs').readFileSync('sorgenti/auth.js','utf8'), {importModuleDynamically:true})" ` — se questo comando dà errori di parsing diversi da quelli legati a `import`/`document` non definito, c'è un problema di sintassi da correggere. In alternativa, apri `cucina.html` nel browser dopo la Task 9 (build) e controlla la console sviluppatore: eventuali errori di sintassi in `auth.js` bloccano l'intero script e si vedono subito lì — è la verifica più affidabile per codice pensato per girare nel browser, non in Node.

---

## Task 4 — `sorgenti/shell.html`: schermata di accesso

**Files:** Modify: `sorgenti/shell.html`

- [ ] **Step 1: aggiungere il markup del gate**

Subito dopo `<body>` (prima di `<header>`), inserisci:

```html
<div id="gate">
  <div class="gate-box">
    <div class="logo" style="margin-bottom:18px">Cucina<span>.</span></div>

    <div id="gate-carica"><p class="sub">Un attimo…</p></div>

    <form id="gate-login" hidden>
      <h2 class="display" style="font-size:20px">Accedi</h2>
      <input type="email" id="li-email" placeholder="Email" required autocomplete="email">
      <input type="password" id="li-pw" placeholder="Password" required autocomplete="current-password">
      <button class="btn" type="submit" style="width:100%;margin-top:8px">ACCEDI</button>
      <p class="sub" style="margin-top:12px">Non hai un account? <a href="#" id="vai-registrati">Registrati</a></p>
      <p class="gate-errore" id="li-errore" hidden></p>
    </form>

    <form id="gate-registrati" hidden>
      <h2 class="display" style="font-size:20px">Registrati</h2>
      <input type="text" id="re-nome" placeholder="Il tuo nome" required autocomplete="name">
      <input type="email" id="re-email" placeholder="Email" required autocomplete="email">
      <input type="password" id="re-pw" placeholder="Password (almeno 6 caratteri)" required autocomplete="new-password" minlength="6">
      <button class="btn" type="submit" style="width:100%;margin-top:8px">REGISTRATI</button>
      <p class="sub" style="margin-top:12px">Hai già un account? <a href="#" id="vai-login">Accedi</a></p>
      <p class="gate-errore" id="re-errore" hidden></p>
    </form>

    <div id="gate-famiglia" hidden>
      <h2 class="display" style="font-size:20px">Ultimo passo</h2>
      <p class="sub">Sei la prima persona della coppia a usare l'app, o ti stai unendo a chi ha già iniziato?</p>
      <button class="btn" id="crea-famiglia" style="width:100%;margin-top:14px">CREA UNA FAMIGLIA NUOVA</button>
      <p class="sub" style="margin-top:18px">Oppure incolla il codice che ti ha mandato il tuo compagno/a:</p>
      <input type="text" id="fa-codice" placeholder="Codice famiglia">
      <button class="btn ghost" id="unisci-famiglia" style="width:100%;margin-top:8px">UNISCITI</button>
      <p class="gate-errore" id="fa-errore" hidden></p>
    </div>

    <div id="gate-codice" hidden>
      <h2 class="display" style="font-size:20px">Fatto!</h2>
      <p class="sub">Manda questo codice al tuo compagno/a — lo incolla una volta sola per unirsi:</p>
      <div class="gate-codice-box" id="codice-testo"></div>
      <button class="btn" id="copia-codice" style="width:100%;margin-top:10px">COPIA CODICE</button>
      <button class="btn ghost" id="continua-app" style="width:100%;margin-top:8px">CONTINUA</button>
    </div>
  </div>
</div>

<div id="app-shell" hidden>
```

- [ ] **Step 2: chiudere il nuovo contenitore**

Il `<div id="app-shell">` aperto sopra deve chiudersi subito prima di `</body>`.
Individua la fine del file (dopo `<div id="toast" ...></div>`, prima di
`<script>`) e verifica che l'ordine sia: contenuto esistente (header, wrap, nav,
toast) → `</div>` di chiusura per `app-shell` → `<script type="module">`.
Nello stesso punto, aggiungi anche il banner di migrazione dati come primo figlio
di `<section class="vista on" id="v-pasti">` (subito dopo l'apertura del tag),
prima di `<div class="eyebrow">Catalogo</div>`:

```html
    <div class="card" id="migra-banner" hidden>
      <div class="card-t">Hai dati salvati su questo telefono</div>
      <p class="sub" style="margin-top:6px">Vuoi importarli nella famiglia condivisa? Si fa una volta sola.</p>
      <div class="riga-btn">
        <button class="btn" data-migra="si">IMPORTA</button>
        <button class="btn ghost" data-migra="no">IGNORA</button>
      </div>
    </div>
```

- [ ] **Step 3: aggiungere il pulsante "Esci" in header**

Nel blocco `<div class="hbar">`, dopo `<div class="logo">Cucina<span>.</span></div>`,
aggiungi:

```html
    <button id="esci" class="btn ghost" style="padding:6px 11px;font-size:10.5px">ESCI</button>
```

- [ ] **Step 4: cambiare il tag script in modulo**

Trova (in fondo al file):
```html
<script>
/*__DATI__*/
/*__MOTORE__*/
/*__APP__*/
</script>
```
Sostituisci con:
```html
<script type="module">
/*__FIREBASE_CONFIG__*/
/*__AUTH__*/
/*__DATI__*/
/*__MOTORE__*/
/*__APP__*/
</script>
```

- [ ] **Step 5: CSS per il gate**

Aggiungi in fondo al blocco `<style>` (prima di `</style>`):

```css
/* ---------- gate (login/registrazione/famiglia) ---------- */
#gate{position:fixed;inset:0;z-index:100;background:var(--pepe);display:flex;
  align-items:center;justify-content:center;padding:20px}
.gate-box{width:100%;max-width:360px}
.gate-box input{background:var(--pentola);border:1px solid var(--bordo);color:var(--panna);
  border-radius:9px;padding:11px 13px;font-family:inherit;font-size:15px;width:100%;margin-top:10px}
.gate-box input:focus{outline:2px solid var(--accento);outline-offset:-1px}
.gate-errore{color:var(--harissa);font-size:13px;margin-top:10px}
.gate-codice-box{font-family:'JetBrains Mono',monospace;font-size:13px;word-break:break-all;
  background:var(--pentola);border:1px solid var(--bordo);border-radius:9px;padding:12px;margin-top:10px}
</style>
```

(Nota: `</style>` c'è già nel file — l'istruzione sopra intende "incolla questo
blocco CSS subito prima della riga `</style>` esistente", non duplicare il tag.)

- [ ] **Step 6: rigenerare**

Run: `cd sorgenti && node build.js` — atteso: nessun errore (i nuovi segnaposto
Task 5 devono esistere prima che questo passo produca un file corretto — se lo
esegui prima della Task 5, `/*__FIREBASE_CONFIG__*/` e `/*__AUTH__*/` restano
letterali nell'output: normale, correggilo rieseguendo dopo la Task 5).

---

## Task 5 — `sorgenti/build.js`: nuovi segnaposto

**Files:** Modify: `sorgenti/build.js`

- [ ] **Step 1: aggiungere le due nuove sostituzioni**

Sostituisci:
```js
inserisci('/*__DATI__*/',   'dati.js',   strip);
inserisci('/*__MOTORE__*/', 'motore.js', strip);
inserisci('/*__APP__*/',    'app.js',    s => s);
```
con:
```js
inserisci('/*__FIREBASE_CONFIG__*/', 'firebase-config.js', s => s);
inserisci('/*__AUTH__*/',            'auth.js',            s => s);
inserisci('/*__DATI__*/',            'dati.js',             strip);
inserisci('/*__MOTORE__*/',          'motore.js',           strip);
inserisci('/*__APP__*/',             'app.js',              s => s);
```

---

## Task 6 — `sorgenti/app.js`: persistenza su Firestore

**Files:** Modify: `sorgenti/app.js`

**Interfaces:**
- Consuma: `db`, `doc`, `setDoc`, `getDoc`, `deleteDoc`, `addDoc`, `collection`,
  `onSnapshot`, `query`, `orderBy`, `UID`, `HOUSEHOLD_ID`, `MIO_NOME`,
  `quandoPronto` da `auth.js` (Task 3, stesso scope di modulo).

- [ ] **Step 1: sostituire il blocco stato + persistenza**

Sostituisci (righe 11-30 circa):
```js
/* ---------- stato + persistenza ---------- */
const CHIAVE = 'dietacosi.v1';
let stato = {
  grp:'tipo', filtro:'tutti', passo:'dispensa',
  sel:{}, modiBase:{}, hoGia:{}, preso:{}, pesi:[], pesoChi:'lei', aperti:{}, extra:[]
};
function salva(){
  try { localStorage.setItem(CHIAVE, JSON.stringify(stato)); } catch(e){}
}
function carica(){
  try {
    const r = localStorage.getItem(CHIAVE);
    if (r) stato = Object.assign(stato, JSON.parse(r));
  } catch(e){}
  // migrazione da vecchie selezioni {lei,lui} a un contatore singolo
  Object.keys(stato.sel).forEach(id => {
    const s = stato.sel[id];
    if (s && typeof s === 'object') stato.sel[id] = (s.lei||0) + (s.lui||0);
  });
}
```
con:
```js
/* ---------- stato + persistenza ---------- */
const CHIAVE_UI = 'dietacosi.ui.v1';
let stato = {
  grp:'tipo', filtro:'tutti', passo:'dispensa',
  sel:{}, modiBase:{}, hoGia:{}, preso:{}, pesi:[], pesoUid:null, aperti:{}, extra:[]
};
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
}

let salvaCondivisoTimer = null;
function salvaCondiviso(){
  if (!HOUSEHOLD_ID) return;
  clearTimeout(salvaCondivisoTimer);
  salvaCondivisoTimer = setTimeout(() => {
    const { sel, modiBase, hoGia, preso, extra } = stato;
    setDoc(doc(db, 'households', HOUSEHOLD_ID, 'stato', 'corrente'), { sel, modiBase, hoGia, preso, extra });
  }, 400);
}

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
  });
}

function osservaPesi(){
  const q = query(collection(db, 'households', HOUSEHOLD_ID, 'pesi'), orderBy('data'));
  onSnapshot(q, snap => {
    stato.pesi = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderPeso();
  });
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
  renderTutto(); salvaCondiviso();
  $('#migra-banner').hidden = true;
  toast('Dati importati');
}
```

- [ ] **Step 2: `fmtQ`/`nomeIng`/`nPorzioni`/`nPasti` restano invariati** — non li
  tocca questa task, solo verifica che siano ancora presenti così come sono oggi
  (righe 42-60 circa), la Task non li modifica.

- [ ] **Step 3: sostituire la sezione Peso**

Sostituisci l'intero blocco (dal commento `VISTA · PESO` fino alla fine di
`verdetto()`, righe 403-462 circa):
```js
/* ==========================================================================
   VISTA · PESO
   ========================================================================== */
function renderPeso(){
  const chi = stato.pesoChi;
  $('#peso-chi').innerHTML = `Nuova misura ·
    <button class="lnk-chi" data-pchi="lei" style="background:none;border:0;cursor:pointer;font:inherit;letter-spacing:inherit;color:${chi==='lei'?'var(--curcuma)':'var(--fumo)'}">LEI</button> /
    <button class="lnk-chi" data-pchi="lui" style="background:none;border:0;cursor:pointer;font:inherit;letter-spacing:inherit;color:${chi==='lui'?'var(--pistacchio)':'var(--fumo)'}">LUI</button>`;

  const p = stato.pesi.filter(x => x.chi === chi).sort((a,b) => a.d.localeCompare(b.d));
  const c = $('#p-contenuto');
  if (!p.length){ c.innerHTML = `<div class="vuoto"><p>Nessuna misura ancora.</p></div>`; return; }

  c.innerHTML = `<div class="card">${grafico(p, chi)}${verdetto(p)}</div>
    <div class="card pesi-l">
      <div class="eyebrow" style="border:0">Storico</div>
      ${p.slice().reverse().map(x => `<div>
        <span>${new Date(x.d).toLocaleDateString('it-IT',{day:'2-digit',month:'short'})}</span>
        <span><b>${nf(x.kg)}</b> kg <button data-del="${x.chi}|${x.d}" aria-label="Elimina">×</button></span>
      </div>`).join('')}
    </div>`;
}
function grafico(p, chi){
  const W = 700, H = 190, m = {t:16, r:14, b:26, l:40};
  const kg = p.map(x => x.kg);
  let min = Math.min(...kg), max = Math.max(...kg);
  if (max - min < 2){ const c = (max+min)/2; min = c-1; max = c+1; }
  const X = i => m.l + (p.length < 2 ? (W-m.l-m.r)/2 : i*(W-m.l-m.r)/(p.length-1));
  const Y = v => m.t + (max-v)/(max-min)*(H-m.t-m.b);
  const linea = p.map((x,i) => `${i?'L':'M'}${X(i).toFixed(1)},${Y(x.kg).toFixed(1)}`).join('');
  const area = p.length > 1 ? `${linea}L${X(p.length-1).toFixed(1)},${H-m.b}L${X(0).toFixed(1)},${H-m.b}Z` : '';
  const col = chi === 'lei' ? 'var(--curcuma)' : 'var(--pistacchio)';
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
  const meta = Math.ceil(p.length/2);
  const a = p.slice(0, meta), b = p.slice(-meta);
  const ma = a.reduce((s,x) => s+x.kg, 0)/a.length, mb = b.reduce((s,x) => s+x.kg, 0)/b.length;
  const gg = (new Date(p.at(-1).d) - new Date(p[0].d))/86400000 || 7;
  const sett = (mb-ma)/(gg/2/7 || 1);
  let t;
  if (sett > -0.1) t = 'La media non sta calando. Togli ~150 kcal al giorno: 40 g di riso o 20 g di pane.';
  else if (sett < -1.2) t = 'Stai calando troppo in fretta. Aggiungi ~150 kcal: un calo rapido costa massa magra.';
  else t = 'Sei nel range previsto. Non toccare niente.';
  return `<div class="nota" style="margin-top:12px"><b class="mono">${sett > 0 ? '+' : ''}${sett.toFixed(2).replace('.', ',')} kg/settimana</b> — ${t}</div>`;
}
```
con:
```js
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
  const meta = Math.ceil(p.length/2);
  const a = p.slice(0, meta), b = p.slice(-meta);
  const ma = a.reduce((s,x) => s+x.kg, 0)/a.length, mb = b.reduce((s,x) => s+x.kg, 0)/b.length;
  const gg = (new Date(p.at(-1).data) - new Date(p[0].data))/86400000 || 7;
  const sett = (mb-ma)/(gg/2/7 || 1);
  let t;
  if (sett > -0.1) t = 'La media non sta calando. Togli ~150 kcal al giorno: 40 g di riso o 20 g di pane.';
  else if (sett < -1.2) t = 'Stai calando troppo in fretta. Aggiungi ~150 kcal: un calo rapido costa massa magra.';
  else t = 'Sei nel range previsto. Non toccare niente.';
  return `<div class="nota" style="margin-top:12px"><b class="mono">${sett > 0 ? '+' : ''}${sett.toFixed(2).replace('.', ',')} kg/settimana</b> — ${t}</div>`;
}
```

- [ ] **Step 4: `renderTutto()` non salva più da sola**

Sostituisci:
```js
function renderTutto(){
  ricalcola();
  renderCatalogo(); renderLista(); renderSpesa(); renderBasi(); renderPeso();
  const n = nPorzioni();
  $('#b-lista').textContent = n ? String(n) : '';
  salva();
}
```
con:
```js
function renderTutto(){
  ricalcola();
  renderCatalogo(); renderLista(); renderSpesa(); renderBasi(); renderPeso();
  const n = nPorzioni();
  $('#b-lista').textContent = n ? String(n) : '';
}
```

- [ ] **Step 5: aggiornare tutti i gestori di eventi**

Nel gestore `click` principale, applica queste sostituzioni (una per una, sono
tutte nello stesso blocco `document.addEventListener('click', e => { ... })`):

a) Step (porzioni) — invariata la logica, aggiungi il salvataggio condiviso:
```js
  const step = t.closest('[data-step]');
  if (step){
    e.preventDefault(); e.stopPropagation();
    const [id, d] = step.dataset.step.split('|');
    const n = Math.max(0, Math.min(28, (stato.sel[id]||0) + (+d)));
    if (n) stato.sel[id] = n; else delete stato.sel[id];
    renderTutto(); salvaCondiviso(); return;
  }
```

b) Apri scheda (locale):
```js
  const apri = t.closest('[data-apri]');
  if (apri && !t.closest('.step-box')){
    const id = apri.dataset.apri;
    stato.aperti[id] = !stato.aperti[id];
    $$(`.pasto[data-id="${id}"]`).forEach(el => el.classList.toggle('aperto', !!stato.aperti[id]));
    salvaLocale(); return;
  }
```

c) Filtro tipo / filtro vista / passo (locali) — in ciascuno dei tre blocchi,
sostituisci la chiamata finale `salva();` con `salvaLocale();` (stessa struttura,
cambia solo il nome della funzione chiamata):
```js
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
```

d) Modo base (condiviso):
```js
  const modo = t.closest('[data-modo]');
  if (modo){ const [id, m] = modo.dataset.modo.split('|'); stato.modiBase[id] = m; renderTutto(); salvaCondiviso(); return; }
```

e) Elimina peso — sostituisci interamente (cambia da `data-del` a
`data-del-peso`, ora una `deleteDoc` invece di un filtro locale):
```js
  const delPeso = t.closest('[data-del-peso]');
  if (delPeso){ deleteDoc(doc(db, 'households', HOUSEHOLD_ID, 'pesi', delPeso.dataset.delPeso)); return; }
```

f) Selettore persona nel grafico peso (locale, ora per uid):
```js
  const pchi = t.closest('[data-pchi]'); if (pchi){ stato.pesoUid = pchi.dataset.pchi; renderPeso(); salvaLocale(); return; }
```

g) Carica settimana intera (condiviso):
```js
  if (t.closest('#carica-settimana')){
    PASTI.forEach(p => stato.sel[p.id] = 2);
    renderTutto(); salvaCondiviso(); toast('Settimana intera caricata: 27 pasti'); vaiA('lista'); return;
  }
```

h) Svuota selezione (condiviso):
```js
  if (t.closest('#svuota-sel') || t.closest('#svuota-sel-2')){
    stato.sel = {}; stato.hoGia = {}; stato.preso = {}; renderTutto(); salvaCondiviso(); toast('Lista svuotata'); return;
  }
```

i) Aggiungi voce extra (condiviso):
```js
  if (t.closest('#extra-add')){
    const v = ($('#extra-n').value || '').trim();
    if (!v) return;
    if (!stato.extra.includes(v)) stato.extra.push(v);
    $('#extra-n').value = ''; renderSpesa(); salvaCondiviso(); return;
  }
```

j) Elimina voce extra (condiviso):
```js
  const dx = t.closest('[data-delx]');
  if (dx){ const i = +dx.dataset.delx;
    delete stato.preso['+' + stato.extra[i]];
    stato.extra.splice(i,1); renderSpesa(); salvaCondiviso(); return; }
```

k) Reset spunte (condiviso):
```js
  if (t.closest('#reset-spunte')){
    if (stato.passo === 'dispensa') stato.hoGia = {}; else stato.preso = {};
    renderSpesa(); salvaCondiviso(); toast('Spunte azzerate'); return;
  }
```

l) Salva nuova misura di peso — sostituisci interamente (ora `addDoc` invece di
push nell'array locale; niente più selettore "per chi", si attribuisce sempre
all'utente loggato):
```js
  if (t.closest('#p-salva')){
    const d = $('#p-data').value, kg = parseFloat($('#p-kg').value);
    if (!d || !kg){ toast('Serve data e peso'); return; }
    addDoc(collection(db, 'households', HOUSEHOLD_ID, 'pesi'), { uid: UID, nome: MIO_NOME, data: d, kg });
    $('#p-kg').value = ''; toast('Misura salvata'); return;
  }
```

m) Banner di migrazione (nuovo, aggiungilo come nuovo blocco prima della chiusura
`});` del gestore click):
```js
  const migra = t.closest('[data-migra]');
  if (migra){
    if (migra.dataset.migra === 'si') importaDatiVecchi();
    else $('#migra-banner').hidden = true;
    return;
  }
```

- [ ] **Step 6: gestore `change` (spunte dispensa/spesa) — condiviso**

Sostituisci l'ultima riga del gestore `change` (era `salva();`) con
`salvaCondiviso();`:
```js
document.addEventListener('change', e => {
  const sp = e.target.closest('[data-sp]');
  if (!sp) return;
  const n = sp.dataset.sp;
  const mappa = stato.passo === 'dispensa' ? stato.hoGia : stato.preso;
  if (sp.checked) mappa[n] = true; else delete mappa[n];
  if (stato.passo === 'dispensa' && sp.checked) delete stato.preso[n];
  sp.closest('.voce').classList.toggle('fatta', sp.checked);
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
  salvaCondiviso();
});
```

- [ ] **Step 7: riscrivere l'avvio**

Sostituisci l'intero blocco finale (da `/* ---------- avvio ---------- */` alla
fine del file):
```js
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
carica();
$('#filtro-tipo').innerHTML = [['tutti','Tutti'], ...TIPI]
  .map(([k,l]) => `<button data-f="${k}" aria-pressed="${stato.filtro===k}">${l}</button>`).join('');
$$('#filtro-vista button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.grp === stato.grp)));
$$('#passo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.passo === stato.passo)));
$('#p-data').value = new Date().toISOString().slice(0,10);
renderTutto();
```
con:
```js
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
  $('#filtro-tipo').innerHTML = [['tutti','Tutti'], ...TIPI]
    .map(([k,l]) => `<button data-f="${k}" aria-pressed="${stato.filtro===k}">${l}</button>`).join('');
  $$('#filtro-tipo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.f === stato.filtro)));
  $$('#filtro-vista button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.grp === stato.grp)));
  $$('#passo button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.passo === stato.passo)));
  $('#p-data').value = new Date().toISOString().slice(0,10);
  osservaCondiviso();
  osservaPesi();
});
```

> Nota: `renderTutto()` iniziale non viene più chiamato esplicitamente qui — parte
> da solo al primo evento `onSnapshot` di `osservaCondiviso()`, che scatta quasi
> subito (dalla cache locale di Firestore se offline, dal server appena disponibile).

- [ ] **Step 8: correggere il refuso preesistente "soffritto" → "sofrito"**

In `renderBasi()`, riga con `Fai partire il soffritto per primo`: cambia
`soffritto` in `sofrito` (in entrambe le occorrenze della stessa riga), per
coerenza con il nome usato ovunque nei dati e nei documenti.

---

## Task 7 — verifica sintattica e build

**Files:** nessuna modifica, solo verifica.

- [ ] **Step 1**

Run: `node --check sorgenti/app.js` — atteso: nessun errore.

- [ ] **Step 2**

Run: `cd sorgenti && node build.js` — atteso: `Scritto ../cucina.html (NN.N KB)`
senza errori, e la dimensione del file cresce (nuovo codice auth incluso).

- [ ] **Step 3**

Run: `node sorgenti/test.js` — atteso: `Tutte le verifiche passano.` (questo
progetto non tocca `dati.js`/`motore.js`, deve restare verde).

---

## Task 8 — `CLAUDE.md`: documentare la nuova architettura

**Files:** Modify: `CLAUDE.md`

- [ ] **Step 1**

Aggiungi una sezione dopo "Come si lavora su cucina.html":

```markdown
## Account e dati condivisi

Dal 2026-08-20 l'app richiede login (Firebase Auth) e i dati di pianificazione
(pasti scelti, dispensa, spesa, basi) sono condivisi in tempo reale tra i due
account collegati allo stesso "household" — non più `localStorage` come unica
fonte. Il peso resta personale, attribuito automaticamente a chi è loggato.

- `sorgenti/firebase-config.js` — chiavi del progetto Firebase (pubbliche per
  design, la sicurezza è nelle regole Firestore).
- `sorgenti/auth.js` — login, registrazione, creazione/adesione a un household
  tramite codice condiviso, gestisce la schermata di accesso.
- `firestore.rules` (radice del progetto) — regole di sicurezza: un utente legge/
  scrive solo l'household a cui il proprio profilo è collegato, e scrive solo il
  proprio peso. Da pubblicare manualmente sulla console Firebase dopo ogni modifica.
- In `sorgenti/app.js`, `stato.sel/modiBase/hoGia/preso/extra` vivono ora su
  Firestore (`households/{id}/stato/corrente`, sincronizzato con `onSnapshot`);
  `stato.pesi` vive in `households/{id}/pesi` (una collezione, non un documento
  solo); `stato.aperti/grp/filtro/passo` restano in `localStorage` — sono
  preferenze del dispositivo, non dati da condividere.
- `localStorage['dietacosi.v1']` (il vecchio formato) resta leggibile solo per la
  migrazione una tantum al primo accesso — non è più scritto da nessuna parte.
```

---

## Task 9 — verifica dal vivo (richiede il vostro progetto Firebase)

**Files:** nessuna modifica.

- [ ] **Step 1: pubblicare le regole** (Task 2, Step 2 — se non ancora fatto).

- [ ] **Step 2: aprire `cucina.html` nel browser**, registrarsi con la prima
  email, creare la famiglia, copiare il codice.

- [ ] **Step 3: in una finestra in incognito** (o un altro browser), registrarsi
  con una seconda email, incollare il codice per unirsi.

- [ ] **Step 4: verifica di sincronizzazione** — da una finestra, seleziona un
  pasto; controlla che appaia nell'altra entro un secondo, senza ricaricare.

- [ ] **Step 5: verifica del peso** — salva una misura da entrambe le finestre,
  controlla che il selettore in alto mostri entrambi i nomi e che ciascuno veda
  la propria storia di default.

- [ ] **Step 6: verifica sicurezza (facoltativa ma consigliata)** — da una terza
  finestra in incognito con un terzo account NON collegato a nessuna famiglia,
  apri la console sviluppatore e prova a leggere `households/<codice-vostro>` —
  atteso: errore di permessi.

---

## Self-review

- Copertura spec: schema Firestore, collegamento famiglia, sicurezza, migrazione,
  peso personale, comportamento offline (gestito automaticamente dall'SDK, nessun
  codice dedicato necessario) → tutti coperti nei task sopra.
- Placeholder: il codice è completo ovunque; l'unico punto "bloccante" esplicito è
  la pubblicazione delle regole (Task 2 Step 2) e la verifica dal vivo (Task 9),
  che richiedono azioni sulla console Firebase dell'utente, non azioni mie.
- Coerenza: `HOUSEHOLD_ID`/`UID`/`MIO_NOME`/`db` definiti in Task 3 sono usati con
  lo stesso nome in Task 6 ovunque; `stato.pesoUid` sostituisce coerentemente
  `stato.pesoChi` in tutti i punti che lo referenziavano.
