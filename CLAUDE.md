# DietaCosi

Piano alimentare settimanale per una coppia (autunno 2026), costruito su batch
cooking domenicale, più la web app `cucina.html` che lo rende usabile in cucina.

## Il vincolo che spiega tutto

Lui non tollera verdura e frutta crude o poco processate. La soluzione strutturale
è il **soffritto lungo frullato** (verdure cotte a lungo e passate al mixer) e il
principio **"una pentola, due finiture"**: nel piatto di lei le finiture crude
(coriandolo, cipolla rossa, kimchi…), in quello di lui le stesse note da salse
cotte o frullate. Le zuppe e creme sono frullate per tutti e due.

**Porzione unica** (dal 2026-08-20): lui mangia le stesse grammature di lei, resta
solo la differenza di consistenza.

**Target (piano autunno 2026): 1.250 kcal e ≥ 100 g di proteine al giorno**, uguale
per entrambi — vedi `TARGET` in `dati.js`. Ripartizione: colazione 200 · pranzo 450 ·
cena 600. 1.250 è il **pavimento**: non si scende sotto. Lui pranza fuori per lavoro
(il suo reale è più alto); lei pranza da sola lunedì, mercoledì e venerdì, e quei
pranzi sono i soli dove stanno le verdure crude (pasti con `crudo:true`).

## I file

| File | Cos'è |
|---|---|
| `piano-pasti-definitivo.md` | **Generato** da `dati.js` (`genera-doc.js`). Non editarlo a mano. |
| `preparazione-domenicale.md` | **Generato** da `dati.js`: le basi con rese e procedure, la settimana tipo, il bilancio delle basi. Non editarlo a mano. |
| `cucina.html` | **La web app.** Generata da `sorgenti/`: non editarla a mano. |
| `sorgenti/` | I sorgenti di `cucina.html`. |
| `piano-alimentare-settimanale.md`, `piano-cucina.html`, `Cucina — piano settimanale.html` + `_files/` | Piano e app di agosto 2026 (1.450 kcal). **Superati**, tenuti come backup: non toccarli e non prenderli come fonte. |
| `firestore.rules` | Regole di sicurezza Firestore. Si pubblicano a mano sulla console Firebase. |

## Come si lavora

```bash
cd sorgenti
node build.js              # test → riscrive ../cucina.html → controlla la sintassi → rigenera i due .md
node build.js --senza-test # solo per provare qualcosa al volo
node test.js               # solo i test
```

`build.js` si ferma **prima** di scrivere `cucina.html` se un test fallisce, e dà errore
se lo script dentro `cucina.html` non è sintatticamente valido. Non pubblicare mai
senza averlo lanciato: altrimenti i `.md` restano indietro rispetto ai dati.

- `sorgenti/dati.js` — **fonte unica**: `ING` (ingredienti con kcal e proteine per
  100 g), `BASI` (26 preparazioni domenicali), `PASTI` (48: 8 colazioni, 21 pranzi,
  13 cene, 6 extra), `TARGET`, `SETTIMANA_TIPO`. kcal e proteine di basi e pasti
  **si calcolano qui** (`valoriBase100`, `valoriPasto`), non si dichiarano.
- `sorgenti/motore.js` — `calcola()`: esplode ricorsivamente le basi negli ingredienti
  crudi scalando sulla resa; `formatta()` per le quantità; `testoBase()` per i testi
  delle basi riscalati sulla dose.
- `sorgenti/app.js` — tutta la UI e la sincronizzazione Firestore.
- `sorgenti/auth.js`, `firebase-config.js` — login, household, chiavi del progetto.
- `sorgenti/shell.html` — struttura HTML e CSS. I segnaposto `/*__FIREBASE_CONFIG__*/`,
  `/*__AUTH__*/`, `/*__DATI__*/`, `/*__MOTORE__*/`, `/*__APP__*/` sono sostituiti da
  `build.js`, in quest'ordine, dentro un unico `<script type="module">`.
- `sorgenti/test.js`, `genera-doc.js`, `build.js` — strumenti, non entrano nell'app.

## Account e dati condivisi

L'app richiede login (Firebase Auth). I dati di pianificazione (pasti scelti, dispensa,
spesa, basi, scorte) sono condivisi in tempo reale tra i due account dello stesso
"household". Il peso resta personale, attribuito a chi è loggato.

- `households/{id}/stato/corrente` — `sel`, `modiBase`, `hoGia`, `preso`, `extra`.
  `households/{id}/scorte/corrente`, `importanza/corrente` — vedi sotto.
  `households/{id}/pesi` — una collezione (un documento a misura).
- `stato.aperti/grp/filtro/passo/pesoUid` restano in `localStorage`
  (`dietacosi.ui.v1`): sono preferenze del dispositivo.
- `households/{id}/pastiExtra/{pastoId}` — override su un pasto: `nome`, `tempo`,
  `difficolta`, `nota`, `archiviato`, `ing` (lista completa, sostituisce quella di
  `dati.js`), `proc`. `households/{id}/ricetteExtra/{autoId}` — ricette create da
  zero, stessa forma di un pasto più `mia:true`. `households/{id}/wishlist/{autoId}`
  — promemoria semplici, non entrano nel calcolo.
- `PASTO_BY_ID`/`tuttiIPasti()` in `app.js` contengono sempre i pasti già fusi con gli
  override (`pastoEffettivo()`), ricostruiti da `ricostruisciPastoById()` a ogni
  cambiamento. Qualsiasi punto che legge un pasto deve prenderlo da lì, mai da
  `PASTI` direttamente (eccezione: "Carica la settimana tipo", che usa gli id).
  Un pasto che non si ricostruisce non ferma gli altri (try/catch per pasto).

### Vincoli da non rompere sulla sincronizzazione

- **Mai `setDoc` dell'intero documento** `stato/corrente`, `scorte/corrente`,
  `importanza/corrente`. Le scritture passano da `syncStato()`/`syncScorte()`/
  `syncImportanza()`, che aggiornano solo il campo cambiato (debounce 400 ms). Due
  telefoni possono modificare nello stesso momento: un `setDoc` completo
  cancellerebbe la modifica dell'altro. Le voci "fuori piano" (testo libero) usano
  `FieldPath`/`arrayUnion`/`arrayRemove`: il testo può contenere un punto.
- **Usare `aggiornaDoc()`, non `updateDoc()` diretto.** Gli household creati prima del
  2026-08-21 non hanno `scorte/corrente` né `importanza/corrente`: `updateDoc` fallisce
  con "not-found". `aggiornaDoc()` crea il documento vuoto (`setDoc(ref, {}, {merge:true})`,
  innocuo se esiste già) e ripete la scrittura.
- I nomi degli ingredienti finiscono in percorsi come `scorte.<nome>`: nessun `.`, `/`,
  `[`, `]`, `*`, `~` nei nomi (lo verifica `test.js`).

## Logica Scorte · Dispensa · Spesa

Le Scorte sono un sì/no ("ce l'ho"), **non tengono le quantità**. Da questo derivano
le regole:

- **Basi.** Una base accesa in Scorte è già pronta: `calcola()` la mette in modo
  `salta`, non la rifà e non porta in lista i suoi ingredienti. Una scelta esplicita
  ("quantità esatta"/"ricetta intera") in Basi vince sul default.
- **Ingredienti.** `calcola()` **non** toglie mai un ingrediente perché è in Scorte: la
  quantità piena resta nel risultato. Lo decide la Dispensa: `inCasa(n)` = spuntato
  questa settimana (`stato.hoGia`) **oppure** acceso in Scorte. In Dispensa le voci
  accese sono già spuntate ma visibili; togliendo la spunta (ne ho poco) si spegne
  anche la scorta. La Spesa mostra solo ciò che non è `inCasa`.
- **Comprare non accende le Scorte.** Spuntare un acquisto in Spesa tocca solo
  `stato.preso`. (Prima accendeva la scorta: così un ingrediente comprato spariva dalle
  liste di tutte le settimane dopo, qualunque fosse la quantità che serviva.)
- **"L'ho cucinato" e "Ho preparato questa base"** non sanno cosa è finito: aprono il
  dialog "Cosa hai finito?" (`apriFinito()`), con **tutto spento di default**. Elenca
  solo le voci che risultano in casa e che contano (le "opzionali" no, i q.b. no). Si
  tolgono dalle scorte solo quelle che spunti. Preparare una base la accende sempre.
- Importanza: `fondamentale` blocca il consiglio "Puoi cucinare adesso" se manca,
  `medio` lo segnala, `opzionale` non conta. Default: spezie e dispensa = opzionale,
  basi e tutto il resto = fondamentale (`importanzaDefault()`).

## Regole del modello dati

- Le quantità nei pasti sono **per persona**, in grammi salvo unità `pz`.
- Un ingrediente che è una base: `{b:'soffritto', q:120}`; uno fresco: `{n:'Uova', q:2}`.
  Il nome deve esistere in `ING`, o `test.js` lo segnala.
- `qb:true` = quanto basta (non pesa sulla lista). `crudo:true` su un pasto = pranzo da
  sola, ha verdure crude e non ha versione per lui.
- **`soloLei` / `soloLui`**: finitura non condivisa (cruda per lei, equivalente cotta
  per lui). In `calcola()` pesa su **metà** delle porzioni selezionate. Un ingrediente
  con `lei:true` in `ING` può comparire in un pasto non-`crudo` **solo** con `soloLei`, e
  non può stare dentro una base: lo verifica `test.js`. `scalaIng()` in `app.js`
  applica la stessa regola alla scheda pasto.
- **Salvare "Modifica" non deve perdere `soloLei`/`soloLui`/`qb`**: il form non ha campi
  per loro, quindi si ereditano dalla voce originale con lo stesso nome.
- Basi annidate: `['@soffritto', 600]` dentro `BASI`. `calcola()` le risolve per
  profondità decrescente, l'ordine nell'array non conta.
- Ogni base ha un interruttore *quantità esatta* / *ricetta intera*. Default "intero" per
  le basi con `interoDefault:true` (zuppe, panificati: si fanno a dose piena e si
  congelano) e sotto i 200 g / metà resa; altrimenti "esatto".
- `stato.sel[pastoId]` è un numero: porzioni **totali** selezionate (entrambi insieme).

## Testi delle basi riscalati sulla dose

Nei `proc`/`nota` delle basi i numeri che dipendono dalla dose **non si scrivono a
mano**: si usano segnaposto risolti da `testoBase(testo, base, f)` (f = grammi prodotti
/ resa). Con "quantità esatta" per 2 porzioni la scheda dice "Dividi in 2 porzioni", non
"in 5". `genera-doc.js` li risolve a f = 1. `test.js` fallisce se trova un numero fisso
davanti a porzioni/pezzi/fette/pirottini/palline/muffin.

`{porz}` / `{porz:porzione|porzioni}` · `{pezzi}` / `{pezzi:pezzo|pezzi}` · `{resa}` ·
`{g:N}` (N g della ricetta intera, riscalati) · `{n:N}` (oggetti contabili, minimo 1) ·
`{ridotta:testo}` / `{multipla:testo}` (frase mostrata solo sotto / sopra una dose
intera). I pesi per porzione o per pezzo ("da ~400 g") restano fissi.

## Scheda pasto e "Cucina ora"

- Le grammature nella scheda seguono il contatore `+`/`−`: con 2 porzioni mostra le
  quantità per 2; senza porzioni scelte, per 1.
- **CUCINA ORA** apre `#cucina` (`renderCucina()`) a schermo intero con un contatore di
  porzioni **proprio**, che non tocca `stato.sel` (default: porzioni in lista, o 2).
  Ingredienti spuntabili, procedura a passi, schermo acceso (Wake Lock, dove
  supportato), chiusura con X, Esc o tasto indietro. Stato solo locale.

## Valori nutrizionali

- kcal e proteine si calcolano da `ING` (valori medi per 100 g, tabelle tipo CREA/USDA,
  su prodotto crudo e al netto). **Non inventarli:** un ingrediente nuovo ha bisogno di
  `k` e `p` da una fonte nutrizionale.
- Margine di incertezza reale: 5-10% (taglio, marca, acquosità delle verdure).
- **Ricette modificate o create dall'utente** usano `valoriPastoSafe()`: un ingrediente
  non presente in `ING` non rompe niente, viene saltato e segnalato (`p.ignoti`); la
  scheda mostra "≥" e un avviso, la Lista un "totale parziale". `valoriPasto()` resta
  severa e serve ai test sul catalogo. Le ricette proprie ricalcolano i valori a ogni
  caricamento (non usano più quello salvato alla creazione).
- **Media e target nella Lista:** il confronto è con il target dei **soli pasti scelti**
  (200/450/600 per tipo; gli extra non hanno target), così un pranzo fuori non fa
  sembrare "in deficit" una settimana a posto. Le proteine sono normalizzate: "g P ogni
  1.250 kcal". Rosso se le kcal sono oltre il 3% sotto il target dei pasti, o se le
  proteine normalizzate sono sotto 100. La media per persona/giorno (una colazione =
  un giorno-persona) è solo informativa.
- Formattare le migliaia con `migliaia()`, non con `toLocaleString('it')`: in italiano
  quest'ultimo non raggruppa i numeri a 4 cifre ("1250").

### Rese stimate, non misurate

Queste rese sono stime e vanno corrette alla prima pesata:

- **Focaccine** `resa:464` (~58 g a pezzo da cotte).
- **Falafel** `resa:450`: 150 g di ceci secchi ammollati pesano circa il doppio (×2,1).
  Porzione di 112 g = 3 pezzi da ~38 g. Con la resa vecchia (600) il wrap era sottostimato.
- **Vellutata** `resa:1500`: non misurata. Probabilmente è sottostimata (le kcal del curry
  di sovracosce sarebbero un po' più basse): stima prudente.

Se pesando cambiano, correggi `resa` in `dati.js` e, se serve, la `q` dei pasti che usano
la base: il test sulle rese e quello sulla banda kcal ti dicono se è coerente.

## Altri vincoli

- **Settimana tipo:** ogni giorno con pranzo in piano deve stare entro ±100 kcal dal
  target e avere ≥ 100 g di proteine (`test.js`). I giorni con pranzo fuori (martedì e
  giovedì) non sono valutabili sul totale.
- **Il soffritto è il vincolo stretto.** Se più basi annidate (chili, ragù…) vengono
  preparate a ricetta intera nella stessa domenica, prelevano comunque le loro dosi
  fisse di soffritto: controlla il margine in Basi (l'app avvisa quando serve più di
  una dose piena).
- Il tempo attivo della domenica è limitato a 2 ore: Basi avvisa quando si sfora.

## Storico dei fix

- **2026-10-01** — Focaccine rifatte (idratazione 74%, lievito con prova della schiuma,
  dischi da 2 cm, seconda lievitazione 40-45 min, 200 °C). Grammature della scheda pasto
  per le porzioni impostate. Vista Cucina ora. Testi delle basi riscalati sulla dose.
- **2026-10-01** — Errore di sincronizzazione "not-found" sulle Scorte: `aggiornaDoc()`.
- **2026-10-01** — Revisione generale: logica Scorte/Dispensa/Spesa (vedi sopra), dialog
  "Cosa hai finito?", ricette con ingredienti fuori registro, "Modifica" che perdeva
  `soloLei`/`soloLui`/`qb`, media della Lista, falafel (resa impossibile) e salsa yogurt,
  domenica della settimana tipo sotto le proteine minime (cena: burger → pollo al limone),
  `build.js` che lancia test, sintassi e documenti, test nuovi. Rimosso
  `audit-nutrizionale.js` (rotto e ormai circolare: i valori ora vengono da `ING`).
