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
- [`sorgenti/audit-nutrizionale.js`](sorgenti/audit-nutrizionale.js) — non entra in
  `cucina.html`. Esplode ogni pasto nei suoi ingredienti grezzi con lo stesso motore
  dell'app e li confronta con una tabella nutrizionale di riferimento, pasto per
  pasto, per intercettare stime kcal/proteine implausibili. Dettagli e risultati
  sotto.
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

`audit-nutrizionale.js` ricontrolla le stime kcal/proteine dei pasti senza un database
nutrizionale collegato: esplode ogni pasto (uno alla volta, isolato dal resto della
settimana) nei suoi ingredienti grezzi con lo stesso motore usato dall'app, e li
confronta con una tabella di riferimento nutrizionale standard (valori per 100 g su
prodotto grezzo, tipo USDA/CREA) per ciascuno dei ~90 ingredienti in `ING`.

**Risultato sui 26 pasti con ricetta (esclusa la cena libera della domenica): 24
stimano più della dichiarazione, solo 2 leggermente meno.** Non è rumore che si
compensa — è un pattern in una sola direzione. Sull'intera settimana, la stima dà
~1.663 kcal/persona/giorno contro le 1.539 dichiarate: **+8,1%**. Otto pasti superano
la soglia di allarme dello script (≥15% e ≥30 kcal di scarto):

| Pasto | Giorno | Dichiarato | Stimato | Scarto |
|---|---|---|---|---|
| Chana saag con petto di pollo | Venerdì cena | 545 kcal | ~840 kcal | +54% |
| Harira e tacchino alla piastra | Martedì cena | 470 kcal | ~674 kcal | +43% |
| Kofta di tacchino in salsa harissa | Giovedì cena | 500 kcal | ~645 kcal | +29% |
| Wrap di falafel | Mercoledì pranzo | 485 kcal | ~609 kcal | +26% |
| Lenticchie e polenta | Giovedì pranzo | 460 kcal | ~568 kcal | +24% |
| Riso e pulled chicken gochujang | Mercoledì cena | 490 kcal | ~584 kcal | +19% |
| Breakfast burrito | Martedì colazione | 420 kcal | ~498 kcal | +19% |
| Shakshuka | Venerdì colazione | 410 kcal | ~479 kcal | +17% |

Il filo conduttore: i pasti più fuori soglia sono quasi tutti piatti con **legumi
secchi o cereali in dose piena** (ceci, lenticchie rosse, riso crudo) insieme a carne.
I legumi secchi pesano molto già a crudo (~350 kcal/100 g) e restano piuttosto densi
anche da cotti (~140-150 kcal/100 g): è facile sottostimarli "a occhio" partendo dal
piatto finito invece che dal peso reale. Il caso peggiore, il chana saag: i soli 180 g
di ceci cotti + 40 g di riso crudo + 100 g di petto di pollo valgono già ~520 kcal da
soli, prima di soffritto, latte di cocco e olio — quasi l'intero budget dichiarato per
il piatto.

Questo non è un bug del codice — `calcola()` somma correttamente i valori dichiarati,
`test.js` conferma che il totale settimanale corrisponde esattamente a quanto scritto
nei documenti. Lo scarto reale sembra più ampio di quanto i documenti stessi
riconoscano: `piano-pasti-definitivo.md` dichiara già uno scarto di +89 kcal/giorno
sopra target, descritto come "dentro il margine d'errore delle stime" — ma se l'8%
trovato dall'audit è nel giusto, il piano starebbe realisticamente intorno a +200
kcal/giorno sopra il target di 1.450, circa il doppio.

**Limiti dello strumento:** la tabella di riferimento in `audit-nutrizionale.js` sono
valori standard da memoria, non i dati dei prodotti effettivamente comprati — portano
un margine di incertezza proprio (~5-10% a seconda dell'ingrediente, del taglio di
carne, della marca). È un controllo di plausibilità utile a individuare *quali* pasti
guardare più da vicino, non una fonte nutrizionale sostitutiva: **non ho corretto i
valori in `dati.js`**, perché farlo richiede una fonte vera (tabelle CREA/USDA sui
prodotti reali), non un'altra stima a memoria.

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
