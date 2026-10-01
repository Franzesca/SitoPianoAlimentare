# DietaCosi

Piano alimentare di coppia — **autunno 2026, 1.250 kcal/giorno** — più `cucina.html`,
la web app che lo rende usabile in cucina: un catalogo di pasti senza ordine di
giorno, da cui costruire una lista che diventa dispensa da spuntare e poi lista
della spesa vera. Condivisa in tempo reale tra i due account della coppia.

## Il vincolo che spiega tutto

Lui non tollera verdura e frutta crude o poco processate. Tutto il progetto —
ricette, struttura dei dati, il motore di calcolo — esiste per risolvere questo
vincolo senza cucinare due pasti diversi ogni sera.

- **Soffritto lungo frullato**: cipolle, carote, sedano, peperoni e pomodoro
  cotti a lungo e frullati a crema liscia. Base di gran parte dei pasti.
- **"Una pentola, due finiture"**: si cucina un solo piatto; nel piatto di lei
  vanno le finiture crude, in quello di lui le stesse note ma cotte o frullate.
- Le **zuppe e creme** (di zucca, cavolfiore, broccoli, carote, lenticchie e
  cavolo nero, orzo e verza) sono conformi al vincolo per costruzione: sono
  frullate o passate per tutti e due, senza bisogno di due versioni.

**Porzione unica**: lei e lui mangiano le stesse grammature — differenza solo
di consistenza. Fanno eccezione le finiture non condivise (`soloLei`/`soloLui`).

**Target: 1.250 kcal / 100 g proteine al giorno**, uguale per entrambi, **pavimento
non negoziabile** — ripartiti in colazione 200 · pranzo 450 · cena 600. Vale nei
giorni interamente da piano; in settimana lui pranza fuori per lavoro, quindi il
suo reale è più alto (indicativamente 1.600-1.800). Nelle settimane senza
eccezioni sociali si aggiunge un **modulo +150** (una focaccina o 50 g di pane
ai semi) per non stare troppo sotto.

## Cosa è cambiato dal piano di agosto

- Da 1.450 a 1.250 kcal; da 4 pasti/giorno (con spuntino) a 3 (colazione,
  pranzo, cena) più moduli extra facoltativi.
- Niente più struttura a 7 giorni fissi: **42 pasti + 6 extra**, organizzati per
  categoria (colazioni, zuppe, pranzi, cene, extra), da scegliere liberamente.
  Un pulsante "carica la settimana tipo" resta disponibile come punto di
  partenza, non come obbligo.
- 7 nuove zuppe/creme autunnali (zucca, cavolfiore-porri, broccoli-patate,
  carote-lenticchie rosse, lenticchie-cavolo nero, orzo-borlotti-verza, più la
  harira già presente) e 7 nuove cene (spezzatino di tacchino, teglia di
  pollo, polpette, radicchio brasato, pollo al limone, burger, pasta al
  forno).
- Panificati fatti in casa (focaccine, pane ai semi, muffin, plumcake,
  crackers) per colazioni e moduli, al posto delle uova quasi tutti i giorni.
- **kcal e proteine non sono più dichiarati a mano**: si calcolano dagli
  ingredienti (tabella nutrizionale CREA/USDA in `dati.js`). Cambiare una
  grammatura aggiorna da solo tutti i numeri a valle.
- Storia del peso ripartita da zero (pulsante "AZZERA STORICO" nella vista Peso).

## I file

| File | Cos'è |
|---|---|
| [`piano-pasti-definitivo.md`](piano-pasti-definitivo.md) | **Generato da `dati.js`.** Tutti i pasti per categoria, ingredienti, procedura, vincolo, valori. Non editarlo a mano: rigeneralo con `node sorgenti/genera-doc.js`. |
| [`preparazione-domenicale.md`](preparazione-domenicale.md) | **Generato da `dati.js`.** Le basi con rese e procedure, la settimana tipo, il bilancio delle basi e la lista della spesa calcolati con `calcola()`. |
| [`piano-alimentare-settimanale.md`](piano-alimentare-settimanale.md) | Piano di agosto 2026 (1.450 kcal), superato. Resta come riferimento storico. |
| [`cucina.html`](cucina.html) | **La web app**, generata da [`sorgenti/`](sorgenti/). Non si modifica a mano. |
| [`sorgenti/`](sorgenti/) | I sorgenti di `cucina.html` — vedi sotto. |
| [`firestore.rules`](firestore.rules) | Regole di sicurezza Firestore (non incluse in questa consegna: verifica che siano ancora quelle del progetto). |

## La web app

Viste: **Pasti** (catalogo per categoria o per base, senza giorni obbligati,
con "carica la settimana tipo"; le grammature seguono le porzioni impostate, e
**CUCINA ORA** apre la ricetta a schermo intero con porzioni proprie e
ingredienti spuntabili), **Lista** (pasti scelti, scarto kcal e proteine
rispetto al target dei soli pasti scelti), **Dispensa → Spesa** (spunta cosa hai,
poi la lista vera), **Basi** (le preparazioni domenicali scalate sul bisogno
reale, con i testi riscalati sulla dose), **Scorte** (dispensa virtuale
persistente: le voci accese compaiono già spuntate in Dispensa; quando cucini o
prepari una base ti chiede cosa hai finito davvero), **Peso** (grafico,
verdetto, azzera storico), **Wishlist**, **+ Nuova ricetta** (kcal/proteine
calcolati dagli ingredienti, non stimati a mano).

Account e dati condivisi: invariato rispetto a prima (Firebase Auth +
Firestore per household).

## Come si lavora sui sorgenti

```bash
cd sorgenti
node build.js       # test → riscrive ../cucina.html → controlla la sintassi → rigenera i due .md
node test.js         # solo i test
node genera-doc.js    # solo i documenti (build.js lo fa già)
```

`build.js` si ferma **prima** di scrivere `cucina.html` se un test fallisce.

- [`sorgenti/dati.js`](sorgenti/dati.js) — **la fonte unica.** `ING` (ingredienti
  con kcal/proteine per 100 g), `BASI` (26 preparazioni domenicali, alcune con
  `interoDefault:true` per zuppe e panificati), `PASTI` (42 pasti + 6 extra,
  con `tipo` per la contabilità e `cat` per il catalogo), `TARGET`,
  `SETTIMANA_TIPO`. kcal e proteine di ogni base e pasto **si calcolano qui**
  (funzioni `valoriBase100`/`valoriPasto` in fondo al file), non si dichiarano.
- [`sorgenti/motore.js`](sorgenti/motore.js) — `calcola()`: esplode
  ricorsivamente le basi (anche annidate) fino agli ingredienti crudi. Il modo
  di preparazione di default è "ricetta intera" per le basi con
  `interoDefault` (zuppe, pane, focaccine, muffin: si fanno a dose piena e si
  congelano), altrimenti "quantità esatta" salvo fabbisogni molto piccoli.
- [`sorgenti/app.js`](sorgenti/app.js) — tutta la UI e la sincronizzazione
  Firestore. Nessuna migrazione da `localStorage`: il piano precedente non
  serve più portarlo avanti.
- [`sorgenti/auth.js`](sorgenti/auth.js) / [`firebase-config.js`](sorgenti/firebase-config.js) — invariati.
- [`sorgenti/shell.html`](sorgenti/shell.html) — HTML e CSS. `build.js`
  sostituisce nell'ordine i segnaposto `/*__FIREBASE_CONFIG__*/`, `/*__AUTH__*/`,
  `/*__DATI__*/`, `/*__MOTORE__*/`, `/*__APP__*/`.
- [`sorgenti/test.js`](sorgenti/test.js) — riferimenti a ingredienti/basi, cicli,
  banda ±15% di ogni pasto, settimana tipo (kcal ±100 e ≥ 100 g di proteine ogni
  giorno con pranzo in piano), vincolo di lui (niente crudo fuori da `soloLei`),
  rese plausibili (una base non rende più di ciò che pesano i suoi ingredienti),
  testi delle basi senza numeri fissi, nomi ingrediente sicuri per Firestore,
  logica delle Scorte, calcolo tollerante sugli ingredienti sconosciuti.
- [`sorgenti/genera-doc.js`](sorgenti/genera-doc.js) — genera i due `.md`
  autorevoli da `dati.js`, senza ricalcoli a mano.

## Verifica dei valori nutrizionali

kcal e proteine non sono più stime dichiarate: sono calcolate dagli
ingredienti con una tabella nutrizionale di riferimento (valori medi per
100 g su prodotto crudo, tipo CREA/USDA) per ciascun ingrediente in `ING`. Ho
controllato il calcolo due volte con motori indipendenti: una volta in
JavaScript (le funzioni in `dati.js`, usate anche dall'app), una volta con
una riscrittura in Python dello stesso algoritmo a partire dagli stessi dati
grezzi — le 48 schede pasto coincidono esattamente tra i due.

**Limite dichiarato:** la tabella nutrizionale in `ING` sono valori medi da
tabelle di composizione standard, non i dati dei prodotti che comprate
davvero — un margine di incertezza proprio (5-10% a seconda del taglio, della
marca, di quanto la zucca è più o meno acquosa). Non ho inventato numeri: se
un valore non era ricavabile con sicurezza da fonti nutrizionali standard,
l'ingrediente non è nel piano.

## Vincoli da non rompere

- **Non inventare valori nutrizionali.** Le kcal/proteine si calcolano da
  `dati.js`; se aggiungi un ingrediente nuovo, servono k (kcal/100 g) e p
  (proteine/100 g) da una fonte nutrizionale, non a occhio.
- `test.js` deve passare prima di dire che una modifica è finita (`node build.js`
  lo lancia da solo).
- Le Scorte **non cancellano ingredienti dalla lista**: decide la Dispensa. Vedi
  `CLAUDE.md` per la logica completa.
- `piano-pasti-definitivo.md` e `preparazione-domenicale.md` sono **generati**:
  non editarli a mano, editare `dati.js` e rilanciare `genera-doc.js`.
