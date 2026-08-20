# Google Sites + porzione unica + tempo/difficoltà — Implementation Plan

> **For agentic workers:** eseguito inline nella stessa sessione (non subagent-driven): il lavoro tocca dati.js, motore.js, app.js, shell.html, test.js e due documenti markdown in modo fortemente interdipendente — un solo esecutore con contesto completo riduce il rischio di incoerenze tra file.

**Goal:** rendere `cucina.html` incorporabile in Google Sites, unificare le porzioni Lei/Lui del piano pasti (lui adotta le grammature di lei, resta solo la differenza crudo/cotto), e aggiungere tempo+difficoltà come dettagli visibili accanto al titolo di ogni pasto.

**Architecture:** dati.js resta la fonte strutturata; ogni ingrediente di pasto passa da `{lei,lui}` a un singolo `{q:...}` con due flag opzionali (`soloLei`, `soloLui`) per le finiture non condivise; motore.js perde il doppio accumulatore lei/lui; app.js e shell.html si semplificano di conseguenza; i due documenti markdown e CLAUDE.md vengono riallineati con i numeri **verificati dal motore**, non ricalcolati a mano.

**Tech Stack:** Node.js (nessuna dipendenza esterna), HTML/CSS/JS vanilla.

## Global Constraints

- Non inventare valori nutrizionali: ogni kcal/proteina/grammo deve derivare dai documenti autorevoli esistenti o dal motore di calcolo — mai da una stima mia ad hoc.
- Le rese delle 14 basi domenicali (`BASI` in dati.js) **non si toccano**.
- La scheda Peso resta a due persone, invariata.
- `node sorgenti/test.js` deve risultare pulito (nessuna divergenza) a fine lavoro.
- Dopo ogni modifica a `sorgenti/*.js` o `sorgenti/shell.html`, rigenerare con `node build.js` dalla cartella `sorgenti/`.

---

## Tabella di conversione — riferimento per Task 2

Regola generale: ogni ingrediente `{lei:A, lui:B}` → `{q:A}` (grammatura di lei per
entrambi), **tranne** dove uno dei due lati era 0 nei dati originali:
- `A>0, B=0` → `{q:A, soloLei:true}` (finitura a crudo, resta solo a lei).
- `A=0, B>0` → sostituto cotto/frullato di lui: `{q:B_ridotto, soloLui:true}`.
  Tre soli casi nell'intero piano (elencati sotto); altrove non esistono voci
  lui-esclusive.
- `qb:true` (quanto basta, es. peperoncino) resta `{q:0, qb:true}`, nessun flag.

**Le tre eccezioni lui-esclusive:**
| Pasto | Ingrediente | Vecchio (solo lui) | Nuovo | Motivo |
|---|---|---|---|---|
| `mer-pra` | Salsa di peperoni (base) | 60 g | **40 g**, `soloLui` | scalato con lo stesso rapporto di riduzione del falafel condiviso (230/340 ≈ 0,68 → 60×0,68≈40) |
| `mer-cen` | Cipolle dorate (stufate) | 60 g | **40 g**, `soloLui` | stesso rapporto sul pulled chicken condiviso (150/220 ≈ 0,68 → 60×0,68≈40) |
| `sab-pra` | Vellutata (base) | 250 g | **250 g** (invariata), `soloLui` | unico pasto già dichiarato "differenza visibile"; ricalcolarla richiederebbe inventare una conversione kcal — resta com'è, con nota |

`val` (kcal, proteine) diventa un singolo array `[kcal,p]` per **tutti i 26
pasti**: uso ovunque il valore che oggi è quello di lei. Unica nota
informativa (non un secondo numero): `sab-pra`, dove il contorno di lui
(vellutata) pesa comunque un po' di più della sua insalata — lo dico in un
`nota`, come già fatto per `ven-pra`.

`TARGET` passa da `{lei:{...}, lui:{...}}` a `{kcal:1450, p:115}`.

**Pulizia dati:** "Tortilla integrale grande" non è più referenziata da
nessun pasto (mar-col, mer-pra, gio-col usavano media per lei / grande per
lui — ora tutti e tre usano media) → rimossa dal registro `ING`.

**Testi da correggere** (numeri incorporati nella prosa, non nei dati
strutturati):
1. `lun-cen`, vincolo lui: "I suoi 200 g" → "I suoi 150 g" (spinaci ora
   uguali).
2. `mer-pra`, vincolo lui: "falafel (6 pezzi)" → "falafel (4 pezzi)";
   rimuovere la frase sugli 80 g di pulled chicken (non più aggiunto).
3. `mer-cen`, vincolo lui: "60 g di cipolla stufata" → "40 g di cipolla
   stufata".
4. `ven-pra`, nota: riscrivere togliendo il doppio delta lei/kg lui e il
   riferimento a "a testa" (target ora unico).
5. `dom-cen`, desc: "~600 kcal lei, ~800 kcal lui" → "~600 kcal" (budget
   unico).
6. `sab-pra`: aggiungere un `nota` che segnala l'asimmetria residua
   (vellutata vs insalata) senza quantificarla.

---

## Task 1 — motore.js: nuovo motore a porzione singola

**Files:**
- Modify: `sorgenti/motore.js`

**Interfaces:**
- Produce: `calcola(selezione, modiBase, DATI)` dove `selezione = {pastoId: n}`
  (n = porzioni totali, non più `{lei,lui}`). Ritorna
  `{ing, basi, val:[kcal,p], usoPasti}` (val non più diviso per persona).
- Consuma: `DATI.PASTI[i].ing` con voci `{n?, b?, q, soloLei?, soloLui?, qb?}`,
  `DATI.PASTI[i].val = [kcal,p]`, `DATI.ING[nome]` (invariato).

- [ ] **Step 1: riscrivere `calcola()`**

Sostituisci il corpo di `calcola` in `sorgenti/motore.js` (righe 21-73 circa)
con:

```js
/*  selezione: { pastoId: n }   n = numero di porzioni totali (entrambi insieme)
    modiBase:  { idBase: 'esatto' | 'intero' }
    ritorna: {ing:{nome:qta}, basi:{id:{serve,produci}}, val:[kcal,p]}  */
function calcola(selezione, modiBase, DATI){
  const {BASI, PASTI, ING} = DATI;
  const {perId, prof} = costruisciIndici(BASI);

  const ing  = {};                 // ingrediente crudo -> quantità
  const need = {};                 // base -> grammi richiesti
  const val  = [0, 0];
  const usoPasti = {};             // base -> grammi richiesti dai soli pasti

  const add = (nome, q) => { if (q) ing[nome] = (ing[nome]||0) + q; };

  PASTI.forEach(p => {
    const n = selezione[p.id] || 0;
    if (!n) return;
    val[0] += p.val[0] * n;
    val[1] += p.val[1] * n;
    (p.ing||[]).forEach(i => {
      // le finiture non condivise valgono solo per metà delle porzioni:
      // in ogni coppia di porzioni, una sola delle due persone la riceve.
      const molt = (i.soloLei || i.soloLui) ? Math.round(n / 2) : n;
      const q = (i.q || 0) * molt;
      if (!q || i.qb) return;
      if (i.b){ need[i.b] = (need[i.b]||0) + q; usoPasti[i.b] = (usoPasti[i.b]||0) + q; }
      else     { add(i.n, q); }
    });
  });

  // risolvi le basi dalla più "esterna" alla più "interna"
  const ordine = BASI.slice().sort((a,b) => prof[b.id] - prof[a.id]);
  const basi = {};
  ordine.forEach(b => {
    const serve = need[b.id] || 0;
    if (!serve) return;
    const modo = (modiBase && modiBase[b.id])
      || ((serve < 200 && serve < b.resa * 0.5) ? 'intero' : 'esatto');
    const ricette = Math.max(1, Math.ceil(serve / b.resa - 1e-9));
    const produci = modo === 'intero' ? ricette * b.resa : serve;
    basi[b.id] = {serve, produci, modo, ricette, avanzo: produci - serve};
    const f = produci / b.resa;
    b.ing.forEach(([n, q]) => {
      if (n[0] === '@') need[n.slice(1)] = (need[n.slice(1)]||0) + q * f;
      else add(n, q * f);
    });
  });

  return {ing, basi, val, usoPasti};
}
```

- [ ] **Step 2: verifica sintattica**

Run: `node -e "require('./sorgenti/motore.js')"`
Expected: nessun output, nessun errore.

- [ ] **Step 3: commit** (facoltativo, il progetto non è un repo git — annota
  solo come punto di ripristino manuale se serve)

---

## Task 2 — dati.js: registro ingredienti, 26 pasti, TARGET

**Files:**
- Modify: `sorgenti/dati.js`

**Interfaces:**
- Produce: `ING` (senza "Tortilla integrale grande"), `PASTI` (26 voci con
  `ing`/`val` nel nuovo formato), `TARGET = {kcal:1450, p:115}`.
- Consuma: nessuna dipendenza da altri task.

- [ ] **Step 1: rimuovere "Tortilla integrale grande" da `ING`**

In `sorgenti/dati.js`, elimina la riga:
```js
  'Tortilla integrale grande':  {r:'pane', u:'pz', pz:70},
```

- [ ] **Step 2: riscrivere l'intero array `PASTI`**

Sostituisci l'intero blocco `const PASTI = [ ... ];` (dalla riga del commento
`/* ---------- 3. I pasti ... */` fino alla chiusura `];` prima di `// nomi
corti`) con il contenuto seguente. `desc`, `proc`, `tipo`, `g`, `id`, `nome`
restano quelli originali salvo dove indicato; cambiano solo `ing`, `val`,
`vincolo` (dove elencato) e le `nota` elencate nella tabella sopra.

```js
/* ---------- 3. I pasti ---------------------------------------------------
   ing: {b:'idBase'|n:'Nome ingrediente', q, soloLei?, soloLui?, qb?}
   q = quantità per persona (entrambi mangiano la stessa cosa).
   soloLei = finitura a crudo che resta solo nel piatto di lei.
   soloLui = equivalente cotto/frullato che resta solo nel piatto di lui.
   qb: true = quanto basta (non pesa sulla lista)
   ------------------------------------------------------------------------ */
const PASTI = [
/* ============================ LUNEDÌ ============================ */
{ id:'lun-col', nome:'Uova alla pizzaiola', tipo:'colazione', g:0,
  tempo:10, difficolta:'facile',
  desc:'Le uova affogate nel soffritto ridotto, con origano e peperoncino. Il pane serve a raccogliere, non a riempire.',
  val:[400,25],
  ing:[{b:'soffritto',q:120},{n:'Uova',q:2},{n:'Albumi',q:2},
       {n:'Pane integrale',q:20},{n:'Olio EVO',q:4},
       {n:'Origano secco',q:1},{n:'Peperoncino',q:0,qb:true}],
  proc:'Scalda il soffritto in padella con l\'olio e l\'origano, 3 minuti, finché non si asciuga e comincia a sfrigolare ai bordi. Sbatti gli albumi con le uova intere e versali sopra. Non mescolare: copri e lascia rapprendere 4-5 minuti a fuoco medio-basso. Peperoncino sopra, pane tostato a parte.' },

{ id:'lun-pra', nome:'Chili di ceci e fagioli neri con riso', tipo:'pranzo', g:0,
  tempo:8, difficolta:'facile',
  desc:'Dalla base. Si scalda e si finisce, 6 minuti in tutto.',
  val:[460,20],
  ing:[{b:'chili',q:280},{b:'riso',q:100},
       {n:'Yogurt greco 0%',q:40},{n:'Lime',q:10},
       {n:'Cipolla rossa',q:20,soloLei:true},{n:'Coriandolo fresco',q:5,soloLei:true}],
  proc:'Scalda il chili in padella, non nel microonde: ci vogliono 5 minuti ma si asciuga e si concentra invece di diventare acquoso. Riso a fianco, non sotto.',
  vincolo:{lei:'Cipolla rossa cruda a fettine sottilissime, coriandolo spezzettato a mano, lime spremuto sopra alla fine.',
           lui:'Niente cipolla e niente coriandolo. Il lime va spremuto dentro il chili durante gli ultimi 2 minuti di cottura — la nota acida arriva lo stesso, ma cotta. Yogurt e una spolverata di peperoncino sopra.'} },

{ id:'lun-cen', nome:'Curry di sovracosce con spinaci, e vellutata a fianco', tipo:'cena', g:0,
  tempo:45, difficolta:'media',
  desc:'L\'unico pasto della settimana con le sovracosce crude. Brasate, non saltate.',
  val:[515,43],
  ing:[{b:'soffritto',q:100},{b:'vellutata',q:150},
       {n:'Sovracosce di pollo disossate senza pelle',q:150},
       {n:'Spinaci freschi',q:150},{n:'Latte di cocco light',q:50},
       {n:'Olio EVO',q:4},{n:'Zenzero fresco',q:5},{n:'Aglio',q:5},
       {n:'Garam masala',q:3},{n:'Curcuma',q:2}],
  proc:'Taglia le sovracosce in pezzi da 4 cm. Rosolale nell\'olio a fuoco alto 4 minuti, tirale fuori. Nella stessa padella: zenzero, aglio, spezie, 40 secondi finché non profumano. Unisci soffritto e latte di cocco, rimetti il pollo, coperchio, fuoco basso, 35 minuti. Gli spinaci entrano negli ultimi minuti.',
  vincolo:{lei:'I suoi 150 g di spinaci vanno appassiti 40 secondi a fine cottura, restano foglia.',
           lui:'I suoi 150 g vanno cotti a parte 15 minuti e frullati dentro la salsa prima di rimettere il pollo. La salsa diventa verde scura e cremosa. Sono gli stessi spinaci, cambia solo quando entrano e in che forma.'} },

{ id:'lun-spu', nome:'Skyr, cacao e mandorle', tipo:'spuntino', g:0,
  tempo:2, difficolta:'facile',
  val:[155,21],
  ing:[{n:'Skyr 0%',q:170},{n:'Mandorle',q:10},
       {n:'Cacao amaro',q:4},{n:'Cannella',q:1}] },

/* ============================ MARTEDÌ =========================== */
{ id:'mar-col', nome:'Breakfast burrito', tipo:'colazione', g:1,
  tempo:12, difficolta:'media',
  desc:'Si arrotolano stretti e si scaldano in padella asciutta finché non sigillano.',
  val:[420,27],
  ing:[{b:'fagioli',q:70},
       {n:'Tortilla integrale media',q:1},
       {n:'Uova',q:2},{n:'Albumi',q:1},
       {n:'Formaggio magro grattugiato',q:20},{n:'Passata di pomodoro',q:40},
       {n:'Cumino',q:2},{n:'Olio EVO',q:3},
       {n:'Pomodoro fresco',q:40,soloLei:true},{n:'Coriandolo fresco',q:5,soloLei:true}],
  proc:'Schiaccia i fagioli con la forchetta, cumino e sale, scaldali 2 minuti. Strapazza le uova morbide, toglile dal fuoco quando sono ancora lucide. Farcisci la tortilla: fagioli, uova, formaggio, salsa. Arrotola stretto e rimetti in padella asciutta 90 secondi per lato, la chiusura sotto.',
  vincolo:{lei:'Salsa cruda — 40 g di passata con pomodoro fresco a dadini e coriandolo.',
           lui:'Stessa passata cotta in padella 8 minuti con un pizzico di cumino, poi frullata liscia.'} },

{ id:'mar-pra', nome:'Pasta al ragù fatto al coltello', tipo:'pranzo', g:1,
  tempo:12, difficolta:'facile',
  val:[465,32],
  ing:[{b:'ragu',q:150},{n:'Pasta secca integrale',q:60},
       {n:'Grana grattugiato',q:8}],
  proc:'Scalda il ragù in padella larga. Scola la pasta 2 minuti prima del tempo e mantecala nel ragù con due cucchiai di acqua di cottura, 60 secondi a fuoco vivo. Grana fuori dal fuoco.' },

{ id:'mar-cen', nome:'Harira e tacchino alla piastra', tipo:'cena', g:1,
  tempo:40, difficolta:'media',
  desc:'Zuppa marocchina. Già conforme al vincolo per costruzione: cuoce 40 minuti e si disfa tutto.',
  val:[470,44],
  ing:[{b:'soffritto',q:120},{b:'ceci',q:100},
       {n:'Lenticchie rosse secche',q:40},{n:'Petto di tacchino',q:130},
       {n:'Passata di pomodoro',q:80},{n:'Brodo (o acqua)',q:250},
       {n:'Pane integrale',q:25},{n:'Zenzero fresco',q:4},
       {n:'Curcuma',q:2},{n:'Cannella',q:1},
       {n:'Limoni',q:10},{n:'Olio EVO',q:4}],
  proc:'soffritto, spezie e olio in pentola, 2 minuti. Unisci lenticchie rosse, ceci, passata e brodo. 35 minuti a fuoco basso: le lenticchie rosse devono sparire e addensare la zuppa. Limone alla fine, a fuoco spento. Il tacchino a fette spesse, piastra rovente, 3 minuti per lato, tagliato a strisce sopra la zuppa.',
  nota:'Già conforme al vincolo. Nessuna variante.' },

{ id:'mar-spu', nome:'Ricotta, semi di zucca e miele', tipo:'spuntino', g:1,
  tempo:2, difficolta:'facile',
  val:[220,17],
  ing:[{n:'Ricotta magra',q:130},{n:'Semi di zucca',q:8},{n:'Miele',q:5}] },

/* =========================== MERCOLEDÌ ========================== */
{ id:'mer-col', nome:'Anda bhurji', tipo:'colazione', g:2,
  tempo:10, difficolta:'facile',
  desc:'Uova strapazzate indiane. Il soffritto fa da base, le spezie tostate a secco fanno il resto.',
  val:[395,25],
  ing:[{b:'soffritto',q:100},{n:'Uova',q:2},{n:'Albumi',q:2},
       {n:'Pane integrale',q:25},{n:'Olio EVO',q:4},
       {n:'Cumino in semi',q:2},{n:'Curcuma',q:2},
       {n:'Coriandolo in polvere',q:2},{n:'Zenzero fresco',q:4}],
  proc:'Olio caldo, cumino in semi finché non scoppietta (30 secondi, è il passaggio che fa il piatto), poi zenzero, curcuma, coriandolo. Unisci il soffritto, 2 minuti. Versa le uova sbattute e mescola continuamente a fuoco basso finché non sono cremose — non asciutte.' },

{ id:'mer-pra', nome:'Wrap di falafel', tipo:'pranzo', g:2,
  tempo:25, difficolta:'media',
  desc:'I falafel si infornano adesso: domenica hai preparato solo l\'impasto.',
  val:[485,22],
  ing:[{b:'falafel',q:230},{b:'hummus',q:40},
       {b:'salsapeperoni',q:40,soloLui:true},
       {n:'Tortilla integrale media',q:1},
       {n:'Tahina',q:8},{n:'Limoni',q:10},
       {n:'Pomodoro fresco',q:60,soloLei:true},{n:'Cetriolo',q:50,soloLei:true},{n:'Menta fresca',q:5,soloLei:true}],
  proc:'Falafel in forno 200 °C per 22 minuti, girati a metà, su carta forno e spennellati d\'olio. Nel frattempo diluisci la tahina col limone e due cucchiai d\'acqua fredda: si stringe prima di ammorbidirsi, continua a mescolare. Scalda la tortilla 20 secondi per lato.',
  vincolo:{lei:'Hummus, falafel (4 pezzi), pomodoro a dadini, cetriolo, menta, tahina.',
           lui:'Hummus, falafel (4 pezzi), salsa di peperoni arrostiti al posto delle verdure crude, tahina.'} },

{ id:'mer-cen', nome:'Riso e pulled chicken gochujang', tipo:'cena', g:2,
  tempo:8, difficolta:'facile',
  val:[490,44],
  ing:[{b:'pulled',q:150},{b:'riso',q:130},
       {n:'Gochujang',q:25},{n:'Salsa di soia',q:10},
       {n:'Aceto di riso',q:8},{n:'Miele',q:5},{n:'Aglio',q:5},
       {n:'Olio di sesamo',q:3},{n:'Semi di sesamo',q:3},
       {n:'Cipollotto',q:15,soloLei:true},{n:'Kimchi',q:50,soloLei:true},
       {n:'Cipolle dorate',q:40,soloLui:true}],
  proc:'Mescola gochujang, soia, aceto, miele e aglio in una ciotola. Scalda il pulled chicken in padella rovente senza girarlo per 2 minuti, così alcune parti si abbrustoliscono. Versa la salsa, fai caramellare 90 secondi. Sesamo alla fine.',
  vincolo:{lei:'Cipollotto crudo a rondelle e kimchi a parte.',
           lui:'Niente kimchi — è fermentato ma crudo, fuori vincolo. Al suo posto 40 g di cipolla stufata 20 minuti con aceto di riso e peperoncino. Stessa funzione acida e piccante, consistenza morbida.'} },

{ id:'mer-spu', nome:'Yogurt greco e burro d\'arachidi', tipo:'spuntino', g:2,
  tempo:2, difficolta:'facile',
  val:[145,19],
  ing:[{n:'Yogurt greco 0%',q:170},{n:'Burro d\'arachidi 100%',q:8}] },

/* ============================ GIOVEDÌ =========================== */
{ id:'gio-col', nome:'Quesadilla di fagioli e pulled chicken', tipo:'colazione', g:3,
  tempo:12, difficolta:'media',
  val:[395,30],
  ing:[{b:'fagioli',q:60},{b:'pulled',q:50},
       {n:'Tortilla integrale media',q:1},
       {n:'Formaggio magro grattugiato',q:25},
       {n:'Cumino',q:2},{n:'Paprika affumicata',q:1}],
  proc:'Schiaccia i fagioli con cumino e paprika. Spalma su metà tortilla, sopra il pulled chicken e il formaggio, piega a mezzaluna. Padella asciutta, fuoco medio, 3 minuti per lato con un peso sopra (un\'altra padella va bene): serve la pressione, altrimenti non sigilla e si sfalda al taglio. Aspetta 2 minuti prima di tagliarla.' },

{ id:'gio-pra', nome:'Lenticchie e polenta', tipo:'pranzo', g:3,
  tempo:40, difficolta:'media',
  desc:'Già conforme al vincolo. Nessuna variante.',
  val:[460,22],
  ing:[{b:'soffritto',q:100},{b:'lenticchie',q:180},
       {n:'Farina per polenta integrale',q:45},{n:'Acqua',q:200},
       {n:'Olio EVO',q:6},{n:'Rosmarino',q:1},{n:'Alloro',q:1},
       {n:'Passata di pomodoro',q:40}],
  proc:'Polenta: acqua salata a bollore, farina a pioggia mescolando, poi 40 minuti a fuoco basso — quella istantanea è un\'altra cosa. Intanto scalda soffritto, olio, rosmarino e alloro, unisci lenticchie e passata, 12 minuti a fuoco basso perché si insaporiscano. Devono restare umide, non asciutte.',
  nota:'Già conforme al vincolo. Nessuna variante.' },

{ id:'gio-cen', nome:'Kofta di tacchino in salsa harissa, con bulgur', tipo:'cena', g:3,
  tempo:40, difficolta:'media',
  val:[500,44],
  ing:[{b:'soffritto',q:120},{b:'salsayogurt',q:50},
       {n:'Macinato di tacchino',q:150},{n:'Bulgur',q:45},
       {n:'Harissa',q:10},{n:'Cumino',q:3},{n:'Menta secca',q:2},
       {n:'Aglio',q:5},{n:'Pangrattato',q:10},{n:'Olio EVO',q:4},
       {n:'Prezzemolo fresco',q:5,soloLei:true}],
  proc:'Impasta il macinato con cumino, menta secca, aglio, pangrattato e sale. Lascia riposare 20 minuti in frigo o le polpette si sfaldano. Forma cilindri allungati, rosolali nell\'olio 5 minuti girandoli. Aggiungi soffritto e harissa, coperchio, 15 minuti a fuoco basso. Bulgur: coprilo con acqua bollente pari al doppio del peso, coperchio, 15 minuti fuori dal fuoco.',
  vincolo:{lei:'Salsa yogurt con prezzemolo fresco tritato sopra.',
           lui:'Salsa yogurt liscia — è già fatta con menta secca, quindi va bene com\'è dal contenitore.'} },

{ id:'gio-spu', nome:'Skyr, cacao e noci', tipo:'spuntino', g:3,
  tempo:2, difficolta:'facile',
  val:[150,20],
  ing:[{n:'Skyr 0%',q:170},{n:'Noci',q:8},{n:'Cacao amaro',q:4}] },

/* ============================ VENERDÌ =========================== */
{ id:'ven-col', nome:'Shakshuka', tipo:'colazione', g:4,
  tempo:15, difficolta:'media',
  val:[410,22],
  ing:[{b:'soffritto',q:150},{n:'Passata di pomodoro',q:60},
       {n:'Uova',q:2},{n:'Feta',q:20},{n:'Pane integrale',q:25},
       {n:'Olio EVO',q:4},{n:'Cumino',q:2},{n:'Paprika affumicata',q:2}],
  proc:'Olio, cumino e paprika 30 secondi. Unisci soffritto e passata, riduci 6-8 minuti finché non è densa: se è liquida le uova affondano. Scava gli incavi col dorso del cucchiaio, rompici dentro le uova, coperchio 5 minuti — l\'albume rappreso, il tuorlo ancora liquido. Feta sbriciolata sopra a fuoco spento.' },

{ id:'ven-pra', nome:'Pasta al pomodoro con pollo sfilacciato', tipo:'pranzo', g:4, nuovo:true,
  tempo:15, difficolta:'facile',
  desc:'Sostituisce il segnaposto "Sbrodolino". Il pasto più basico della settimana: pasta, sugo, pollo. Conforme al vincolo per costruzione — è tutto cotto e frullato.',
  val:[520,42],
  ing:[{b:'soffritto',q:120},{b:'pulled',q:120},
       {n:'Pasta secca integrale',q:50},{n:'Passata di pomodoro',q:50},
       {n:'Grana grattugiato',q:8},{n:'Peperoncino',q:0,qb:true}],
  proc:'Scalda soffritto e passata in padella larga, 8 minuti, finché non stringe. Unisci il pulled chicken e lascialo insaporire 5 minuti: si ammorbidisce e prende il sugo. Scola la pasta 2 minuti prima, mantecala nel sugo con un cucchiaio di acqua di cottura. Grana fuori dal fuoco.',
  nota:'Attenzione: questi valori sono una mia stima, non presa dai documenti. Sono ~40 kcal sopra il segnaposto che sostituisce, quindi il pranzo resta leggermente sopra target — la leva più semplice è togliere 10 g di pasta.' },

{ id:'ven-cen', nome:'Chana saag con petto di pollo', tipo:'cena', g:4,
  tempo:35, difficolta:'media',
  desc:'Curry di ceci e spinaci. Già conforme al vincolo: gli spinaci finiscono in crema per entrambi.',
  val:[545,42],
  ing:[{b:'soffritto',q:120},{b:'ceci',q:180},
       {n:'Petto di pollo',q:100},{n:'Spinaci freschi',q:250},
       {n:'Riso basmati',q:40},{n:'Latte di cocco light',q:50},
       {n:'Yogurt greco 0%',q:50},{n:'Garam masala',q:3},
       {n:'Cumino',q:2},{n:'Zenzero fresco',q:5},{n:'Aglio',q:5},
       {n:'Olio EVO',q:4}],
  proc:'Gli spinaci vanno cotti 15 minuti in pochissima acqua e frullati — 600 g freschi diventano circa 120 g di crema verde densa. Intanto rosola il pollo a cubi, mettilo da parte. Nella stessa pentola: spezie, soffritto, ceci, latte di cocco, 10 minuti. Unisci la crema di spinaci e il pollo, altri 5 minuti. Yogurt fuori dal fuoco.',
  nota:'Il pollo non è opzionale. Senza, il piatto si ferma a 18 g di proteine per porzione — un terzo di quello che serve a cena.' },

{ id:'ven-spu', nome:'Yogurt greco e semi di lino', tipo:'spuntino', g:4,
  tempo:3, difficolta:'facile',
  val:[150,19],
  ing:[{n:'Yogurt greco 0%',q:170},{n:'Semi di lino',q:10},
       {n:'Cannella',q:1}],
  nota:'I semi di lino interi passano indigeriti. Vanno macinati al momento, o non servono a niente.' },

/* ============================= SABATO =========================== */
{ id:'sab-col', nome:'Uova e fagioli neri speziati', tipo:'colazione', g:5,
  tempo:18, difficolta:'media',
  val:[420,26],
  ing:[{b:'fagioli',q:110},{n:'Uova',q:2},
       {n:'Pane integrale',q:25},{n:'Cipolle dorate',q:30},
       {n:'Passata di pomodoro',q:40},{n:'Cumino',q:2},
       {n:'Paprika affumicata',q:2},{n:'Olio EVO',q:4}],
  proc:'Cipolla tritata fine nell\'olio, 6 minuti a fuoco basso finché non è trasparente. Cumino e paprika 30 secondi, poi fagioli e passata, schiaccia un terzo dei fagioli con la forchetta perché il piatto leghi. 8 minuti. Uova all\'occhio di bue in una padella a parte, sopra.' },

{ id:'sab-pra', nome:'Hot dog di pollo con cipolle caramellate', tipo:'pranzo', g:5,
  tempo:12, difficolta:'facile',
  val:[450,27],
  ing:[{b:'cipolle',q:50},{b:'vellutata',q:250,soloLui:true},
       {n:'Salsiccia di pollo o tacchino',q:100},
       {n:'Panino piccolo',q:0.5},{n:'Senape',q:8},
       {n:'Insalata mista',q:80,soloLei:true},{n:'Pomodorini',q:60,soloLei:true},
       {n:'Olio EVO',q:5,soloLei:true},{n:'Aceto di riso',q:5,soloLei:true}],
  proc:'Salsicce in padella senza olio, fuoco medio, 10 minuti girandole spesso: devono abbrustolirsi, non bollire nel loro liquido. Pane tostato dalla parte del taglio. Cipolle caramellate scaldate, senape, salsiccia.',
  vincolo:{lei:'Insalata mista e pomodorini a parte, olio e aceto.',
           lui:'250 g di vellutata come contorno caldo al posto dell\'insalata. È il pasto dove la differenza tra i due piatti è più visibile, ed è anche l\'unico in cui non ho trovato un modo di renderla invisibile.'},
  nota:'Unico pasto dove il valore kcal/proteine indicato è quello di lei ma non è esattamente quello che mangia lui: la vellutata calda pesa un po\' di più della sua insalata. Non quantificato per non inventare un numero — è comunque il pasto con la differenza più visibile tra i due piatti.' },

{ id:'sab-cen', nome:'Curry thai rosso di gamberi', tipo:'cena', g:5,
  tempo:15, difficolta:'media',
  val:[505,40],
  ing:[{b:'soffritto',q:80},{n:'Gamberi sgusciati',q:180},
       {n:'Riso jasmine',q:50},{n:'Latte di cocco light',q:80},
       {n:'Pasta di curry rosso thai',q:15},{n:'Salsa di soia',q:8},
       {n:'Lime',q:12},{n:'Zenzero fresco',q:5},
       {n:'Olio EVO',q:4},{n:'Basilico thai',q:5}],
  proc:'Friggi la pasta di curry nell\'olio per 60 secondi prima di aggiungere qualsiasi liquido — è il passaggio che separa un curry thai da acqua rossa. Poi soffritto, latte di cocco, zenzero, 8 minuti. I gamberi entrano per ultimi, 3 minuti e basta: oltre diventano gomma. Lime a fuoco spento.',
  vincolo:{lei:'Basilico thai fresco strappato sopra alla fine.',
           lui:'Il basilico va dentro la salsa negli ultimi 2 minuti di cottura, così cede l\'aroma senza restare foglia.'} },

{ id:'sab-spu', nome:'Skyr e cacao', tipo:'spuntino', g:5,
  tempo:2, difficolta:'facile',
  val:[110,20],
  ing:[{n:'Skyr 0%',q:170},{n:'Cacao amaro',q:5},{n:'Cannella',q:1}] },

/* ============================ DOMENICA ========================== */
{ id:'dom-col', nome:'Uova strapazzate e skyr', tipo:'colazione', g:6,
  tempo:8, difficolta:'facile',
  desc:'Domenica non è una giornata di avanzi improvvisati: colazione e pranzo sono costruiti per arrivare sazi alla cena libera.',
  val:[415,33],
  ing:[{n:'Uova',q:2},{n:'Albumi',q:2},{b:'soffritto',q:80},
       {n:'Skyr 0%',q:100},{n:'Pane integrale',q:25},
       {n:'Olio EVO',q:4}] },

{ id:'dom-pra', nome:'Chili dal freezer con riso', tipo:'pranzo', g:6,
  tempo:8, difficolta:'facile',
  desc:'I 700 g di chili avanzati dalla domenica precedente.',
  val:[520,27],
  ing:[{b:'chili',q:300},{n:'Riso basmati',q:45},
       {n:'Yogurt greco 0%',q:60},{n:'Lime',q:10}],
  nota:'Se lo selezioni qui, la spesa conta il chili come da preparare. Se invece lo prendi dal freezer della settimana scorsa, toglilo dalla lista.' },

{ id:'dom-cen', nome:'Pasto libero', tipo:'cena', g:6, libero:true,
  desc:'È qui che va la pizza, ogni 2-3 settimane. Budget indicativo: ~600 kcal. Non pesatelo, non contatelo.',
  val:[600,10],
  ing:[],
  proc:'Tre regole, e sono le uniche che contano. 1) Non tagliate colazione e pranzo per far spazio: arrivare affamati a una cena libera è il modo più affidabile di raddoppiarla. 2) Una cena libera a settimana sposta la media settimanale di 60-90 kcal al giorno, cioè niente. Due o tre no. 3) Riprendete lunedì mattina, non "da lunedì prossimo".' },
];
```

- [ ] **Step 3: aggiornare `TARGET`**

Sostituisci:
```js
const TARGET = {lei:{kcal:1450, p:115}, lui:{kcal:1850, p:140}};
```
con:
```js
const TARGET = {kcal:1450, p:115};
```

- [ ] **Step 4: verifica sintattica e integrità referenziale**

Run: `cd sorgenti && node -e "const D=require('./dati.js'); console.log(D.PASTI.length, 'pasti')"`
Expected: `27 pasti` stampato senza errori (26 pasti + eventuale riconteggio,
verifica che il numero corrisponda a quello di partenza: erano 26 righe
sopra `dom-cen` incluso — controlla che l'array abbia esattamente lo stesso
numero di voci di prima).

---

## Task 3 — app.js: interfaccia a porzione singola + tempo/difficoltà

**Files:**
- Modify: `sorgenti/app.js`

**Interfaces:**
- Consuma: `stato.sel[pastoId]` ora un numero (non `{lei,lui}`); `calcola()`
  da Task 1; `p.tempo`, `p.difficolta` da Task 2.
- Produce: markup scheda pasto con un solo stepper, una sola colonna grammi,
  badge tempo/difficoltà accanto al titolo.

- [ ] **Step 1: leggere l'intero file per individuare ogni riferimento a
  `lei`/`lui`/`chi` da adattare**

Run: `Grep` su `sorgenti/app.js` con pattern `chi|lei|lui|selezione` (già
fatto in fase di analisi — usare quell'elenco di righe come mappa: righe
12-55, 78-128, 196-227, 488-505, 541-544, 615-617 sono i punti da toccare).

- [ ] **Step 2: stato iniziale e persistenza**

Riga 14, sostituisci:
```js
  chi:'due', grp:'tipo', filtro:'tutti', passo:'dispensa',
  sel:{}, modiBase:{}, hoGia:{}, preso:{}, pesi:[], pesoChi:'lei', aperti:{}, extra:[]
```
con:
```js
  grp:'tipo', filtro:'tutti', passo:'dispensa',
  sel:{}, modiBase:{}, hoGia:{}, preso:{}, pesi:[], pesoChi:'lei', aperti:{}, extra:[]
```

Nella funzione di caricamento stato (intorno alla riga 22, dove si legge
`localStorage.getItem(CHIAVE)`), dopo aver fatto il merge dello stato salvato,
aggiungi la migrazione delle vecchie selezioni a doppio contatore:
```js
Object.keys(stato.sel).forEach(id => {
  const s = stato.sel[id];
  if (s && typeof s === 'object') stato.sel[id] = (s.lei||0) + (s.lui||0);
});
```

- [ ] **Step 3: contatori e formattazione**

Sostituisci (righe 37-55 circa):
```js
function fmtQ(i, chi){
  ...
  const v = i[chi] || 0;
  ...
  if (m.lei) s += '<em>solo lei</em>';
  ...
}
const nPorzioni = () => Object.values(stato.sel).reduce((a,s) => a + (s.lei||0) + (s.lui||0), 0);
const nPasti    = () => Object.values(stato.sel).filter(s => (s.lei||0)+(s.lui||0) > 0).length;
```
con:
```js
function fmtQ(i){
  const v = i.q || 0;
  let s = formatta ? '' : '';
  return v;
}
const nPorzioni = () => Object.values(stato.sel).reduce((a,n) => a + (n||0), 0);
const nPasti    = () => Object.values(stato.sel).filter(n => (n||0) > 0).length;
```

> Nota per chi implementa: `fmtQ` nel file originale fa altro lavoro (chiama
> `formatta()` sul valore, aggiunge l'etichetta "solo lei"). Non riscriverlo
> da zero: apri le righe 37-55 del file originale, mantieni la chiamata a
> `formatta(i.n||i.b, v, ING)` così com'è, cambia solo la firma (niente più
> parametro `chi`, si legge sempre `i.q`) e sostituisci la logica
> `if (m.lei)` con `if (i.soloLei) s += '<em>solo lei</em>'; if (i.soloLui) s
> += '<em>solo lui</em>';` — l'informazione ora vive sull'ingrediente del
> pasto, non più sul registro `ING` globale.

- [ ] **Step 4: scheda pasto — stepper singolo, colonna unica, badge**

Nella funzione che genera la card pasto (righe 78-128 circa), sostituisci:
```js
  const s = stato.sel[p.id] || {lei:0, lui:0};
  ...
  const attivo = (s.lei||0) + (s.lui||0) > 0;
  ...
  const stepper = chi => {
    const n = s[chi] || 0;
    return `<div class="step s-${chi}${n?' on':''}">
      <b>${chi}</b>
      <button data-step="${p.id}|${chi}|-1" aria-label="Togli una porzione per ${chi}">−</button>
      ...
      <button data-step="${p.id}|${chi}|1" aria-label="Aggiungi una porzione per ${chi}">+</button>
```
con:
```js
  const n = stato.sel[p.id] || 0;
  const attivo = n > 0;
  const stepper = () => `<div class="step${n?' on':''}">
      <button data-step="${p.id}|-1" aria-label="Togli una porzione">−</button>
      <span>${n}</span>
      <button data-step="${p.id}|1" aria-label="Aggiungi una porzione">+</button>
    </div>`;
```

Poi (riga 95-96 circa), sostituisci la doppia colonna grammi:
```js
      <span class="q lei${(i.lei||i.qb)?'':' zero'}">${fmtQ(i,'lei')}</span>
      <span class="q lui${(i.lui||i.qb)?'':' zero'}">${fmtQ(i,'lui')}</span>
```
con:
```js
      <span class="q${(i.q||i.qb)?'':' zero'}">${fmtQ(i)}</span>
```

Riga 100-103 circa, il testo del vincolo resta con le etichette "lei"/"lui"
(sono solo istruzioni di cottura, non dati tracciati) — nessuna modifica lì.

Riga 120-123 circa, sostituisci:
```js
        <span class="pill lei">Lei <b>${p.val.lei[0]}</b> kcal · <b>${p.val.lei[1]}</b> g P</span>
        <span class="pill lui">Lui <b>${p.val.lui[0]}</b> kcal · <b>${p.val.lui[1]}</b> g P</span>
      </div>
      <div class="step-box">${stepper('lei')}${stepper('lui')}</div>
```
con:
```js
        <span class="pill"><b>${p.val[0]}</b> kcal · <b>${p.val[1]}</b> g P</span>
      </div>
      <div class="step-box">${stepper()}</div>
```

Riga 128 circa, sostituisci l'intestazione tabella grammi:
```js
        <div class="intest"><span></span><span class="h-lei">Lei</span><span class="h-lui">Lui</span></div>
```
con:
```js
        <div class="intest"><span></span><span>Porzione</span></div>
```

Nel blocco che genera il titolo del pasto (`p-nome`, poco prima di `p-meta`),
aggiungi i due nuovi badge subito dopo il nome, prima dei tag esistenti.
Cerca la riga che genera `class="p-nome"` e la riga successiva che apre
`p-meta`; tra le due, dentro `p-meta` insieme ai tag `tipo`/base, aggiungi:
```js
        <span class="tag tempo">${p.tempo ? p.tempo + ' min' : '—'}</span>
        ${p.difficolta ? `<span class="tag diff-${p.difficolta}">${p.difficolta}</span>` : ''}
```
(inseriscili come primi elementi dentro `p-meta`, prima del tag tipo, così
compaiono subito accanto al titolo).

- [ ] **Step 5: gestione click sullo stepper**

Trova il gestore dei click sullo stepper (riga 502-505 circa):
```js
    const s = stato.sel[id] || {lei:0, lui:0};
    ...
    if (!s.lei && !s.lui) delete stato.sel[id];
```
Il pattern dell'evento cambia da `data-step="${id}|${chi}|${delta}"` a
`data-step="${id}|${delta}"`. Aggiorna il parsing dell'attributo e la logica:
```js
    const [pid, deltaStr] = t.dataset.step.split('|');
    const delta = Number(deltaStr);
    const nuovo = Math.max(0, (stato.sel[pid] || 0) + delta);
    if (nuovo) stato.sel[pid] = nuovo; else delete stato.sel[pid];
```
(adatta i nomi di variabile a quelli già in uso nel blocco circostante,
mantenendo `renderCatalogo()`/`aggiornaBadge()`/`salva()` chiamati come oggi
dopo l'aggiornamento).

- [ ] **Step 6: "carica la settimana intera" e riepilogo**

Riga 544 circa:
```js
    PASTI.forEach(p => stato.sel[p.id] = {lei:1, lui:1});
```
diventa:
```js
    PASTI.forEach(p => stato.sel[p.id] = 2);
```

Righe 196-227 circa (riepilogo per tipo pasto, con `mediaBlocco('lei')` e
`mediaBlocco('lui')`): sostituisci il doppio calcolo/doppio blocco con uno
singolo. Il reduce a riga 196:
```js
    .reduce((a,p) => { const s = stato.sel[p.id]; return {lei:a.lei+((s&&s.lei)||0), lui:a.lui+((s&&s.lui)||0)}; }, {lei:0,lui:0});
```
diventa:
```js
    .reduce((a,p) => a + (stato.sel[p.id]||0), 0);
```
`mediaBlocco` (righe 198-206) perde il parametro `chi` e usa `TARGET` invece
di `TARGET[chi]`; la chiamata a riga 226 `${mediaBlocco('lei')}${mediaBlocco('lui')}`
diventa `${mediaBlocco()}`; il testo a riga 223-224 con le due righe
"Lei ... / Lui ..." diventa una riga sola con `v[0]`/`v[1]` (dato che `val`
non è più `{lei:[...],lui:[...]}` ma `[kcal,p]`); riga 227 il testo target
diventa `Target: ${TARGET.kcal} kcal / ${TARGET.p} g P.`

- [ ] **Step 7: rimuovere il gestore del selettore header**

Righe 488-494 e 615-617 circa: elimina interamente il blocco che gestisce
`.chi button` (lettura click, `stato.chi`, `document.body.dataset.chi`,
`--accento` legato a `stato.chi==='lui'`) e le due righe equivalenti fuori
dai gestori evento in fondo al file. L'accento colore torna fisso su
`var(--curcuma)` (rimuovi la riga `document.documentElement.style.setProperty(...)`
oppure impostala una sola volta a `'var(--curcuma)'` senza condizione).

- [ ] **Step 8: link "Apri a schermo intero"**

In cima al file (o in un punto eseguito all'avvio, vicino alle altre righe
`document.body.dataset...` rimosse al Step 7), aggiungi:
```js
if (window.self !== window.top) {
  const a = document.createElement('a');
  a.href = location.href;
  a.target = '_blank';
  a.rel = 'noopener';
  a.textContent = 'Apri a schermo intero ↗';
  a.style.cssText = 'display:block;text-align:center;font-family:JetBrains Mono,monospace;font-size:10.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--curcuma);background:var(--pentola);border-bottom:1px solid var(--bordo);padding:8px;text-decoration:none';
  document.body.insertBefore(a, document.body.firstChild);
}
```

- [ ] **Step 9: verifica sintattica**

Run: `node -e "require('./sorgenti/app.js')"` — atteso: fallisce con un
errore legato a `document is not defined` (app.js gira nel browser, non in
Node: questo è previsto). Verifica invece la sintassi con:
`node --check sorgenti/app.js`
Expected: nessun output (sintassi valida).

---

## Task 4 — shell.html: CSS a colonna singola

**Files:**
- Modify: `sorgenti/shell.html`

- [ ] **Step 1: rimuovere il selettore header LEI/DUE/LUI**

Elimina il blocco (righe 228-232 circa):
```html
    <div class="chi" role="group" aria-label="Per chi">
      <button data-chi="lei" aria-pressed="false">LEI</button>
      <button data-chi="due" aria-pressed="true">DUE</button>
      <button data-chi="lui" aria-pressed="false">LUI</button>
    </div>
```

Rimuovi anche `data-chi="due"` da `<body data-chi="due">` (riga 223) → `<body>`.

- [ ] **Step 2: CSS — colonna unica per la tabella grammi**

Sostituisci (righe 128-145 circa):
```css
.gram .intest,.gram .riga{display:grid;grid-template-columns:1fr 74px 74px;align-items:center;gap:8px;padding:8px 11px}
...
.gram .q.lei{color:var(--curcuma)}
.gram .q.lui{color:var(--pistacchio)}
.gram .q.zero{opacity:.28}
body[data-chi="lei"] .h-lui,body[data-chi="lei"] .q.lui,
body[data-chi="lei"] .pill.lui,body[data-chi="lei"] .step.s-lui{display:none}
body[data-chi="lui"] .h-lei,body[data-chi="lui"] .q.lei,
body[data-chi="lui"] .pill.lei,body[data-chi="lui"] .step.s-lei{display:none}
body[data-chi="lei"] .gram .intest,body[data-chi="lei"] .gram .riga,
body[data-chi="lui"] .gram .intest,body[data-chi="lui"] .gram .riga{grid-template-columns:1fr 74px}
```
con:
```css
.gram .intest,.gram .riga{display:grid;grid-template-columns:1fr 74px;align-items:center;gap:8px;padding:8px 11px}
...
.gram .q{color:var(--curcuma)}
.gram .q.zero{opacity:.28}
```
(mantieni le righe non elencate qui, es. `.gram .intest{...}`, `.gram .riga+.riga...`, `.gram .ing{...}` invariate — tocca solo le righe mostrate sopra).

- [ ] **Step 3: media query righe 202-207**

Sostituisci:
```css
@media (max-width:420px){
  .gram .intest,.gram .riga{grid-template-columns:1fr 62px 62px}
  body[data-chi="lei"] .gram .intest,body[data-chi="lei"] .gram .riga,
  body[data-chi="lui"] .gram .intest,body[data-chi="lui"] .gram .riga{grid-template-columns:1fr 62px}
  .p-h{padding:13px 12px}
}
```
con:
```css
@media (max-width:420px){
  .gram .intest,.gram .riga{grid-template-columns:1fr 62px}
  .p-h{padding:13px 12px}
}
```

- [ ] **Step 4: pill singola invece di `.pill.lui`**

Riga 109: elimina `.pill.lui{background:rgba(143,181,116,.1);color:var(--pistacchio)}`
(la regola base `.pill{...}` a riga 108 resta e ora si applica all'unica pill).

- [ ] **Step 5: tag tempo/difficoltà**

Dopo la regola `.tag.base{...}` (riga 106), aggiungi:
```css
.tag.tempo{background:transparent;border:1px solid var(--bordo2);color:var(--fumo)}
.tag.diff-facile{background:rgba(143,181,116,.14);color:var(--pistacchio)}
.tag.diff-media{background:rgba(232,163,61,.14);color:var(--curcuma)}
.tag.diff-difficile{background:rgba(201,72,47,.16);color:#E8785F}
```

- [ ] **Step 6: rigenerare `cucina.html`**

Run: `cd sorgenti && node build.js`
Expected: `Scritto ../cucina.html  (NN.N KB)` senza errori.

---

## Task 5 — test.js: nuovi valori attesi, verifica multipla

**Files:**
- Modify: `sorgenti/test.js`

- [ ] **Step 1: aggiornare la selezione di test**

Riga 18-20:
```js
// 3. settimana intera, 1 porzione lei + 1 lui per ogni pasto
const sel = {};
D.PASTI.forEach(p => sel[p.id] = {lei:1, lui:1});
```
diventa:
```js
// 3. settimana intera, 2 porzioni (lei+lui) per ogni pasto
const sel = {};
D.PASTI.forEach(p => sel[p.id] = 2);
```

- [ ] **Step 2: aggiornare la stampa dei valori settimana**

Righe 30-32:
```js
console.log('\n=== VALORI SETTIMANA ===');
console.log('Lei:', Math.round(r.val.lei[0]), 'kcal ·', Math.round(r.val.lei[1]), 'g P  → media/gg', Math.round(r.val.lei[0]/7), '/', Math.round(r.val.lei[1]/7));
console.log('Lui:', Math.round(r.val.lui[0]), 'kcal ·', Math.round(r.val.lui[1]), 'g P  → media/gg', Math.round(r.val.lui[0]/7), '/', Math.round(r.val.lui[1]/7));
```
diventa:
```js
console.log('\n=== VALORI SETTIMANA (totale coppia) ===');
console.log('Totale:', Math.round(r.val[0]), 'kcal ·', Math.round(r.val[1]), 'g P');
console.log('A testa:', Math.round(r.val[0]/2), 'kcal ·', Math.round(r.val[1]/2), 'g P  → media/gg a testa', Math.round(r.val[0]/2/7), '/', Math.round(r.val[1]/2/7));
```

- [ ] **Step 3: prima esecuzione — SOLO per leggere i numeri reali, non toccare ancora le verifiche**

Run: `cd sorgenti && node test.js`

Annota dall'output: consumo di ogni base (`=== BASI ===`), la media
kcal/proteine a testa, la lista della spesa completa. Questi sono i numeri
**verificati dal motore** che andranno nei task 6-8 — non ricalcolarli a
mano.

- [ ] **Step 4: aggiornare le verifiche incrociate (righe 43-56)**

Sostituisci le chiamate a `v(...)` con i nuovi riferimenti a `r.val[0]`/
`r.val[1]` invece di `r.val.lei[...]`/`r.val.lui[...]`, e aggiorna gli
"atteso" con i numeri letti allo Step 3 (non con quelli vecchi):
```js
v('Pulled chicken consumato', <numero da Step 3>, r.usoPasti.pulled);
v('Lenticchie verdi consumate', <numero da Step 3>, r.usoPasti.lenticchie);
v('Ragù consumato', <numero da Step 3>, r.usoPasti.ragu);
v('Ceci dai pasti', <numero da Step 3>, r.usoPasti.ceci);
v('Falafel: pezzi da 55-60 g', <numero da Step 3>, r.usoPasti.falafel/57, 0.3);
v('Media kcal a testa', <numero da Step 3>, r.val[0]/2/7, 2);
v('Media proteine a testa', <numero da Step 3>, r.val[1]/2/7, 1);
v('Uova settimana', <numero da Step 3>, r.ing['Uova'], 1);
```
(mantieni la struttura del resto del file — righe 1-42 e 54-58 — invariata).

- [ ] **Step 5: seconda esecuzione — verifica che risulti pulito**

Run: `node test.js`
Expected: ultima riga `Tutte le verifiche passano.`

- [ ] **Step 6: controllo incrociato manuale indipendente (secondo giro di verifica)**

A mano, senza usare l'output del motore: ricalcola il consumo settimanale di
**soffritto** sommando solo i pasti che lo usano direttamente (11 pasti,
colonna `q` del soffritto in ciascuno, dal Task 2) moltiplicato per 2 (entrambi
lo mangiano), più 600 g per il chili e 400 g per il ragù (basi che lo
contengono, quantità fissa di ricetta, invariata). Confronta questo numero
con quello stampato da `node test.js` alla riga `soffritto lungo frullato
serve ...`: devono coincidere. Se non coincidono, non proseguire — c'è un
errore nella Task 2 o nella Task 1 da correggere prima.

Ripeti lo stesso controllo indipendente per il **pulled chicken** (5 pasti
diretti + eventuali basi che lo contengono — verifica se qualche base annidata
lo referenzia con `@pulled`, altrimenti solo i pasti diretti × 2).

---

## Task 6 — piano-pasti-definitivo.md: porzione unica

**Files:**
- Modify: `piano-pasti-definitivo.md`

- [ ] **Step 1: intestazione**

Riga 1-4, aggiorna la frase introduttiva per riflettere la porzione unica,
es.:
```
# Piano dei pasti — versione definitiva

Ogni pasto ha: **ingredienti divisi tra basi e fresco**, tutti in grammi, **la procedura**, la variante per il vincolo, e i valori stimati.
Le grammature sono **al netto e a crudo** salvo dove indicato "cotto". **Dal 2026-08-20, porzione unica**: lei e lui mangiano la stessa quantità di ogni pasto — resta solo la differenza tra finiture a crudo (lei) e la loro versione cotta/frullata (lui), spiegata pasto per pasto in "Il vincolo".
```

- [ ] **Step 2: ogni tabella pasto, colonna singola**

Per ciascuno dei 26 pasti, la tabella a due colonne
```
| | Lei | Lui |
|---|---|---|
| **soffritto** (base) | 120 g | 150 g |
```
diventa una colonna sola, con i valori `q` dal Task 2 (stesso ordine delle
righe, stesso ingrediente, un solo numero):
```
| | Porzione |
|---|---|
| **soffritto** (base) | 120 g |
```
Applica questa trasformazione a tutti i 26 pasti usando esattamente i valori
`q` scritti in `sorgenti/dati.js` dopo il Task 2 (fonte unica, non ricopiare
numeri da questo file — trascrivi da dati.js per evitare disallineamenti).
Per le voci con `soloLei`/`soloLui`, mantieni la riga ma annota a fianco
`(solo lei)` / `(solo lui)`, es. `| Cipolla rossa cruda | 20 g (solo lei) |`.

- [ ] **Step 3: riga "Valori" di ogni pasto**

```
**Valori.** Lei ~**400 kcal · 25 g P** · Lui ~**565 kcal · 37 g P**
```
diventa (usando `val` dal Task 2):
```
**Valori.** ~**400 kcal · 25 g P**
```
Eccezione `sab-pra`: aggiungi dopo la riga valori la nota già scritta nella
tabella di conversione (asimmetria vellutata/insalata non quantificata).

- [ ] **Step 4: box "Totale giorno" per ognuno dei 7 giorni**

Esempio riga 105-108 (lunedì):
```
> ### Totale lunedì
> **Lei: ~1.530 kcal · 109 g P** (target 1.450 / 115) — 80 kcal sopra
> **Lui: ~1.970 kcal · 142 g P** (target 1.850 / 140) — 120 kcal sopra
> *Leva:* togli il pane a colazione e 30 g di riso a pranzo.
```
Ricalcola sommando i `val` (Task 2) dei 4 pasti di quel giorno (colazione +
pranzo + cena + spuntino) — somma diretta, non serve il motore per un
singolo giorno. Riscrivi come:
```
> ### Totale lunedì
> **~<somma kcal> kcal · <somma proteine> g P** (target 1.450 / 115) — <delta> kcal <sopra/sotto>
> *Leva:* <mantieni il consiglio originale se ancora pertinente, altrimenti ometti la riga>
```
Ripeti per tutti e 7 i giorni. Verifica ogni somma due volte (ricalcolo
indipendente) prima di scriverla.

- [ ] **Step 5: rileggere l'intero file dopo le modifiche**

Run: `Read` su `piano-pasti-definitivo.md` per intero e controlla che non
resti nessun riferimento a "Lei" / "Lui" come colonne separate, tranne nei
testi del "vincolo" (che restano, sono istruzioni di cucina) e nelle 4
correzioni testuali elencate nella tabella di conversione a inizio piano.

---

## Task 7 — preparazione-domenicale.md: consumi e bilancio ricalcolati

**Files:**
- Modify: `preparazione-domenicale.md`

- [ ] **Step 1: box "Correzioni al piano precedente" in testa**

Sostituisci il blockquote (righe 3-8) con una nota che spiega il nuovo
contesto invece delle vecchie correzioni (ormai storiche):
```
> **Porzione unica dal 2026-08-20.** Lei e lui mangiano ora la stessa
> quantità di ogni pasto: il consumo settimanale delle basi è più basso di
> prima (si veda "Bilancio delle basi"), le rese delle ricette qui sotto
> restano invariate — avanza più roba in freezer rispetto a prima.
> Tutte le grammature sono **al netto** salvo indicazione contraria. I
> valori nutrizionali restano **stime**.
```

- [ ] **Step 2: sezione "Mappa pasti → preparazioni" (PARTE 2)**

Per ognuno dei 7 giorni, le righe "Dalle basi" riportavano quantità "totale
per due" (somma lei+lui, diseguale). Ricalcolale come 2× il valore `q`
condiviso di ogni base in quel pasto (dato che ora lei e lui prendono la
stessa quantità), usando i valori `q` da `sorgenti/dati.js` dopo il Task 2.
Esempio lunedì (riga 284-289 originale):
```
| **Colazione** — Uova alla pizzaiola | soffritto **270 g** | 5 uova, 110 g pane, 50 g feta |
```
soffritto in `lun-col` è `q:120` → 2 persone × 120 g = **240 g** (non più 270).
Idem per uova (`q:2` → 4 uova, non 5), pane (`q:20` → 40 g, non 110 — **nota:**
verifica ogni ingrediente "da fare fresco" allo stesso modo, moltiplicando
`q` per 2; le eccezioni `soloLei`/`soloLui` NON si raddoppiano, restano al
valore singolo di `q`). Ripeti la trasformazione "raddoppia ogni `q`
condiviso, non raddoppiare `soloLei`/`soloLui`" per tutti i pasti di tutti e
7 i giorni e per le righe "Prelievo del giorno"/"Prelievo" a fondo sezione
(somma delle basi di quel giorno).

- [ ] **Step 3: sezione "Bilancio delle basi" (PARTE 3)**

La colonna "Consumato" di ogni riga della tabella righe 378-396 va sostituita
con il numero **stampato da `node test.js`** al Task 5 Step 3/5 (colonna
`serve` per ciascuna base nell'output `=== BASI: fabbisogno settimana
intera ===`) — non ricalcolarla qui a mano una terza volta, usa il numero già
verificato due volte al Task 5. Ricalcola "Margine" = Prodotto − Consumato
per ogni riga. Aggiorna la frase finale (riga 398) sul soffritto "vincolo
stretto" con il nuovo margine reale (sarà più ampio di prima — riformula la
frase di conseguenza, es. "Il margine sul soffritto è ora di X g su 3.300,
più ampio di prima: con porzioni più basse la spesa punta meno sul filo del
rasoio.").

Aggiorna anche la riga sui falafel: il consumo scende da 10 a 8 pezzi (lui
ora mangia 4 pezzi come lei, non più 6) — margine passa da 0 a 2 pezzi.
Aggiungi una frase breve tipo quella già usata per altri margini (es. "+2
pezzi, si mangiano freddi o si riscaldano 5 minuti in forno").

- [ ] **Step 4: sezione "Lista della spesa corretta" (PARTE 4)**

Le voci di questa tabella (righe 408-423) riflettono l'ultimo cambio di
piano, non quello attuale — ricostruiscila da zero confrontando la lista
della spesa **stampata da `node test.js`** (sezione `=== LISTA COMPLETA
===`) con la spesa che risulterebbe dalla vecchia porzione doppia (puoi
ricavarla rieseguendo temporaneamente `node test.js` con la vecchia versione
di `dati.js`, se conservata, oppure limitati a riportare le sole voci con
variazione significativa >10% rispetto ai valori già scritti in questo
documento prima della modifica). Se il confronto preciso non è pratico,
sostituisci l'intera tabella con: "Consulta la lista completa generata da
`node sorgenti/test.js` per le quantità aggiornate" e rimuovi la tabella
comparativa (è comunque superata dal nuovo output verificabile).

- [ ] **Step 5: falafel, riga 237**

```
Mercoledì ne servono esattamente 10 (4 lei + 6 lui).
```
diventa:
```
Mercoledì ne servono esattamente 8 (4 a testa).
```

---

## Task 8 — CLAUDE.md: modello dati e vincoli aggiornati

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: sezione "Il vincolo che spiega tutto"**

Sostituisci:
```
Target: lei 1.450 kcal / 115 g proteine · lui 1.850 kcal / 140 g proteine.
```
con:
```
Target: 1.450 kcal / 115 g proteine, uguale per entrambi — dall'2026-08-20
lui mangia le stesse porzioni di lei; resta solo la differenza tra finiture
a crudo (lei) e la loro versione cotta/frullata (lui).
```

- [ ] **Step 2: sezione "Regole del modello dati"**

Sostituisci il paragrafo:
```
- Un ingrediente che è una base si scrive `{b:'soffritto', lei:120, lui:150}`; uno fresco
  `{n:'Uova', lei:2, lui:3}`. Il nome deve esistere in `ING`, o `test.js` lo segnala.
```
con:
```
- Un ingrediente che è una base si scrive `{b:'soffritto', q:120}`; uno fresco
  `{n:'Uova', q:2}`. Il nome deve esistere in `ING`, o `test.js` lo segnala.
  `q` è la quantità per persona, identica per lei e lui. Le finiture non
  condivise portano un flag: `soloLei:true` (finitura a crudo, resta solo a
  lei) o `soloLui:true` (equivalente cotto/frullato, resta solo a lui) — sono
  tre casi in tutto il piano, elencati nel piano di implementazione.
```

- [ ] **Step 3: sezione "Vincoli da non rompere"**

Sostituisci le due frasi su pulled chicken e soffritto con i numeri **usciti
da `node test.js`** dopo il Task 5 (non i vecchi 880/890 e 3.400/3.300, che
si riferiscono alla porzione doppia). Esempio di formulazione (sostituisci
i placeholder `<...>` con i numeri reali stampati):
```
- **Il pulled chicken:** <X> g sfilacciati sulla settimana contro una resa
  di 890 g.
- **Il soffritto:** servono <Y> g per la settimana intera contro una resa da
  ricetta di 3.300 g. Il margine è più ampio di prima (porzioni più basse):
  l'app non ha più bisogno di riscalare al limite.
```

---

## Task 9 — build finale e verifica visiva

**Files:** nessuna modifica, solo verifica.

- [ ] **Step 1: rigenerare**

Run: `cd sorgenti && node build.js`
Expected: `Scritto ../cucina.html  (NN.N KB)`

- [ ] **Step 2: verifica finale automatica**

Run: `cd sorgenti && node test.js`
Expected: `Tutte le verifiche passano.` come ultima riga.

- [ ] **Step 3: apertura visiva**

Apri `cucina.html` (doppio click o `start cucina.html` da PowerShell) e
controlla a occhio: nessun selettore LEI/DUE/LUI in header, ogni scheda
pasto mostra un solo stepper e una sola colonna di grammi, badge tempo +
difficoltà visibili accanto al titolo, riepilogo settimanale con un solo
blocco di valori, scheda Peso ancora con LEI/LUI (invariata).

---

## Task 10 — Google Sites: lista di deploy (non eseguibile da qui)

Questi passi toccano account/servizi esterni dell'utente — vanno fatti da
lui, non dall'agente. Elencati qui come riferimento operativo.

1. **Crea un repository GitHub** (pubblico, serve per GitHub Pages gratuito):
   `github.com` → New repository → nome a scelta (es. `dietacosi`) → non
   inizializzare con README (il progetto esiste già in locale).
2. **Collega il repo locale e fai il primo push:**
   ```bash
   cd "c:/Users/damia/Desktop/DietaCosi"
   git init
   git add cucina.html sorgenti CLAUDE.md piano-pasti-definitivo.md preparazione-domenicale.md
   git commit -m "Prima versione pubblicata"
   git remote add origin https://github.com/<utente>/<repo>.git
   git branch -M main
   git push -u origin main
   ```
3. **Abilita GitHub Pages:** sul repo, Settings → Pages → Source: "Deploy
   from a branch" → Branch: `main` / `(root)` → Save. Dopo 1-2 minuti,
   GitHub mostra l'URL pubblico (`https://<utente>.github.io/<repo>/`).
4. **Verifica l'URL diretto:** apri
   `https://<utente>.github.io/<repo>/cucina.html` in una scheda normale (non
   incorniciata) — deve funzionare identico alla versione locale, spunte e
   dati salvati inclusi.
5. **In Google Sites:** apri il sito (o creane uno nuovo su
   `sites.google.com`) → sulla pagina desiderata, pannello a destra → **Inserisci**
   → **Incorpora** → scheda **Da URL** → incolla
   `https://<utente>.github.io/<repo>/cucina.html` → **Inserisci**.
6. **Ridimensiona il riquadro:** trascina gli angoli dell'elemento incorporato
   finché non è alto abbastanza da mostrare header + qualche scheda pasto
   senza essere schiacciato (indicativamente almeno 700-800 px di altezza).
7. **Pubblica la pagina** (bottone "Pubblica" in alto a destra in Google
   Sites).
8. **Prova su telefono:** apri la pagina pubblicata da mobile, verifica che
   spunte/dispensa si salvino; se noti che lo stato sparisce dopo aver
   chiuso e riaperto il browser, usa il link "Apri a schermo intero ↗"
   aggiunto al Task 3 Step 8 — apre la stessa app fuori dall'iframe, dove il
   salvataggio è garantito.
9. **Per aggiornamenti futuri:** ripeti solo `git add`/`git commit`/`git
   push` dopo ogni modifica locale — GitHub Pages e quindi l'incorporamento
   in Google Sites si aggiornano da soli in 1-2 minuti, senza toccare nulla
   in Google Sites.

---

## Self-review

- Copertura spec: Parte 1 (Google Sites) → Task 3 Step 8 + Task 10. Parte 2
  (porzione unica, tutti i sotto-punti del design doc) → Task 1, 2, 3, 4, 6,
  7, 8. Verifica multipla dei calcoli → Task 5 Step 3/5/6 (due esecuzioni del
  motore + un ricalcolo manuale indipendente). Nuova richiesta tempo/difficoltà
  → Task 2 (campi `tempo`/`difficolta` su ogni pasto) + Task 3 Step 4 (badge
  in UI) + Task 4 Step 5 (CSS).
- Placeholder: nessun "TBD"/"da definire" nei task — dove un numero non è
  ancora noto (margini, medie giorno) è perché dipende dall'esecuzione del
  motore fatta nel task precedente, non da lavoro non specificato; il
  meccanismo per ottenerlo è scritto per esteso.
- Coerenza tipi: `selezione[pastoId]` è un numero in Task 1/2/3/5 ovunque;
  `p.val` è `[kcal,p]` ovunque in Task 1/2/3; i flag `soloLei`/`soloLui`
  hanno lo stesso significato in Task 1 (motore), 2 (dati), 3 (UI/etichette).
