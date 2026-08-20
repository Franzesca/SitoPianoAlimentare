# DietaCosi

Piano alimentare settimanale per una coppia, costruito su **batch cooking domenicale**,
più `cucina.html`, la web app che lo rende usabile in cucina: scegli i pasti, l'app
calcola dispensa, lista della spesa e cosa preparare la domenica — in tempo reale,
condivisa tra i due account della coppia.

## Il vincolo che spiega tutto

Lui non tollera verdura e frutta crude o poco processate. Tutto il progetto — ricette,
struttura dei dati, persino il motore di calcolo — esiste per risolvere questo vincolo
senza cucinare due pasti diversi ogni sera.

La soluzione è strutturale, non un compromesso pasto per pasto:

- **Soffritto lungo frullato**: cipolle, carote, sedano, peperoni e pomodoro cotti 90
  minuti e frullati fino a crema liscia. È la base di quasi metà dei pasti della
  settimana ed è il modo in cui la verdura entra nel piatto di lui.
- **"Una pentola, due finiture"**: si cucina un solo piatto; alla fine, nel piatto di
  lei vanno le finiture crude (coriandolo, lime, cipolla rossa, kimchi…), in quello di
  lui le stesse note ma cotte o frullate (salsa di peperoni al posto delle verdure
  crude, cipolla stufata al posto di quella cruda, spinaci frullati nella salsa invece
  che saltati interi).

**Dal 2026-08-20, porzione unica:** lui mangia le stesse grammature di lei — non c'è
più una differenza di quantità, resta solo quella di consistenza (crudo per lei,
cotto/frullato per lui). Fanno eccezione tre pasti in tutta la settimana, dove la
finitura non condivisa (`soloLei` / `soloLui`) resta strutturalmente diversa.

**Target nutrizionale:** 1.450 kcal / 115 g proteine al giorno, uguale per entrambi.

## I file

| File | Cos'è |
|---|---|
| [`piano-pasti-definitivo.md`](piano-pasti-definitivo.md) | **Fonte autorevole dei pasti.** 27 pasti (4 al giorno × 7 giorni − 1), ingredienti in grammi per persona, procedura, variante del vincolo lei/lui, stime kcal/proteine. |
| [`preparazione-domenicale.md`](preparazione-domenicale.md) | **Fonte autorevole delle basi.** Le 14 preparazioni domenicali con rese, ingredienti crudi lordi, mappa pasti→basi giorno per giorno, bilancio delle basi. |
| [`piano-alimentare-settimanale.md`](piano-alimentare-settimanale.md) | Prima versione del piano, superata dai due documenti sopra. Resta utile per fabbisogni, sostituzioni e taratura. |
| [`cucina.html`](cucina.html) | **La web app**, generata da [`sorgenti/`](sorgenti/). Non si modifica a mano. |
| [`sorgenti/`](sorgenti/) | I sorgenti di `cucina.html` — vedi sotto. |
| [`firestore.rules`](firestore.rules) | Regole di sicurezza Firestore: un utente legge/scrive solo l'household a cui è collegato. |
| [`piano-cucina.html`](piano-cucina.html) | Vecchia app, ordinata per giorno, sui valori della prima versione del piano. Backup, non si tocca. |

## La web app

`cucina.html` è una PWA a schermo singolo (installabile su home screen iOS/Android)
organizzata in viste:

- **Pasti** — catalogo dei 27 pasti (+ eventuali ricette proprie), filtrabile per tipo,
  giorno o base, con ricerca testuale. Da qui si sceglie quante porzioni cucinare di
  ogni pasto con uno stepper (0–28).
- **Lista** — riepilogo di quello che è stato scelto: kcal/proteine totali e media
  giornaliera confrontata col target.
- **Dispensa → Spesa** — due passi sullo stesso elenco di ingredienti: prima si spunta
  cosa si ha già in casa, poi si compila la lista della spesa vera con quello che manca
  (più una sezione "fuori piano" per voci libere come detersivo o caffè). Esportabile
  come testo, stampabile.
- **Basi** — le preparazioni domenicali da fare, con quantità già scalate su cosa
  serve davvero, procedura passo-passo e timer da cucina integrati.
- **Scorte** — una dispensa virtuale persistente: si accende cosa si ha in casa
  (ingredienti e basi, con un livello di importanza fondamentale/medio/opzionale) e
  l'app suggerisce cosa si può cucinare subito o quasi. "L'ho cucinato" e "Ho
  preparato questa base" spengono automaticamente quello che è stato consumato.
- **Peso** — grafico e verdetto settimanale (calo troppo lento/veloce/nel range), un
  tracciato per persona.
- **Wishlist** — promemoria di ricette da provare, senza ingredienti né calcolo.
- **+ Nuova ricetta** — form per aggiungere ricette proprie da zero al catalogo, con
  ingredienti liberi o basi esistenti.
- Ogni pasto è anche modificabile sul posto (nome, tempo, difficoltà, nota) e
  archiviabile senza doverlo eliminare dal piano.

### Account e dati condivisi

L'app richiede login (Firebase Auth: email/password o Google). I dati di
pianificazione — pasti scelti, dispensa, spesa, basi, scorte, ricette proprie,
wishlist — sono condivisi in tempo reale tra i due account collegati allo stesso
**household** (una famiglia, identificata da un codice che si genera creandola e si
usa per unirsi dal secondo account). Il peso resta personale, attribuito
automaticamente a chi è loggato. Le preferenze di interfaccia (filtri aperti, ultima
vista) restano invece locali al dispositivo.

## Come si lavora sui sorgenti

**Non si edita `cucina.html` a mano: è generato.** Si modificano i sorgenti e si
ricompila:

```bash
cd sorgenti
node build.js     # riscrive ../cucina.html assemblando shell.html + i moduli
node test.js      # verifiche incrociate contro i documenti autorevoli
```

- [`sorgenti/dati.js`](sorgenti/dati.js) — il registro statico: `ING` (ingredienti,
  reparto e unità), `BASI` (le 14 preparazioni domenicali, con resa e ingredienti
  grezzi), `PASTI` (i 27 pasti), `TARGET`. È qui che si aggiungono o correggono pasti.
- [`sorgenti/motore.js`](sorgenti/motore.js) — `calcola()`: dato un insieme di pasti
  selezionati, esplode ricorsivamente le basi (anche annidate: il chili contiene
  soffritto, ceci e fagioli) fino agli ingredienti crudi, scalando ogni base sulla sua
  resa. `formatta()` arrotonda le quantità in modo leggibile (grammi, kg, pezzi,
  "~X g di succo" per limoni e lime).
- [`sorgenti/app.js`](sorgenti/app.js) — tutta la UI: le viste sopra, gli event
  listener, la sincronizzazione con Firestore, la migrazione una tantum dal vecchio
  formato `localStorage`.
- [`sorgenti/auth.js`](sorgenti/auth.js) — login, registrazione, creazione/adesione a
  un household.
- [`sorgenti/firebase-config.js`](sorgenti/firebase-config.js) — chiavi del progetto
  Firebase (pubbliche per design: la sicurezza è nelle regole Firestore, non nel
  nascondere questa config).
- [`sorgenti/shell.html`](sorgenti/shell.html) — struttura HTML e CSS. `build.js`
  sostituisce nell'ordine i segnaposto `/*__FIREBASE_CONFIG__*/`, `/*__AUTH__*/`,
  `/*__DATI__*/`, `/*__MOTORE__*/`, `/*__APP__*/` dentro un unico `<script
  type="module">`.
- [`sorgenti/test.js`](sorgenti/test.js) — controlla che ogni ingrediente/base citato
  esista nel registro, poi ricalcola la settimana intera (2 porzioni per pasto) e la
  confronta con le quantità dichiarate nei documenti autorevoli (consumo delle basi,
  media kcal/proteine, numero di uova, pezzi di falafel…).
- [`serve.js`](serve.js) — server statico minimo per test in locale (`node serve.js`,
  poi `http://localhost:5173/cucina.html`); serve perché il login Google richiede
  http/https, non un file aperto direttamente. Non serve per la messa online, che è
  su GitHub Pages.

## Il modello dati, in breve

- Le quantità nei pasti sono **per persona**, in grammi salvo unità `pz`: lei e lui
  mangiano la stessa quantità, salvo le finiture non condivise.
- Un ingrediente che è una base si scrive `{b:'soffritto', q:120}`; uno fresco
  `{n:'Uova', q:2}`. Le **basi annidate** si scrivono `['@soffritto', 600]` dentro
  `BASI` (il chili contiene soffritto+ceci+fagioli, il ragù contiene soffritto,
  l'hummus contiene ceci): `calcola()` le risolve per profondità decrescente.
- Le finiture non condivise portano `soloLei:true` o `soloLui:true` e pesano su
  **metà** delle porzioni selezionate (una finitura a testa in ogni coppia di
  porzioni). Sono tre casi in tutto il piano.
- Ogni base ha un interruttore *quantità esatta* (scala sul fabbisogno reale) /
  *ricetta intera* (prepara tutta la dose, utile per fare scorta in freezer). Default:
  "intero" solo sotto i 200 g di fabbisogno.
- `PASTI`/`BASI`/`ING` restano statici da `dati.js`. Scorte, importanza, override sui
  pasti (`pastiExtra`), ricette proprie (`ricetteExtra`) e wishlist vivono tutte come
  documenti Firestore per household e si fondono con i dati statici solo a runtime in
  `app.js` — `dati.js` non cambia mai per queste funzionalità.

## Verifica dei valori nutrizionali

Ho ricontrollato le stime kcal/proteine dei 27 pasti nel modo più oggettivo possibile
senza un database nutrizionale collegato: ho fatto esplodere via `calcola()` l'intera
settimana (54 porzioni) nei suoi ingredienti grezzi non arrotondati, e ho sommato quei
grammi contro una tabella di riferimento nutrizionale standard (valori per 100 g su
prodotto grezzo, tipo USDA/CREA) per ciascuno degli ~90 ingredienti in `ING`.

**Risultato: la stima "dal basso" dà ~1.660 kcal/persona/giorno contro le 1.539
dichiarate nei documenti — circa l'8% in più**, uno scarto coerente sulla maggior parte
dei contributori principali (olio EVO, uova, legumi secchi, pollo), non concentrato su
un solo ingrediente anomalo. Lo stesso segnale si vede isolando la base più usata: il
soffritto è dichiarato a 87 kcal/100 g, la stima dai suoi ingredienti grezzi (verdure +
90 g di olio su una resa di 3.300 g) dà ~97 kcal/100 g, circa l'11% in più.

Questo non è un bug del codice — `calcola()` somma correttamente i valori dichiarati
pasto per pasto, `test.js` conferma che il totale settimanale (1.539 kcal/109 g P medi
a testa) corrisponde esattamente a quanto scritto nei documenti. È lo **stesso ordine
di grandezza** dello scarto già dichiarato in `piano-pasti-definitivo.md` (+89 kcal
sopra target, descritto come "dentro il margine d'errore delle stime"), ma va nella
stessa direzione, non in direzioni opposte che si compensano — un indizio che le stime
originali tendano sistematicamente a essere un po' ottimistiche piuttosto che
neutre. Le mie tabelle di riferimento hanno a loro volta un margine di incertezza
(±5-10% a seconda della fonte, del taglio di carne, della marca), quindi non è una
prova definitiva — ma è un segnale nella direzione che temevi, non nell'altra.

**Non ho corretto i valori nei pasti**: farlo richiede una fonte nutrizionale vera
(tabelle CREA/USDA con i prodotti effettivamente comprati), non la mia stima a memoria
— altrimenti si sostituisce un'approssimazione con un'altra. Ne parliamo insieme per
decidere come procedere.

## Vincoli da non rompere

- **Non inventare valori nutrizionali.** Tutte le grammature e le stime vengono dai
  due documenti autorevoli. Due eccezioni dichiarate: il pranzo di venerdì (`ven-pra`,
  valori stimati) e l'hot dog di sabato (`sab-pra`, il contorno di lui pesa un po' di
  più, non quantificato).
- **Il soffritto dipende da come si preparano chili e ragù**: farli entrambi a
  ricetta intera nella stessa domenica costa ~120 g più della resa del soffritto.
  Controllare il margine in app prima di farlo.
- `test.js` verifica le quantità contro i documenti: farlo passare prima di dire che
  una modifica è finita.

Dettagli completi in [`CLAUDE.md`](CLAUDE.md).
